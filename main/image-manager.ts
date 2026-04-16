import { join, relative } from 'path'
import { mkdirSync, existsSync, writeFileSync, unlinkSync, readdirSync, readFileSync } from 'fs'
import { createHash } from 'crypto'
import Database from 'better-sqlite3'

export function getAssetsDir(docsRoot: string): string {
  return join(docsRoot, 'assets')
}

export function uploadImage(docsRoot: string, base64Data: string, ext: string): string {
  const buffer = Buffer.from(base64Data, 'base64')
  const hash = createHash('md5').update(buffer).digest('hex').substring(0, 12)

  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const day = String(now.getDate()).padStart(2, '0')
  const cleanExt = ext.replace(/^\./, '').toLowerCase()
  const filename = `${day}_${hash}.${cleanExt}`

  const monthDir = join(getAssetsDir(docsRoot), yearMonth)
  if (!existsSync(monthDir)) {
    mkdirSync(monthDir, { recursive: true })
  }

  const fullPath = join(monthDir, filename)
  writeFileSync(fullPath, buffer)

  return `assets/${yearMonth}/${filename}`
}

export function cleanOrphanImages(db: Database.Database, docsRoot: string): { deleted: string[]; total: number } {
  const assetsDir = getAssetsDir(docsRoot)
  if (!existsSync(assetsDir)) return { deleted: [], total: 0 }

  const allContent = db.prepare(
    "SELECT content FROM doc_index WHERE is_directory = 0 AND content != ''"
  ).all() as { content: string }[]

  const referencedImages = new Set<string>()
  const imgPattern = /!\[.*?\]\((assets\/[^)]+)\)/g

  for (const row of allContent) {
    let match: RegExpExecArray | null
    while ((match = imgPattern.exec(row.content)) !== null) {
      referencedImages.add(match[1])
    }
  }

  const diskImages: string[] = []
  scanImages(assetsDir, docsRoot, diskImages)

  const deleted: string[] = []
  for (const imgPath of diskImages) {
    if (!referencedImages.has(imgPath)) {
      const fullPath = join(docsRoot, imgPath)
      try {
        unlinkSync(fullPath)
        deleted.push(imgPath)
      } catch {
        // skip files that can't be deleted
      }
    }
  }

  return { deleted, total: diskImages.length }
}

function scanImages(dir: string, docsRoot: string, result: string[]): void {
  if (!existsSync(dir)) return

  const entries = readdirSync(dir, { withFileTypes: true })
  const imageExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'])

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      scanImages(fullPath, docsRoot, result)
    } else if (entry.isFile()) {
      const ext = entry.name.substring(entry.name.lastIndexOf('.')).toLowerCase()
      if (imageExts.has(ext)) {
        result.push(relative(docsRoot, fullPath).replace(/\\/g, '/'))
      }
    }
  }
}
