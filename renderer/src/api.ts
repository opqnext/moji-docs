declare global {
  interface Window {
    mojiApi: {
      invoke: (channel: string, ...args: any[]) => Promise<any>
      on: (channel: string, callback: (...args: any[]) => void) => () => void
    }
  }
}

const api = {
  isConfigured: () => window.mojiApi.invoke('app:isConfigured'),
  setup: (params: { docsRoot: string; gitUrl?: string; gitBranch?: string }) =>
    window.mojiApi.invoke('app:setup', params),
  selectDirectory: () => window.mojiApi.invoke('app:selectDirectory'),

  getRecent: () => window.mojiApi.invoke('doc:getRecent'),
  getChildren: (parentPath: string) => window.mojiApi.invoke('doc:getChildren', parentPath),
  getTree: () => window.mojiApi.invoke('doc:getTree'),
  getDetail: (filePath: string) => window.mojiApi.invoke('doc:getDetail', filePath),
  saveDoc: (params: any) => window.mojiApi.invoke('doc:save', params),
  deleteDoc: (filePath: string) => window.mojiApi.invoke('doc:delete', filePath),
  moveDoc: (filePath: string, targetParentPath: string) => window.mojiApi.invoke('doc:move', filePath, targetParentPath),
  pinDoc: (filePath: string, isPinned: boolean) => window.mojiApi.invoke('doc:pin', filePath, isPinned),
  getPinned: () => window.mojiApi.invoke('doc:getPinned'),
  getNavigation: () => window.mojiApi.invoke('doc:getNavigation'),
  search: (keyword: string) => window.mojiApi.invoke('doc:search', keyword),
  restoreDoc: (filePath: string) => window.mojiApi.invoke('doc:restore', filePath),
  getDeleted: () => window.mojiApi.invoke('doc:getDeleted'),
  importMd: (files: Array<{ name: string; content: string }>, parentPath: string) =>
    window.mojiApi.invoke('doc:importMd', files, parentPath),
  getDashboard: () => window.mojiApi.invoke('doc:getDashboard'),

  getConflicts: () => window.mojiApi.invoke('doc:getConflicts'),

  getVersions: (filePath: string) => window.mojiApi.invoke('version:list', filePath),
  getVersionContent: (filePath: string, commitHash: string) => window.mojiApi.invoke('version:getContent', filePath, commitHash),
  rollbackVersion: (filePath: string, commitHash: string) => window.mojiApi.invoke('version:rollback', filePath, commitHash),

  getSettings: () => window.mojiApi.invoke('settings:get'),
  saveSettings: (items: Record<string, string>) => window.mojiApi.invoke('settings:save', items),
  syncGit: () => window.mojiApi.invoke('git:sync'),
  gitStatus: () => window.mojiApi.invoke('git:status'),
  gitInit: (gitUrl: string, branch: string) => window.mojiApi.invoke('git:init', gitUrl, branch),
  lfsStatus: () => window.mojiApi.invoke('git:lfsStatus'),

  uploadImage: (base64: string, ext: string) => window.mojiApi.invoke('upload:image', base64, ext),
  cleanImages: () => window.mojiApi.invoke('upload:cleanImages'),

  rebuildIndex: () => window.mojiApi.invoke('index:rebuild'),
  indexStatus: () => window.mojiApi.invoke('index:status'),

  getAppInfo: () => window.mojiApi.invoke('app:getInfo'),
  exportPdf: (html: string, title: string) => window.mojiApi.invoke('app:exportPdf', html, title),
  checkUpdate: () => window.mojiApi.invoke('app:checkUpdate'),

  onSyncStatus: (callback: (status: any) => void) => window.mojiApi.on('sync:statusUpdate', callback),
  onFileChanged: (callback: (filePath: string) => void) => window.mojiApi.on('file:changed', callback),
  onFileRemoved: (callback: (filePath: string) => void) => window.mojiApi.on('file:removed', callback)
}

export default api
