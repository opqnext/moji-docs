import { BrowserWindow } from 'electron'

export type SyncState = 'synced' | 'syncing' | 'pending' | 'error'

export interface SyncStatus {
  state: SyncState
  pendingDocs: number
  lastSyncTime: string
  errorMessage: string
}

let currentStatus: SyncStatus = {
  state: 'synced',
  pendingDocs: 0,
  lastSyncTime: '',
  errorMessage: ''
}

const pendingFiles = new Set<string>()

export function getStatus(): SyncStatus {
  return { ...currentStatus }
}

export function updateState(state: SyncState, extra?: Partial<SyncStatus>): void {
  currentStatus = { ...currentStatus, state, ...extra }
  broadcastStatus()
}

function localTimeString(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function markPending(filePath: string): void {
  pendingFiles.add(filePath)
  if (currentStatus.state !== 'syncing' && currentStatus.state !== 'error') {
    updateState('pending', { pendingDocs: pendingFiles.size })
  }
}

export function markSynced(): void {
  pendingFiles.clear()
  updateState('synced', {
    pendingDocs: 0,
    lastSyncTime: localTimeString(),
    errorMessage: ''
  })
}

export function markError(message: string): void {
  updateState('error', { errorMessage: message })
}

export function hasPending(): boolean {
  return pendingFiles.size > 0
}

function broadcastStatus(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('sync:statusUpdate', currentStatus)
  }
}
