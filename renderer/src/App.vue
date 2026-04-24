<template>
  <div class="app" :style="{ '--tc': themeColor, '--fs': fontSize + 'px' }">
    <router-view />
    <Toast ref="toastRef" />
    <ConfirmModal ref="confirmRef" />

    <!-- 更新弹窗 -->
    <div v-if="showUpdateModal" class="update-modal-overlay" @click="showUpdateModal = false">
      <div class="update-modal" @click.stop>
        <div class="update-modal-header">
          <h3>发现新版本</h3>
          <button class="update-modal-close" @click="showUpdateModal = false">&times;</button>
        </div>
        <div class="update-modal-body">
          <div class="update-modal-info">
            <span>当前版本：{{ updateInfo.currentVersion }}</span>
            <span style="margin-left: 16px; color: #e74c3c; font-weight: 600;">最新版本：{{ updateInfo.latestVersion }}</span>
          </div>
          <div v-if="updateInfo.releaseDate" class="update-modal-info" style="margin-top: 4px;">
            发布日期：{{ updateInfo.releaseDate }}
          </div>
          <div v-if="updateInfo.releaseNotes" class="update-modal-notes">{{ updateInfo.releaseNotes }}</div>
        </div>
        <div class="update-modal-footer">
          <button v-if="updateInfo.downloadUrl" class="btn btn-primary" @click="openUpdateUrl(updateInfo.downloadUrl)">下载安装包</button>
          <button v-if="updateInfo.htmlUrl" class="btn" @click="openUpdateUrl(updateInfo.htmlUrl)">查看 Release</button>
          <button class="btn" @click="showUpdateModal = false">稍后再说</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, provide, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import Toast from './components/Toast.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import api from './api'

const router = useRouter()

const toastRef = ref()
const confirmRef = ref()
const themeColor = ref('#02af6a')
const fontSize = ref(14)
const siteName = ref('MojiDocs')
const footerText = ref('Copyright © 2018~2025. opqnext All rights reserved.')
const markdownTheme = ref('default')

const showUpdateModal = ref(false)
const updateInfo = ref<any>({})

provide('toast', (msg: string, type?: string) => toastRef.value?.show(msg, type))
provide('confirm', (msg: string) => confirmRef.value?.show(msg))
provide('siteName', siteName)
provide('footerText', footerText)
provide('themeColor', themeColor)
provide('markdownTheme', markdownTheme)

async function loadSettings() {
  try {
    const s = await api.getSettings()
    if (s.theme_color) themeColor.value = s.theme_color
    if (s.font_size) fontSize.value = Number(s.font_size) || 14
    if (s.site_name) siteName.value = s.site_name
    if (s.footer_text) footerText.value = s.footer_text
    if (s.markdown_theme) markdownTheme.value = s.markdown_theme
  } catch {}
}

provide('reloadSettings', loadSettings)

function openUpdateUrl(url: string) {
  window.open(url, '_blank')
  showUpdateModal.value = false
}

let removeNavigateListener: (() => void) | null = null
let removeUpdateListener: (() => void) | null = null

watch(themeColor, (val) => {
  document.documentElement.style.setProperty('--tc', val)
}, { immediate: true })

watch(fontSize, (val) => {
  document.documentElement.style.setProperty('--fs', val + 'px')
}, { immediate: true })

onMounted(() => {
  loadSettings()
  removeNavigateListener = window.mojiApi.on('navigate', (path: string) => {
    router.push(path)
  })
  removeUpdateListener = window.mojiApi.on('show-update', (result: any) => {
    if (result && result.hasUpdate) {
      updateInfo.value = result
      showUpdateModal.value = true
    } else if (result && !result.hasUpdate && !result.error) {
      toastRef.value?.show('当前已是最新版本')
    } else if (result && result.error) {
      toastRef.value?.show(result.error, 'error')
    }
  })
})

onBeforeUnmount(() => {
  removeNavigateListener?.()
  removeUpdateListener?.()
})
</script>

<style>
.update-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.update-modal {
  background: #fff;
  border-radius: 12px;
  width: 520px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}
.update-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
}
.update-modal-header h3 { margin: 0; font-size: 16px; }
.update-modal-close {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: #999;
  line-height: 1;
}
.update-modal-close:hover { color: #333; }
.update-modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}
.update-modal-info { font-size: 13px; color: #666; }
.update-modal-notes {
  margin-top: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 13px;
  color: #555;
  white-space: pre-wrap;
  line-height: 1.6;
  max-height: 400px;
  overflow-y: auto;
}
.update-modal-footer {
  padding: 12px 20px;
  border-top: 1px solid #e8e8e8;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
</style>
