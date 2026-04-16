import { ipcMain } from 'electron'
import { simpleGit } from 'simple-git'
import { existsSync } from 'fs'
import { join } from 'path'

export function registerVersionIpc(docsRoot: string): void {
  ipcMain.handle('version:list', async (_e, filePath: string) => {
    if (!existsSync(join(docsRoot, '.git'))) return []

    try {
      const git = simpleGit(docsRoot)
      const log = await git.log({ file: filePath, maxCount: 20 })

      return log.all.map(entry => ({
        hash: entry.hash,
        date: entry.date,
        message: entry.message,
        author: entry.author_name
      }))
    } catch {
      return []
    }
  })

  ipcMain.handle('version:getContent', async (_e, filePath: string, commitHash: string) => {
    if (!existsSync(join(docsRoot, '.git'))) return null

    try {
      const git = simpleGit(docsRoot)
      const content = await git.show(`${commitHash}:${filePath}`)
      return content
    } catch {
      return null
    }
  })

  ipcMain.handle('version:rollback', async (_e, filePath: string, commitHash: string) => {
    if (!existsSync(join(docsRoot, '.git'))) throw new Error('Git 仓库未初始化')

    try {
      const git = simpleGit(docsRoot)
      await git.raw(['checkout', commitHash, '--', filePath])
      await git.add(filePath)
      await git.commit(`rollback ${filePath} to ${commitHash.substring(0, 8)}`)
      return true
    } catch (e: any) {
      throw new Error(`回滚失败: ${e.message}`)
    }
  })
}
