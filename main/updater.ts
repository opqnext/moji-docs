import { app, BrowserWindow, shell, dialog, ipcMain, net } from 'electron'

export const UPDATE_REPO = 'opqnext/moji-docs'

export interface CheckUpdateResult {
  hasUpdate: boolean
  currentVersion: string
  latestVersion?: string
  releaseDate?: string
  releaseNotes?: string
  downloadUrl?: string
  htmlUrl?: string
  error?: string
}

function compareVersions(current: string, latest: string): number {
  const normalize = (v: string) => v.replace(/^v/i, '')
  const a = normalize(current).split('.').map(Number)
  const b = normalize(latest).split('.').map(Number)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (b[i] || 0) - (a[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}

function pickAssetUrl(assets: any[]): string | undefined {
  const platform = process.platform
  const patterns: Record<string, RegExp> = {
    darwin: /\.(dmg|zip)$/i,
    win32: /\.(exe|msi)$/i,
    linux: /\.(AppImage|deb|rpm)$/i
  }
  const re = patterns[platform]
  if (!re) return undefined
  const match = assets.find((a: any) => re.test(a.name))
  return match?.browser_download_url
}

function buildApiUrl(input: string): string {
  const repoPattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/
  if (repoPattern.test(input.trim())) {
    return `https://api.github.com/repos/${input.trim()}/releases/latest`
  }
  return input.trim()
}

function isGitHubApi(url: string): boolean {
  return url.includes('api.github.com/repos/') && url.includes('/releases')
}

async function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = net.request(url)
    request.setHeader('Accept', 'application/vnd.github.v3+json')
    request.setHeader('User-Agent', `MojiDocs/${app.getVersion()}`)

    let body = ''
    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`))
        return
      }
      response.on('data', (chunk) => { body += chunk.toString() })
      response.on('end', () => {
        try { resolve(JSON.parse(body)) }
        catch { reject(new Error('响应解析失败')) }
      })
    })
    request.on('error', (err) => reject(err))
    request.end()
  })
}

function parseGitHubRelease(data: any): CheckUpdateResult {
  const currentVersion = app.getVersion()
  const latestVersion = (data.tag_name || '').replace(/^v/i, '')
  const hasUpdate = compareVersions(currentVersion, latestVersion) > 0

  return {
    hasUpdate,
    currentVersion,
    latestVersion,
    releaseDate: data.published_at ? data.published_at.split('T')[0] : undefined,
    releaseNotes: data.body || undefined,
    downloadUrl: pickAssetUrl(data.assets || []),
    htmlUrl: data.html_url
  }
}

function parseCustomManifest(data: any): CheckUpdateResult {
  const currentVersion = app.getVersion()
  const latestVersion = data.version || ''
  const hasUpdate = compareVersions(currentVersion, latestVersion) > 0

  const platformKey = { darwin: 'mac', win32: 'win', linux: 'linux' }[process.platform] || ''
  const downloadUrl = data.downloads?.[platformKey]

  return {
    hasUpdate,
    currentVersion,
    latestVersion,
    releaseDate: data.releaseDate,
    releaseNotes: data.releaseNotes,
    downloadUrl
  }
}

export async function checkForUpdate(updateSource: string): Promise<CheckUpdateResult> {
  const currentVersion = app.getVersion()

  if (!updateSource) {
    return { hasUpdate: false, currentVersion, error: '未配置更新源，请填写 GitHub 仓库地址（如 owner/repo）' }
  }

  try {
    const url = buildApiUrl(updateSource)
    const data = await fetchJson(url)
    return isGitHubApi(url) ? parseGitHubRelease(data) : parseCustomManifest(data)
  } catch (err: any) {
    return { hasUpdate: false, currentVersion, error: err.message || '检查失败' }
  }
}

export function showUpdateDialog(parentWindow: BrowserWindow | null, result: CheckUpdateResult): void {
  if (result.error) {
    dialog.showMessageBox({
      type: 'info',
      title: '检查更新',
      message: `当前版本：${result.currentVersion}`,
      detail: result.error.includes('未配置')
        ? '请在 设置 → 检查更新 中配置 GitHub 仓库地址后再试。'
        : `检查失败：${result.error}`,
      buttons: ['确定']
    })
    return
  }

  if (!result.hasUpdate) {
    dialog.showMessageBox({
      type: 'info',
      title: '检查更新',
      message: '当前已是最新版本',
      detail: `版本号：${result.currentVersion}`,
      buttons: ['确定']
    })
    return
  }

  const detail = [
    `最新版本：${result.latestVersion}`,
    result.releaseDate ? `发布日期：${result.releaseDate}` : '',
    result.releaseNotes ? `\n更新说明：\n${result.releaseNotes}` : ''
  ].filter(Boolean).join('\n')

  const downloadTarget = result.downloadUrl || result.htmlUrl
  const buttons = downloadTarget ? ['前往下载', '稍后再说'] : ['确定']

  dialog.showMessageBox({
    type: 'info',
    title: '发现新版本',
    message: `发现新版本 ${result.latestVersion}（当前 ${result.currentVersion}）`,
    detail,
    buttons
  }).then(({ response }) => {
    if (response === 0 && downloadTarget) {
      shell.openExternal(downloadTarget)
    }
  })
}

export function registerUpdaterIpc(): void {
  ipcMain.handle('app:checkUpdate', async () => {
    return checkForUpdate(UPDATE_REPO)
  })
}
