import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import { join, dirname, basename, relative } from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, renameSync, readdirSync, rmdirSync } from 'fs'
import os from 'os'
import { parseDoc, serializeDoc, nowString, titleToFilename, buildDefaultMeta } from '../front-matter'
import { reindexSingleFile, removeFromIndex, incrementalReindex, fullRebuild } from '../indexer'
import { markSelfWrite } from '../file-watcher'
import { commitChanges } from '../git-sync'
import * as syncQueue from '../sync-queue'

export function registerDocIpc(db: Database.Database, docsRoot: string): void {
  const username = os.userInfo().username

  ipcMain.handle('doc:getRecent', () => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().replace('T', ' ').substring(0, 19)
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString().replace('T', ' ').substring(0, 19)

    const today = db.prepare(
      'SELECT rowid, file_path, title, tags, is_directory, updated_at FROM doc_index WHERE updated_at >= ? ORDER BY updated_at DESC LIMIT 5'
    ).all(todayStart)

    const week = db.prepare(
      'SELECT rowid, file_path, title, tags, is_directory, updated_at FROM doc_index WHERE updated_at < ? AND updated_at >= ? ORDER BY updated_at DESC LIMIT 5'
    ).all(todayStart, weekStart)

    const earlier = db.prepare(
      'SELECT rowid, file_path, title, tags, is_directory, updated_at FROM doc_index WHERE updated_at < ? ORDER BY updated_at DESC LIMIT 10'
    ).all(weekStart)

    return { today, week, earlier }
  })

  ipcMain.handle('doc:getChildren', (_e, parentPath: string) => {
    const normalizedPath = parentPath || ''
    return db.prepare(
      'SELECT rowid, file_path, title, tags, is_directory, sort, updated_at FROM doc_index WHERE parent_path = ? ORDER BY is_directory DESC, sort DESC, updated_at DESC'
    ).all(normalizedPath)
  })

  ipcMain.handle('doc:getTree', () => {
    const all = db.prepare(
      'SELECT rowid, file_path, title, is_directory, parent_path, sort FROM doc_index ORDER BY is_directory DESC, sort DESC, title ASC'
    ).all() as any[]

    function buildTree(parentPath: string): any[] {
      return all
        .filter(d => d.parent_path === parentPath)
        .map(d => ({
          ...d,
          children: d.is_directory ? buildTree(
            d.file_path.endsWith('/_index.md') ? dirname(d.file_path) : d.file_path
          ) : []
        }))
    }

    return buildTree('')
  })

  ipcMain.handle('doc:getDetail', (_e, filePath: string) => {
    const indexRow = db.prepare('SELECT * FROM doc_index WHERE file_path = ?').get(filePath) as any
    if (!indexRow) return null

    let content = ''
    const fullPath = join(docsRoot, filePath)
    if (existsSync(fullPath)) {
      const { content: c } = parseDoc(readFileSync(fullPath, 'utf-8'))
      content = c
    }

    const breadcrumb: any[] = []
    let currentPath = indexRow.parent_path
    const visited = new Set<string>()
    while (currentPath && !visited.has(currentPath)) {
      visited.add(currentPath)
      const parent = db.prepare(
        'SELECT rowid, file_path, title, parent_path, is_directory FROM doc_index WHERE (file_path = ? OR file_path = ?) AND is_directory = 1'
      ).get(currentPath, currentPath + '/_index.md') as any
      if (!parent) break
      breadcrumb.unshift(parent)
      currentPath = parent.parent_path
    }

    const childrenPath = indexRow.is_directory
      ? (filePath.endsWith('/_index.md') ? dirname(filePath) : filePath)
      : indexRow.parent_path

    const children = db.prepare(
      'SELECT rowid, file_path, title, is_directory, sort, updated_at FROM doc_index WHERE parent_path = ? ORDER BY is_directory DESC, sort DESC, updated_at DESC'
    ).all(childrenPath)

    return {
      doc: { ...indexRow, content },
      breadcrumb,
      children,
      parentPath: childrenPath
    }
  })

  ipcMain.handle('doc:save', (_e, params: any) => {
    const now = nowString()

    if (params.file_path && existsSync(join(docsRoot, params.file_path))) {
      const fullPath = join(docsRoot, params.file_path)
      const raw = readFileSync(fullPath, 'utf-8')
      const { meta, rawFrontMatter } = parseDoc(raw)

      const updatedMeta = {
        ...meta,
        title: params.title ?? meta.title,
        tags: params.tags ? (Array.isArray(params.tags) ? params.tags : params.tags.split(',').map((s: string) => s.trim()).filter(Boolean)) : meta.tags,
        pinned: params.pinned !== undefined ? Boolean(params.pinned) : meta.pinned,
        updated: now
      }

      const content = params.content !== undefined ? params.content : ''
      const newRaw = serializeDoc(updatedMeta, content, rawFrontMatter)

      let finalPath = params.file_path
      if (params.title && params.title !== meta.title && !params.file_path.endsWith('/_index.md')) {
        const dir = dirname(params.file_path)
        const newFileName = titleToFilename(params.title) + '.md'
        finalPath = dir ? `${dir}/${newFileName}` : newFileName

        if (finalPath !== params.file_path) {
          const newFullPath = join(docsRoot, finalPath)
          markSelfWrite(finalPath)
          writeFileSync(newFullPath, newRaw, 'utf-8')

          markSelfWrite(params.file_path)
          unlinkSync(fullPath)

          removeFromIndex(db, params.file_path)
          reindexSingleFile(db, docsRoot, finalPath)
          scheduleGitCommit(docsRoot)
          return finalPath
        }
      }

      markSelfWrite(finalPath)
      writeFileSync(fullPath, newRaw, 'utf-8')
      reindexSingleFile(db, docsRoot, finalPath)
      scheduleGitCommit(docsRoot)
      return finalPath
    }

    const parentPath = params.parent_path || ''
    const title = params.title || 'Untitled'
    const isDirectory = params.is_directory || false

    let filePath: string
    if (isDirectory) {
      const dirName = titleToFilename(title)
      const dirPath = parentPath ? `${parentPath}/${dirName}` : dirName
      const fullDirPath = join(docsRoot, dirPath)
      mkdirSync(fullDirPath, { recursive: true })

      filePath = `${dirPath}/_index.md`
      const meta = buildDefaultMeta(title)
      const content = params.content || ''
      const raw = serializeDoc(meta, content)

      markSelfWrite(filePath)
      writeFileSync(join(docsRoot, filePath), raw, 'utf-8')
    } else {
      const fileName = titleToFilename(title) + '.md'
      filePath = parentPath ? `${parentPath}/${fileName}` : fileName
      const fullPath = join(docsRoot, filePath)

      mkdirSync(dirname(fullPath), { recursive: true })

      const meta = buildDefaultMeta(title)
      if (params.tags) {
        meta.tags = Array.isArray(params.tags) ? params.tags : params.tags.split(',').map((s: string) => s.trim()).filter(Boolean)
      }
      const content = params.content || ''
      const raw = serializeDoc(meta, content)

      markSelfWrite(filePath)
      writeFileSync(fullPath, raw, 'utf-8')
    }

    reindexSingleFile(db, docsRoot, filePath)
    scheduleGitCommit(docsRoot)
    return filePath
  })

  ipcMain.handle('doc:delete', (_e, filePath: string) => {
    const fullPath = join(docsRoot, filePath)
    if (!existsSync(fullPath)) return false

    const indexRow = db.prepare('SELECT is_directory FROM doc_index WHERE file_path = ?').get(filePath) as any

    if (indexRow?.is_directory || filePath.endsWith('/_index.md')) {
      const dirPath = filePath.endsWith('/_index.md') ? dirname(filePath) : filePath
      const fullDirPath = join(docsRoot, dirPath)
      if (existsSync(fullDirPath)) {
        removeDirectoryRecursive(fullDirPath)
      }
      const children = db.prepare('SELECT file_path FROM doc_index WHERE parent_path = ? OR file_path LIKE ?').all(dirPath, dirPath + '/%') as any[]
      for (const child of children) {
        removeFromIndex(db, child.file_path)
      }
      removeFromIndex(db, filePath)
    } else {
      markSelfWrite(filePath)
      unlinkSync(fullPath)
      removeFromIndex(db, filePath)
      cleanEmptyParents(dirname(fullPath), docsRoot)
    }

    scheduleGitCommit(docsRoot)
    return true
  })

  ipcMain.handle('doc:move', (_e, filePath: string, targetParentPath: string) => {
    const fullPath = join(docsRoot, filePath)
    if (!existsSync(fullPath)) throw new Error('文件不存在')

    const fileName = basename(filePath)
    const newFilePath = targetParentPath ? `${targetParentPath}/${fileName}` : fileName
    const newFullPath = join(docsRoot, newFilePath)

    if (filePath === newFilePath) return newFilePath

    mkdirSync(dirname(newFullPath), { recursive: true })
    renameSync(fullPath, newFullPath)
    cleanEmptyParents(dirname(fullPath), docsRoot)

    markSelfWrite(newFilePath)
    removeFromIndex(db, filePath)
    reindexSingleFile(db, docsRoot, newFilePath)
    scheduleGitCommit(docsRoot)
    return newFilePath
  })

  ipcMain.handle('doc:pin', (_e, filePath: string, isPinned: boolean) => {
    const fullPath = join(docsRoot, filePath)
    if (!existsSync(fullPath)) return false

    const raw = readFileSync(fullPath, 'utf-8')
    const { meta, content, rawFrontMatter } = parseDoc(raw)
    meta.pinned = isPinned
    const newRaw = serializeDoc(meta, content, rawFrontMatter)

    markSelfWrite(filePath)
    writeFileSync(fullPath, newRaw, 'utf-8')
    reindexSingleFile(db, docsRoot, filePath)
    return true
  })

  ipcMain.handle('doc:getPinned', () => {
    return db.prepare(
      'SELECT rowid, file_path, title, is_directory FROM doc_index WHERE is_pinned = 1 ORDER BY updated_at DESC'
    ).all()
  })

  ipcMain.handle('doc:getNavigation', () => {
    return db.prepare(
      "SELECT rowid, file_path, title FROM doc_index WHERE parent_path = '' AND is_directory = 1 ORDER BY sort DESC, title ASC"
    ).all()
  })

  ipcMain.handle('doc:search', (_e, keyword: string) => {
    if (!keyword || keyword.trim().length === 0) return []
    try {
      return db.prepare(`
        SELECT
          d.rowid,
          d.file_path,
          d.title,
          d.is_directory,
          d.updated_at,
          d.parent_path,
          highlight(doc_fts, 0, '{{HL}}', '{{/HL}}') AS title_hl,
          snippet(doc_fts, 1, '{{HL}}', '{{/HL}}', '...', 40) AS content_snippet,
          bm25(doc_fts, 10.0, 1.0) AS rank
        FROM doc_fts
        JOIN doc_index d ON d.rowid = doc_fts.rowid
        WHERE doc_fts MATCH ?
        ORDER BY rank
        LIMIT 30
      `).all(keyword + '*')
    } catch {
      return db.prepare(
        "SELECT rowid, file_path, title, is_directory, updated_at, parent_path FROM doc_index WHERE title LIKE ? OR content LIKE ? LIMIT 30"
      ).all(`%${keyword}%`, `%${keyword}%`)
    }
  })

  ipcMain.handle('doc:getDeleted', () => {
    return []
  })

  ipcMain.handle('doc:restore', (_e, _filePath: string) => {
    return false
  })

  ipcMain.handle('doc:importMd', (_e, files: Array<{ name: string; content: string }>, parentPath: string) => {
    const results: string[] = []
    for (const file of files) {
      const title = file.name.replace(/\.md$/i, '')
      const fileName = titleToFilename(title) + '.md'
      const filePath = parentPath ? `${parentPath}/${fileName}` : fileName
      const fullPath = join(docsRoot, filePath)

      mkdirSync(dirname(fullPath), { recursive: true })

      const meta = buildDefaultMeta(title)
      const raw = serializeDoc(meta, file.content)

      markSelfWrite(filePath)
      writeFileSync(fullPath, raw, 'utf-8')
      reindexSingleFile(db, docsRoot, filePath)
      results.push(filePath)
    }
    scheduleGitCommit(docsRoot)
    return results
  })

  ipcMain.handle('doc:getDashboard', () => {
    const totalDocs = (db.prepare("SELECT COUNT(*) as c FROM doc_index WHERE is_directory = 0").get() as any).c
    const totalDirs = (db.prepare("SELECT COUNT(*) as c FROM doc_index WHERE is_directory = 1").get() as any).c

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().replace('T', ' ').substring(0, 19)
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString().replace('T', ' ').substring(0, 19)

    const todayUpdates = (db.prepare("SELECT COUNT(*) as c FROM doc_index WHERE updated_at >= ?").get(todayStart) as any).c
    const weekUpdates = (db.prepare("SELECT COUNT(*) as c FROM doc_index WHERE updated_at >= ?").get(weekStart) as any).c

    return { totalDocs, totalDirs, todayUpdates, weekUpdates }
  })

  ipcMain.handle('doc:getConflicts', () => {
    const conflictPattern = '_冲突_远程_'
    const rows = db.prepare(
      'SELECT rowid, file_path, title, updated_at FROM doc_index WHERE file_path LIKE ? ORDER BY updated_at DESC'
    ).all(`%${conflictPattern}%`) as any[]
    return rows
  })

  ipcMain.handle('index:rebuild', () => {
    return fullRebuild(db, docsRoot)
  })

  ipcMain.handle('index:status', () => {
    const total = (db.prepare('SELECT COUNT(*) as c FROM doc_index').get() as any).c
    const docs = (db.prepare('SELECT COUNT(*) as c FROM doc_index WHERE is_directory = 0').get() as any).c
    const dirs = (db.prepare('SELECT COUNT(*) as c FROM doc_index WHERE is_directory = 1').get() as any).c
    return { total, docs, dirs }
  })
}

function scheduleGitCommit(docsRoot: string): void {
  syncQueue.scheduleCommit(() => commitChanges(docsRoot))
}

function removeDirectoryRecursive(dirPath: string): void {
  if (!existsSync(dirPath)) return
  const entries = readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name)
    if (entry.isDirectory()) {
      removeDirectoryRecursive(fullPath)
    } else {
      unlinkSync(fullPath)
    }
  }
  rmdirSync(dirPath)
}

function cleanEmptyParents(dir: string, stopAt: string): void {
  while (dir !== stopAt && dir.startsWith(stopAt) && existsSync(dir)) {
    const entries = readdirSync(dir).filter(e => e !== '.' && e !== '..')
    if (entries.length === 0) {
      rmdirSync(dir)
      dir = dirname(dir)
    } else {
      break
    }
  }
}
