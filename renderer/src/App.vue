<template>
  <div class="app" :style="{ '--tc': themeColor }">
    <router-view />
    <Toast ref="toastRef" />
    <ConfirmModal ref="confirmRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, provide, onMounted } from 'vue'
import Toast from './components/Toast.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import api from './api'

const toastRef = ref()
const confirmRef = ref()
const themeColor = ref('#6c5ce7')
const siteName = ref('MojiDocs')
const footerText = ref('Copyright © 2018~2025. opqnext All rights reserved.')

provide('toast', (msg: string, type?: string) => toastRef.value?.show(msg, type))
provide('confirm', (msg: string) => confirmRef.value?.show(msg))
provide('siteName', siteName)
provide('footerText', footerText)
provide('themeColor', themeColor)

async function loadSettings() {
  try {
    const s = await api.getSettings()
    if (s.theme_color) themeColor.value = s.theme_color
    if (s.site_name) siteName.value = s.site_name
    if (s.footer_text) footerText.value = s.footer_text
  } catch {}
}

provide('reloadSettings', loadSettings)

onMounted(loadSettings)
</script>
