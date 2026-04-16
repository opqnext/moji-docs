<template>
  <div v-if="!hidden" class="sync-status" :title="tooltip" @click="doSync">
    <span class="sync-dot" :class="status.state"></span>
    <span class="sync-text">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '../api'

const hidden = ref(true)
const status = ref<{ state: string; pendingCommits: number; lastSyncTime: string; errorMessage: string }>({
  state: 'synced',
  pendingCommits: 0,
  lastSyncTime: '',
  errorMessage: ''
})

const label = computed(() => {
  switch (status.value.state) {
    case 'synced': return '已同步'
    case 'syncing': return '同步中...'
    case 'pending': return `待同步 (${status.value.pendingCommits})`
    case 'error': return '同步失败'
    default: return ''
  }
})

const tooltip = computed(() => {
  if (status.value.errorMessage) return status.value.errorMessage
  if (status.value.lastSyncTime) return `上次同步: ${status.value.lastSyncTime}`
  return '点击手动同步'
})

let unsubscribe: (() => void) | null = null

onMounted(async () => {
  try {
    const settings = await api.getSettings()
    if (!settings.git_url) {
      hidden.value = true
      return
    }
    hidden.value = false
  } catch {
    hidden.value = true
    return
  }

  try {
    const s = await api.gitStatus()
    if (s) status.value = s
  } catch {}

  unsubscribe = api.onSyncStatus((s) => {
    status.value = s
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

async function doSync() {
  if (status.value.state === 'syncing') return
  status.value.state = 'syncing'
  try {
    await api.syncGit()
  } catch {}
}
</script>

<style scoped>
.sync-status {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #888;
  transition: background 0.15s;
}
.sync-status:hover { background: #f0f0f0; }
.sync-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.sync-dot.synced { background: #27ae60; }
.sync-dot.syncing { background: #f39c12; animation: pulse 1s infinite; }
.sync-dot.pending { background: #999; }
.sync-dot.error { background: #e74c3c; }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.sync-text { white-space: nowrap; }
</style>
