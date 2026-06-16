import { ipcMain, clipboard, nativeImage, dialog, BrowserWindow, net } from 'electron'
import { resolve, basename, extname } from 'path'
import { readFileSync, writeFileSync } from 'fs'

function resolveImagePath(src: string, docsRoot: string): string | null {
  if (src.startsWith('moji-file://')) {
    return decodeURIComponent(src.replace('moji-file://', ''))
  }
  if (src.startsWith('assets/')) {
    return resolve(docsRoot, src)
  }
  return null
}

async function fetchRemoteImage(url: string): Promise<Buffer> {
  const resp = await net.fetch(url)
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`)
  const arrayBuffer = await resp.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export function registerImageIpc(docsRoot: string): void {
  ipcMain.handle('image:copy', async (_e, src: string) => {
    const localPath = resolveImagePath(src, docsRoot)
    let buffer: Buffer

    if (localPath) {
      buffer = readFileSync(localPath)
    } else if (src.startsWith('http://') || src.startsWith('https://')) {
      buffer = await fetchRemoteImage(src)
    } else {
      throw new Error('Unsupported image source')
    }

    const img = nativeImage.createFromBuffer(buffer)
    if (img.isEmpty()) throw new Error('Invalid image data')
    clipboard.writeImage(img)
    return true
  })

  ipcMain.handle('image:saveAs', async (_e, src: string) => {
    const localPath = resolveImagePath(src, docsRoot)
    let buffer: Buffer
    let defaultName: string

    if (localPath) {
      buffer = readFileSync(localPath)
      defaultName = basename(localPath)
    } else if (src.startsWith('http://') || src.startsWith('https://')) {
      buffer = await fetchRemoteImage(src)
      const urlPath = new URL(src).pathname
      defaultName = basename(urlPath) || 'image.png'
    } else {
      throw new Error('Unsupported image source')
    }

    const ext = extname(defaultName).replace('.', '') || 'png'
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null

    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultName,
      filters: [{ name: 'Image', extensions: [ext] }]
    })

    if (result.canceled || !result.filePath) return null
    writeFileSync(result.filePath, buffer)
    return result.filePath
  })
}
