<template>
  <div class="app" :style="{ '--tc': themeColor, '--fs': fontSize + 'px' }">
    <router-view />
    <Toast ref="toastRef" />
    <ConfirmModal ref="confirmRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, provide, onMounted, watch } from 'vue'
import Toast from './components/Toast.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import api from './api'

const toastRef = ref()
const confirmRef = ref()
const themeColor = ref('#02af6a')
const fontSize = ref(14)
const siteName = ref('MojiDocs')
const footerText = ref('Copyright © 2018~2025. opqnext All rights reserved.')
const markdownTheme = ref('default')

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

watch(fontSize, (val) => {
  document.documentElement.style.setProperty('--fs', val + 'px')
}, { immediate: true })

onMounted(loadSettings)
</script>
