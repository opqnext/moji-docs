import * as chokidar from 'chokidar'
import { relative } from 'path'
import { BrowserWindow } from 'electron'
import Database from 'better-sqlite3'
import { reindexSingleFile, removeFromIndex } from './indexer'

let watcher: chokidar.FSWatcher | null = null
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
const selfWritePaths = new Set<string>()
const DEBOUNCE_MS = 500

export function markSelfWrite(filePath: string): void {
  selfWritePaths.add(filePath)
  setTimeout(() => selfWritePaths.delete(filePath), 2000)
}

export function startWatching(db: Database.Database, docsRoot: string): void {
  stopWatching()

  watcher = chokidar.watch(docsRoot, {
    ignored: [
      /(^|[/\\])\.moji/,
      /(^|[/\\])\.git/,
      /(^|[/\\])assets[/\\]/
    ],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  })

  function handleChange(fullPath: string) {
    const relPath = relative(docsRoot, fullPath).replace(/\\/g, '/')
    if (!relPath.endsWith('.md')) return
    if (selfWritePaths.has(relPath)) return

    if (debounceTimers.has(relPath)) {
      clearTimeout(debounceTimers.get(relPath)!)
    }

    debounceTimers.set(relPath, setTimeout(() => {
      debounceTimers.delete(relPath)
      reindexSingleFile(db, docsRoot, relPath)
      notifyRenderer('file:changed', relPath)
    }, DEBOUNCE_MS))
  }

  function handleRemove(fullPath: string) {
    const relPath = relative(docsRoot, fullPath).replace(/\\/g, '/')
    if (!relPath.endsWith('.md')) return

    removeFromIndex(db, relPath)
    notifyRenderer('file:removed', relPath)
  }

  watcher
    .on('add', handleChange)
    .on('change', handleChange)
    .on('unlink', handleRemove)
}

export function stopWatching(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer)
  }
  debounceTimers.clear()
}

function notifyRenderer(channel: string, data: any): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, data)
  }
}
