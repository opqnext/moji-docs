import { simpleGit } from 'simple-git'
import { join } from 'path'
import { existsSync, writeFileSync, readFileSync } from 'fs'

const LFS_GITATTRIBUTES = `assets/**/*.png filter=lfs diff=lfs merge=lfs -text
assets/**/*.jpg filter=lfs diff=lfs merge=lfs -text
assets/**/*.jpeg filter=lfs diff=lfs merge=lfs -text
assets/**/*.gif filter=lfs diff=lfs merge=lfs -text
assets/**/*.webp filter=lfs diff=lfs merge=lfs -text
assets/**/*.svg filter=lfs diff=lfs merge=lfs -text
`

export async function isLfsAvailable(): Promise<boolean> {
  try {
    const git = simpleGit()
    const result = await git.raw(['lfs', 'version'])
    return result.includes('git-lfs')
  } catch {
    return false
  }
}

export async function initLfs(docsRoot: string): Promise<boolean> {
  const available = await isLfsAvailable()
  if (!available) return false

  try {
    const git = simpleGit(docsRoot)
    await git.raw(['lfs', 'install', '--local'])

    const attrPath = join(docsRoot, '.gitattributes')
    if (existsSync(attrPath)) {
      const content = readFileSync(attrPath, 'utf-8')
      if (!content.includes('filter=lfs')) {
        writeFileSync(attrPath, content.trimEnd() + '\n' + LFS_GITATTRIBUTES)
      }
    } else {
      writeFileSync(attrPath, LFS_GITATTRIBUTES)
    }

    return true
  } catch {
    return false
  }
}

export async function getLfsStatus(docsRoot: string): Promise<{ installed: boolean; tracking: boolean }> {
  const installed = await isLfsAvailable()
  const attrPath = join(docsRoot, '.gitattributes')
  const tracking = existsSync(attrPath) && readFileSync(attrPath, 'utf-8').includes('filter=lfs')

  return { installed, tracking }
}
