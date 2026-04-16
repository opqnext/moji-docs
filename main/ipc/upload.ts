import { ipcMain } from 'electron'
import { uploadImage, cleanOrphanImages } from '../image-manager'
import Database from 'better-sqlite3'

export function registerUploadIpc(docsRoot: string, db: Database.Database): void {
  ipcMain.handle('upload:image', (_e, base64Data: string, ext: string) => {
    return uploadImage(docsRoot, base64Data, ext)
  })

  ipcMain.handle('upload:cleanImages', () => {
    return cleanOrphanImages(db, docsRoot)
  })
}
