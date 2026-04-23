import Database from 'better-sqlite3'
import { join, dirname, relative, basename, extname } from 'path'
import { readdirSync, readFileSync, statSync, existsSync, writeFileSync } from 'fs'
import { createHash } from 'crypto'
import { parseDoc, filenameToTitle, buildDefaultMeta, serializeDoc } from './front-matter'
import { dropAndRebuildFts } from './database'
import { markSelfWrite } from './file-watcher'

export interface IndexStats {
  added: number
  updated: number
  removed: number
  unchanged: number
  total: number
}

export function incrementalReindex(db: Database.Database, docsRoot: string): IndexStats {
  const stats: IndexStats = { added: 0, updated: 0, removed: 0, unchanged: 0, total: 0 }
  const diskFiles = new Map<string, { mtime: number }>()

  scanDirectory(docsRoot, docsRoot, diskFiles)

  const existingRows = db.prepare('SELECT rowid, file_path, file_mtime, file_hash FROM doc_index').all() as any[]
  const existingMap = new Map<string, { rowid: number; file_mtime: number; file_hash: string }>()
  for (const row of existingRows) {
    existingMap.set(row.file_path, { rowid: row.rowid, file_mtime: row.file_mtime, file_hash: row.file_hash })
  }

  const upsert = db.prepare(`
    INSERT INTO doc_index (file_path, title, content, tags, is_pinned, is_directory, sort, parent_path, file_hash, file_mtime, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(file_path) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      tags = excluded.tags,
      is_pinned = excluded.is_pinned,
      sort = excluded.sort,
      parent_path = excluded.parent_path,
      file_hash = excluded.file_hash,
      file_mtime = excluded.file_mtime,
      updated_at = excluded.updated_at
  `)

  const deleteStmt = db.prepare('DELETE FROM doc_index WHERE file_path = ?')

  const tx = db.transaction(() => {
    for (const [filePath, { mtime }] of diskFiles) {
      const existing = existingMap.get(filePath)

      if (existing && Math.abs(existing.file_mtime - mtime) < 1) {
        stats.unchanged++
        existingMap.delete(filePath)
        continue
      }

      const fullPath = join(docsRoot, filePath)
      const isDir = filePath.endsWith('/_index.md')
      const entry = buildIndexEntry(fullPath, filePath, docsRoot, isDir)

      if (!entry) {
        existingMap.delete(filePath)
        continue
      }

      if (existing && existing.file_hash === entry.file_hash) {
        stats.unchanged++
        existingMap.delete(filePath)
        continue
      }

      upsert.run(
        entry.file_path, entry.title, entry.content, entry.tags,
        entry.is_pinned ? 1 : 0, entry.is_directory ? 1 : 0,
        entry.sort, entry.parent_path, entry.file_hash, mtime,
        entry.created_at, entry.updated_at
      )

      if (existing) {
        stats.updated++
      } else {
        stats.added++
      }
      existingMap.delete(filePath)
    }

    indexDirectories(db, docsRoot)

    for (const [filePath] of existingMap) {
      deleteStmt.run(filePath)
      stats.removed++
    }
  })

  tx()
  stats.total = stats.added + stats.updated + stats.unchanged
  return stats
}

export function fullRebuild(db: Database.Database, docsRoot: string): IndexStats {
  db.exec('DELETE FROM doc_index')
  dropAndRebuildFts(db)
  return incrementalReindex(db, docsRoot)
}

function scanDirectory(dir: string, docsRoot: string, result: Map<string, { mtime: number }>): void {
  if (!existsSync(dir)) return

  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (entry.name === 'assets' && dir === docsRoot) continue

    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      scanDirectory(fullPath, docsRoot, result)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relPath = relative(docsRoot, fullPath).replace(/\\/g, '/')
      const st = statSync(fullPath)
      result.set(relPath, { mtime: st.mtimeMs })
    }
  }
}

function buildIndexEntry(fullPath: string, filePath: string, docsRoot: string, isDir: boolean) {
  try {
    const raw = readFileSync(fullPath, 'utf-8')
    const { meta, content } = parseDoc(raw)

    let parentPath: string
    if (isDir) {
      const dirPath = dirname(filePath)
      const grandParent = dirname(dirPath)
      parentPath = grandParent === '.' ? '' : grandParent
    } else {
      const parentDir = dirname(filePath)
      parentPath = parentDir === '.' ? '' : parentDir
    }

    const title = meta.title || filenameToTitle(basename(filePath))
    const hash = createHash('sha256').update(raw).digest('hex').substring(0, 16)

    return {
      file_path: filePath,
      title,
      content,
      tags: Array.isArray(meta.tags) ? meta.tags.join(',') : '',
      is_pinned: meta.pinned,
      is_directory: isDir,
      sort: meta.sort,
      parent_path: parentPath,
      file_hash: hash,
      created_at: meta.created || '',
      updated_at: meta.updated || ''
    }
  } catch {
    return null
  }
}

