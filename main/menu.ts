import { app, Menu, BrowserWindow, shell } from 'electron'
import { checkForUpdate, showUpdateDialog, UPDATE_REPO } from './updater'

export function buildAppMenu(): void {
  const appName = 'MojiDocs'

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: appName,
      submenu: [
        { label: `关于 ${appName}`, role: 'about' },
        {
          label: '检查更新…',
          click: async () => {
            const result = await checkForUpdate(UPDATE_REPO)
            const win = BrowserWindow.getFocusedWindow()
            showUpdateDialog(win, result)
          }
        },
        { type: 'separator' },
        { label: '设置…', accelerator: 'Cmd+,', click: () => {
          const win = BrowserWindow.getFocusedWindow()
          win?.webContents.send('navigate', '/settings')
        }},
        { type: 'separator' },
        { label: `隐藏 ${appName}`, role: 'hide' },
        { label: '隐藏其他', role: 'hideOthers' },
        { label: '显示全部', role: 'unhide' },
        { type: 'separator' },
        { label: `退出 ${appName}`, role: 'quit' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '全选', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { label: '开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        { label: '缩放', role: 'zoom' },
        { type: 'separator' },
        { label: '前置全部窗口', role: 'front' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '报告问题',
          click: () => shell.openExternal('https://github.com/opqnext/moji-docs/issues')
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
