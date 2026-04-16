import { SimpleGit } from 'simple-git'
import { join, dirname, basename, extname } from 'path'
import { writeFileSync, mkdirSync, existsSync } from 'fs'

export async function resolveConflicts(git: SimpleGit, docsRoot: string, conflictedFiles: string[]): Promise<string[]> {
  const resolvedConflicts: string[] = []
  const dateSuffix = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 8)

  for (const filePath of conflictedFiles) {
    try {
      let oursContent: string
      try {
        oursContent = await git.show(`:2:${filePath}`)
      } catch {
        oursContent = ''
      }

      let theirsContent: string
      try {
        theirsContent = await git.show(`:3:${filePath}`)
      } catch {
        theirsContent = ''
      }

      const fullPath = join(docsRoot, filePath)
      const dir = dirname(fullPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      writeFileSync(fullPath, oursContent, 'utf-8')

      if (theirsContent) {
        const ext = extname(filePath)
        const base = basename(filePath, ext)
        const parentDir = dirname(filePath)
        const conflictName = `${base}_冲突_远程_${dateSuffix}${ext}`
        const conflictPath = parentDir === '.' ? conflictName : `${parentDir}/${conflictName}`
        const conflictFullPath = join(docsRoot, conflictPath)

        writeFileSync(conflictFullPath, theirsContent, 'utf-8')
        await git.add(conflictPath)
      }

      await git.add(filePath)
      resolvedConflicts.push(filePath)
    } catch (e: any) {
      console.error(`Failed to resolve conflict for ${filePath}:`, e.message)
    }
  }

  if (resolvedConflicts.length > 0) {
    try {
      await git.commit(`resolve conflicts: ${resolvedConflicts.length} files`)
    } catch {
      // commit might fail if nothing staged
    }
  }

  return resolvedConflicts
}
