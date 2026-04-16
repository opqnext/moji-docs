import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import { simpleGit } from 'simple-git'
import { existsSync } from 'fs'
import { join } from 'path'
import { syncGit, initGitRepo, startGitSyncScheduler } from '../git-sync'
import { getLfsStatus, initLfs } from '../lfs'
import * as syncQueue from '../sync-queue'

const DEFAULTS: Record<string, string> = {
  site_name: 'MojiDocs',
  footer_text: 'Copyright © 2018~2025. opqnext All rights reserved.',
  theme_color: '#6c5ce7',
  markdown_theme: 'default',
  git_url: '',
  git_branch: 'main',
  git_interval: '5'
}

export function registerSettingsIpc(db: Database.Database, docsRoot: string): void {
  ipcMain.handle('settings:get', () => {
    const rows = db.prepare('SELECT key, value FROM app_settings').all() as any[]
    const settings: Record<string, string> = { ...DEFAULTS }
    for (const r of rows) settings[r.key] = r.value
    settings['docs_path'] = docsRoot
    return settings
  })

  ipcMain.handle('settings:save', (_e, items: Record<string, string>) => {
    const upsert = db.prepare(
      'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    const tx = db.transaction((entries: [string, string][]) => {
      for (const [k, v] of entries) {
        upsert.run(k, v)
      }
    })
    tx(Object.entries(items))

    if ('git_interval' in items || 'git_url' in items) {
      startGitSyncScheduler(db, docsRoot)
    }

    return true
  })

  ipcMain.handle('git:sync', async () => {
    return await syncGit(db, docsRoot)
  })

  ipcMain.handle('git:status', async () => {
    const queueStatus = syncQueue.getStatus()
    const gitDir = join(docsRoot, '.git')

    if (!existsSync(gitDir)) {
      return { ...queueStatus, branch: '', lastCommit: '', isRepo: false }
    }

    try {
      const git = simpleGit(docsRoot)
      const branchInfo = await git.branch()
      let lastCommit = ''
      try {
        const log = await git.log({ maxCount: 1 })
        if (log.latest) {
          lastCommit = `${log.latest.date} - ${log.latest.message}`
        }
      } catch {}

      return {
        ...queueStatus,
        branch: branchInfo.current,
        lastCommit,
        isRepo: true
      }
    } catch {
      return { ...queueStatus, branch: '', lastCommit: '', isRepo: true }
    }
  })

  ipcMain.handle('git:init', async (_e, gitUrl: string, branch: string) => {
    const result = await initGitRepo(db, docsRoot, gitUrl, branch)
    if (result.success) {
      const upsert = db.prepare(
        'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      )
      upsert.run('git_url', gitUrl)
      upsert.run('git_branch', branch)
      startGitSyncScheduler(db, docsRoot)

      await initLfs(docsRoot)
    }
    return result
  })

  ipcMain.handle('git:lfsStatus', async () => {
    return await getLfsStatus(docsRoot)
  })
}
