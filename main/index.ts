import { app, BrowserWindow, ipcMain, shell, protocol, net, dialog, nativeImage } from 'electron'
import { join } from 'path'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { pathToFileURL } from 'url'
import os from 'os'
import { initDatabase } from './database'
import { registerDocIpc } from './ipc/doc'
import { registerVersionIpc } from './ipc/version'
import { registerSettingsIpc } from './ipc/settings'
import { registerUploadIpc } from './ipc/upload'
import { startGitSyncScheduler, stopGitSyncScheduler, syncGit, cloneRepo } from './git-sync'
import { incrementalReindex } from './indexer'
import { startWatching, stopWatching } from './file-watcher'
import { initLfs } from './lfs'
import * as syncQueue from './sync-queue'
import { registerUpdaterIpc } from './updater'
import { buildAppMenu } from './menu'
import Database from 'better-sqlite3'

let mainWindow: BrowserWindow | null = null
let appInitialized = false

function getConfigPath(): string {
  return join(app.getPath('userData'), 'moji-config.json')
}

function loadConfig(): { docsRoot: string } | null {
  const configPath = getConfigPath()
  if (!existsSync(configPath)) return null
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'))
  } catch {
    return null
  }
}

function saveConfig(config: { docsRoot: string }): void {
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2))
}

function createWindow(): void {
  const iconPath = join(__dirname, '../../assets/icon.png')
  const appIcon = nativeImage.createFromPath(iconPath)

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'MojiDocs',
    icon: appIcon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  })

  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(appIcon)
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    if (process.env.NODE_ENV === 'development' || process.env['ELECTRON_RENDERER_URL']) {
      mainWindow?.webContents.openDevTools({ mode: 'right' })
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function initApp(docsRoot: string): Database.Database {
  if (!existsSync(docsRoot)) {
    mkdirSync(docsRoot, { recursive: true })
  }

  const db = initDatabase(docsRoot)

  if (!appInitialized) {
    registerDocIpc(db, docsRoot)
    registerVersionIpc(docsRoot)
    registerSettingsIpc(db, docsRoot)
    registerUploadIpc(docsRoot, db)
    appInitialized = true
  }

  incrementalReindex(db, docsRoot)
  startWatching(db, docsRoot)
  startGitSyncScheduler(db, docsRoot)

  return db
}

app.whenReady().then(() => {
  protocol.handle('moji-file', (request) => {
    const filePath = decodeURIComponent(request.url.replace('moji-file://', ''))
    return net.fetch(pathToFileURL(filePath).toString())
  })

  const config = loadConfig()
  let db: Database.Database | null = null

  registerUpdaterIpc()
  buildAppMenu()

  if (config?.docsRoot) {
    db = initApp(config.docsRoot)

    const settings = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('git_url') as any
    if (settings?.value) {
      syncGit(db, config.docsRoot).catch(console.error)
    }
  }

  ipcMain.handle('app:isConfigured', () => {
    const currentConfig = loadConfig()
    return !!currentConfig?.docsRoot
  })

  ipcMain.handle('app:setup', async (_e, params: { docsRoot: string; gitUrl?: string; gitBranch?: string }) => {
    const { docsRoot, gitUrl, gitBranch } = params

    if (gitUrl) {
      let remoteEmpty = true
      try {
        const { simpleGit } = await import('simple-git')
        const tmpGit = simpleGit()
        const refs = await tmpGit.listRemote(['--heads', gitUrl])
        remoteEmpty = !refs.trim()
      } catch {
        remoteEmpty = true
      }

      if (!remoteEmpty) {
        await cloneRepo(gitUrl, docsRoot, gitBranch || 'main')
      } else {
        mkdirSync(docsRoot, { recursive: true })
      }
    } else {
      mkdirSync(docsRoot, { recursive: true })
    }

    saveConfig({ docsRoot })
    db = initApp(docsRoot)

    if (gitUrl) {
      const upsert = db.prepare(
        'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      )
      upsert.run('git_url', gitUrl)
      upsert.run('git_branch', gitBranch || 'main')

      const { simpleGit } = await import('simple-git')
      if (!existsSync(join(docsRoot, '.git'))) {
        const git = simpleGit(docsRoot)
        await git.init()
        const configuredBranch = gitBranch || 'main'
        try { await git.raw(['branch', '-M', configuredBranch]) } catch {}
        try { await git.addRemote('origin', gitUrl) } catch {}
      }

      await initLfs(docsRoot)
      startGitSyncScheduler(db, docsRoot)
    }

    return { success: true }
  })

  ipcMain.handle('app:selectDirectory', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: '选择笔记存放目录'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('app:getInfo', () => ({
    docsRoot: config?.docsRoot || '',
    username: os.userInfo().username,
    platform: process.platform,
    version: app.getVersion(),
    electronVersion: process.versions.electron
  }))

  ipcMain.handle('app:exportPdf', async (_event, html: string, title: string) => {
    if (!mainWindow) return null
    const pdfWindow = new BrowserWindow({ show: false, width: 800, height: 600 })
    pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    await new Promise(r => setTimeout(r, 500))
    const pdfData = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      margins: { marginType: 'default' }
    })
    pdfWindow.close()
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${title}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (!result.canceled && result.filePath) {
      writeFileSync(result.filePath, pdfData)
      return result.filePath
    }
    return null
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopWatching()
  stopGitSyncScheduler()
  if (process.platform !== 'darwin') app.quit()
})
