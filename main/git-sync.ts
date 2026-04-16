import Database from 'better-sqlite3'
import { simpleGit, SimpleGit } from 'simple-git'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { resolveConflicts } from './conflict-resolver'
import { incrementalReindex } from './indexer'
import * as syncQueue from './sync-queue'

let syncTimer: ReturnType<typeof setInterval> | null = null

function getGitConfig(db: Database.Database): { url: string; branch: string; interval: number } {
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as any[]
  const settings: Record<string, string> = {}
  for (const r of rows) settings[r.key] = r.value
  return {
    url: settings['git_url'] || '',
    branch: settings['git_branch'] || 'main',
    interval: parseInt(settings['git_interval'] || '5', 10)
  }
}

async function ensureGitRepo(docsRoot: string, gitUrl: string, branch: string): Promise<SimpleGit> {
  const git = simpleGit(docsRoot)
  const isRepo = existsSync(join(docsRoot, '.git'))

  if (!isRepo) {
    await git.init()
  }

  const branchInfo = await git.branchLocal()
  if (branchInfo.current && branchInfo.current !== branch) {
    try {
      await git.raw(['branch', '-M', branch])
    } catch {}
  }

  if (gitUrl) {
    try {
      await git.remote(['set-url', 'origin', gitUrl])
    } catch {
      await git.addRemote('origin', gitUrl).catch(() => {})
    }
  }

  ensureGitignore(docsRoot)
  return git
}

function ensureGitignore(docsRoot: string): void {
  const gitignorePath = join(docsRoot, '.gitignore')
  const requiredLine = '.moji/'

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8')
    if (!content.includes(requiredLine)) {
      writeFileSync(gitignorePath, content.trimEnd() + '\n' + requiredLine + '\n')
    }
  } else {
    writeFileSync(gitignorePath, requiredLine + '\n')
  }
}

export async function commitChanges(docsRoot: string): Promise<void> {
  const git = simpleGit(docsRoot)
  if (!existsSync(join(docsRoot, '.git'))) return

  await git.add('.')
  const status = await git.status()

  if (status.files.length > 0) {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
    await git.commit(`sync: ${now}`)
  }
}

export async function syncGit(db: Database.Database, docsRoot: string): Promise<{ success: boolean; message: string; conflicts: string[] }> {
  const config = getGitConfig(db)

  if (!config.url) {
    return { success: true, message: '未配置 Git 仓库', conflicts: [] }
  }

  syncQueue.updateState('syncing')

  try {
    const git = await ensureGitRepo(docsRoot, config.url, config.branch)

    await git.add('.')
    const status = await git.status()
    if (status.files.length > 0) {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
      await git.commit(`sync: ${now}`)
    }

    let remoteHasBranch = false
    try {
      const refs = await git.listRemote(['--heads', 'origin', config.branch])
      remoteHasBranch = refs.trim().length > 0
    } catch {
      remoteHasBranch = false
    }

    let conflicts: string[] = []
    if (remoteHasBranch) {
      try {
        await git.pull('origin', config.branch, ['--no-rebase'])
      } catch (pullErr: any) {
        const pullStatus = await git.status()
        if (pullStatus.conflicted.length > 0) {
          conflicts = await resolveConflicts(git, docsRoot, pullStatus.conflicted)
        } else {
          throw pullErr
        }
      }
    }

    try {
      await git.push('origin', config.branch, ['--set-upstream'])
    } catch (pushErr: any) {
      syncQueue.markError(`推送失败: ${pushErr.message}`)
      return { success: false, message: `推送失败: ${pushErr.message}`, conflicts }
    }

    incrementalReindex(db, docsRoot)
    syncQueue.markSynced()

    const msg = conflicts.length > 0
      ? `同步完成，${conflicts.length} 个文件有冲突已保留两个版本`
      : '同步完成'

    return { success: true, message: msg, conflicts }
  } catch (e: any) {
    syncQueue.markError(e.message || '同步失败')
    return { success: false, message: e.message || '同步失败', conflicts: [] }
  }
}

export async function initGitRepo(db: Database.Database, docsRoot: string, gitUrl: string, branch: string): Promise<{ success: boolean; message: string }> {
  try {
    const git = await ensureGitRepo(docsRoot, gitUrl, branch)

    let remoteEmpty = true
    try {
      const refs = await git.listRemote(['--heads', 'origin'])
      remoteEmpty = !refs.trim()
    } catch {
      remoteEmpty = true
    }

    if (remoteEmpty) {
      await git.add('.')
      const status = await git.status()
      if (status.files.length > 0) {
        await git.commit('Initial commit from MojiDocs')
        await git.push('origin', branch, ['--set-upstream'])
      }
      return { success: true, message: '仓库初始化完成，已推送本地内容' }
    }

    try {
      await git.fetch('origin')
      const localStatus = await git.status()

      if (localStatus.files.length > 0 || localHasCommits(docsRoot)) {
        await git.add('.')
        try { await git.commit('Local content before merge') } catch {}
        await git.raw(['merge', `origin/${branch}`, '--allow-unrelated-histories', '--no-edit'])
      } else {
        await git.pull('origin', branch)
      }

      return { success: true, message: '仓库关联成功，已拉取远程内容' }
    } catch (e: any) {
      const pullStatus = await git.status()
      if (pullStatus.conflicted.length > 0) {
        const conflicts = await resolveConflicts(git, docsRoot, pullStatus.conflicted)
        return { success: true, message: `关联完成，${conflicts.length} 个冲突已保留两个版本` }
      }
      throw e
    }
  } catch (e: any) {
    return { success: false, message: e.message || '初始化失败' }
  }
}

function localHasCommits(docsRoot: string): boolean {
  try {
    const git = simpleGit(docsRoot)
    // synchronous check not available, assume true if .git exists with objects
    return existsSync(join(docsRoot, '.git', 'refs'))
  } catch {
    return false
  }
}

export async function cloneRepo(gitUrl: string, docsRoot: string, branch: string): Promise<void> {
  if (!existsSync(docsRoot)) {
    mkdirSync(docsRoot, { recursive: true })
  }
  const git = simpleGit()
  await git.clone(gitUrl, docsRoot, ['--branch', branch])
  ensureGitignore(docsRoot)
}

export function startGitSyncScheduler(db: Database.Database, docsRoot: string): void {
  stopGitSyncScheduler()

  const config = getGitConfig(db)
  if (config.interval <= 0 || !config.url) return

  syncTimer = setInterval(async () => {
    if (!syncQueue.shouldRetry()) return
    try {
      await syncGit(db, docsRoot)
    } catch (e: any) {
      console.error('Git sync scheduler error:', e.message)
    }
  }, config.interval * 60 * 1000)
}

export function stopGitSyncScheduler(): void {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
}
