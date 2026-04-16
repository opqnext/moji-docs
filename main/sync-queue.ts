import { BrowserWindow } from 'electron'

export type SyncState = 'synced' | 'syncing' | 'pending' | 'error'

export interface SyncStatus {
  state: SyncState
  pendingCommits: number
  lastSyncTime: string
  errorMessage: string
}

let currentStatus: SyncStatus = {
  state: 'synced',
  pendingCommits: 0,
  lastSyncTime: '',
  errorMessage: ''
}

let commitDebounceTimer: ReturnType<typeof setTimeout> | null = null
let failureCount = 0
const MAX_RETRY_FAILURES = 3

export function getStatus(): SyncStatus {
  return { ...currentStatus }
}

export function updateState(state: SyncState, extra?: Partial<SyncStatus>): void {
  currentStatus = { ...currentStatus, state, ...extra }
  broadcastStatus()
}

export function markSynced(): void {
  failureCount = 0
  updateState('synced', {
    pendingCommits: 0,
    lastSyncTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
    errorMessage: ''
  })
}

export function markError(message: string): void {
  failureCount++
  updateState('error', { errorMessage: message })
}

export function incrementPending(): void {
  currentStatus.pendingCommits++
  if (currentStatus.state !== 'syncing') {
    updateState('pending')
  }
}

export function shouldRetry(): boolean {
  return failureCount < MAX_RETRY_FAILURES
}

export function resetFailures(): void {
  failureCount = 0
}

export function scheduleCommit(commitFn: () => Promise<void>, delayMs = 5000): void {
  if (commitDebounceTimer) clearTimeout(commitDebounceTimer)
  incrementPending()
  commitDebounceTimer = setTimeout(async () => {
    try {
      await commitFn()
    } catch (e: any) {
      markError(e.message || 'Commit failed')
    }
  }, delayMs)
}

function broadcastStatus(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('sync:statusUpdate', currentStatus)
  }
}
