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

let failureCount = 0
let lastFailureTime = 0
const MAX_RETRY_FAILURES = 3
const BASE_BACKOFF_MS = 60 * 1000
const MAX_BACKOFF_MS = 30 * 60 * 1000
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
  if (currentStatus.state !== 'syncing') {
    updateState('pending', { pendingDocs: pendingFiles.size })
  }
}

export function markSynced(): void {
  failureCount = 0
  pendingFiles.clear()
  updateState('synced', {
    pendingDocs: 0,
    lastSyncTime: localTimeString(),
    errorMessage: ''
  })
}

export function markError(message: string): void {
  failureCount++
  lastFailureTime = Date.now()
  updateState('error', { errorMessage: message })
}

export function shouldRetry(): boolean {
  if (failureCount === 0) return true
  if (failureCount >= MAX_RETRY_FAILURES) {
    const backoff = Math.min(
      BASE_BACKOFF_MS * Math.pow(2, failureCount - MAX_RETRY_FAILURES),
      MAX_BACKOFF_MS
    )
    return (Date.now() - lastFailureTime) >= backoff
  }
  return true
}

export function resetFailures(): void {
  failureCount = 0
  lastFailureTime = 0
}

export function hasPending(): boolean {
  return pendingFiles.size > 0
}

function broadcastStatus(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('sync:statusUpdate', currentStatus)
  }
}