function indexDirectories(db: Database.Database, docsRoot: string): void {
  const dirs = new Set<string>()

  collectDirs(docsRoot, docsRoot, dirs)

  const upsertDir = db.prepare(`
    INSERT INTO doc_index (file_path, title, content, tags, is_pinned, is_directory, sort, parent_path, file_hash, file_mtime, created_at, updated_at)
    VALUES (?, ?, '', '', 0, 1, 0, ?, '', 0, '', '')
    ON CONFLICT(file_path) DO UPDATE SET
      is_directory = 1,
      parent_path = excluded.parent_path
  `)

  for (const dirPath of dirs) {
    const indexFilePath = dirPath + '/_index.md'
    const hasIndex = db.prepare('SELECT 1 FROM doc_index WHERE file_path = ?').get(indexFilePath)
    if (hasIndex) continue

    const dirName = basename(dirPath)
    const parentDir = dirname(dirPath)
    const parentPath = parentDir === '.' ? '' : parentDir

    const indexFullPath = join(docsRoot, indexFilePath)
    if (!existsSync(indexFullPath)) {
      try {
        const dirFullPath = join(docsRoot, dirPath)
        const dirStat = statSync(dirFullPath)
        const pad = (n: number) => String(n).padStart(2, '0')
        const birthTime = dirStat.birthtime.getTime() > 0 ? dirStat.birthtime : dirStat.mtime
        const created = `${birthTime.getFullYear()}-${pad(birthTime.getMonth() + 1)}-${pad(birthTime.getDate())} ${pad(birthTime.getHours())}:${pad(birthTime.getMinutes())}:${pad(birthTime.getSeconds())}`
        const meta = buildDefaultMeta(dirName)
        meta.created = created
        meta.updated = created
        const raw = serializeDoc(meta, '')
        markSelfWrite(indexFilePath)
        writeFileSync(indexFullPath, raw, 'utf-8')
      } catch (e: any) {
        console.error(`Failed to create _index.md for ${dirPath}:`, e.message)
      }
    }

    const existsAsDir = db.prepare('SELECT 1 FROM doc_index WHERE file_path = ? AND is_directory = 1').get(dirPath)
    if (!existsAsDir) {
      upsertDir.run(dirPath, dirName, parentPath)
    }
  }
}

function collectDirs(dir: string, docsRoot: string, result: Set<string>): void {
  if (!existsSync(dir)) return
  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (entry.name === 'assets' && dir === docsRoot) continue

    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      const relPath = relative(docsRoot, fullPath).replace(/\\/g, '/')
      result.add(relPath)
      collectDirs(fullPath, docsRoot, result)
    }
  }
}

export function reindexSingleFile(db: Database.Database, docsRoot: string, filePath: string): void {
  const fullPath = join(docsRoot, filePath)

  if (!existsSync(fullPath)) {
    db.prepare('DELETE FROM doc_index WHERE file_path = ?').run(filePath)
    return
  }

  const st = statSync(fullPath)
  const isDir = filePath.endsWith('/_index.md')
  const entry = buildIndexEntry(fullPath, filePath, docsRoot, isDir)

  if (!entry) return

  db.prepare(`
    INSERT INTO doc_index (file_path, title, content, tags, is_pinned, is_directory, sort, parent_path, file_hash, file_mtime, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(file_path) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      tags = excluded.tags,
      is_pinned = excluded.is_pinned,
      sort = excluded.sort,
      parent_path = excluded.parent_path,
      file_hash = excluded.file_hash,
      file_mtime = excluded.file_mtime,
      updated_at = excluded.updated_at
  `).run(
    entry.file_path, entry.title, entry.content, entry.tags,
    entry.is_pinned ? 1 : 0, entry.is_directory ? 1 : 0,
    entry.sort, entry.parent_path, entry.file_hash, st.mtimeMs,
    entry.created_at, entry.updated_at
  )
}

export function removeFromIndex(db: Database.Database, filePath: string): void {
  db.prepare('DELETE FROM doc_index WHERE file_path = ?').run(filePath)
}
