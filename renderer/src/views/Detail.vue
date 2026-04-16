<template>
  <div class="page-detail" v-if="detail">
    <header class="header">
      <div class="header-left">
        <span class="logo" @click="$router.push('/')">{{ siteName }}</span>
      </div>
      <div class="header-right">
        <input class="search-input" v-model="searchKey" placeholder="搜索文档..." @input="doSearch" />
        <router-link to="/" class="active">文档</router-link>
        <router-link to="/settings">设置</router-link>
        <SyncStatus />
      </div>
    </header>

    <!-- Search overlay -->
    <div v-if="searchKey && searchResults.length > 0" style="position:absolute;top:52px;left:0;right:0;background:#fff;z-index:100;padding:12px 24px;border-bottom:1px solid #e8e8e8;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
      <div v-for="item in searchResults" :key="item.file_path" class="doc-item" @click="goDoc(item.file_path)">
        <svg class="doc-icon" v-if="item.is_directory" viewBox="0 0 24 24" fill="none" stroke="var(--tc)" stroke-width="1.5"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
        <svg class="doc-icon" v-else viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
        <span class="doc-title">{{ item.title }}</span>
      </div>
    </div>

    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <template v-for="b in detail.breadcrumb" :key="b.file_path">
        <span class="sep">/</span>
        <router-link :to="'/doc/' + encodeURIComponent(b.file_path)">{{ b.title }}</router-link>
      </template>
      <span class="sep">/</span>
      <span style="color: #333;">{{ detail.doc.title }}</span>
    </div>

    <div class="layout">
      <!-- Sidebar -->
      <div
        class="sidebar"
        :class="{ dragover: isDragging }"
        @dragover.prevent="onDragOver"
        @dragleave="onDragLeave"
        @drop.prevent="onDrop"
      >
        <div v-if="isDragging" class="drop-hint">松开以导入 .md 文件</div>
        <div class="sidebar-header">
          <span class="sidebar-title">目录</span>
          <div class="sidebar-new">
            <button class="sidebar-new-btn" @click="showNewMenu = !showNewMenu">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新建
            </button>
            <div v-if="showNewMenu" class="sidebar-new-menu">
              <a @click="createNew(true); showNewMenu = false">新建目录</a>
              <a @click="createNew(false); showNewMenu = false">新建文章</a>
            </div>
          </div>
        </div>
        <div class="sidebar-list">
          <div
            v-for="item in detail.children"
            :key="item.file_path"
            class="doc-item"
            :class="{ active: item.file_path === detail.doc.file_path }"
            @click="goDoc(item.file_path)"
          >
            <svg class="doc-icon" v-if="item.is_directory" viewBox="0 0 24 24" fill="none" stroke="var(--tc)" stroke-width="1.5"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
            <svg class="doc-icon" v-else viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
            <span class="doc-title">{{ item.title }}</span>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="content" ref="contentRef">
        <div class="content-inner">
          <div class="doc-header">
            <h1>{{ detail.doc.title }}</h1>
            <div class="doc-meta">
              <span>{{ detail.doc.updated_at }}</span>
              <div v-if="detail.doc.tags" class="doc-tags">
                <span v-for="tag in detail.doc.tags.split(',')" :key="tag" class="doc-tag">{{ tag.trim() }}</span>
              </div>
              <div class="doc-actions">
                <a class="action-btn" @click="$router.push('/edit/' + encodeURIComponent(detail.doc.file_path))">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  编辑
                </a>
                <button class="action-btn danger" @click="doDelete">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  删除
                </button>
                <div class="more-wrap">
                  <button class="action-btn" @click="showMore = !showMore">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    更多
                  </button>
                  <div v-if="showMore" class="more-menu" @click="showMore = false">
                    <button @click="toggleFullscreen"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg> 全屏</button>
                    <button @click="togglePin"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 L14.5 9 L22 9 L16 13.5 L18 21 L12 16.5 L6 21 L8 13.5 L2 9 L9.5 9 Z"/></svg> {{ detail.doc.is_pinned ? '取消置顶' : '置顶' }}</button>
                    <button @click="openMoveModal"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg> 移动</button>
                    <button @click="showVersions = true; loadVersions()"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 版本</button>
                    <button @click="doExportPdf"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg> 导出 PDF</button>
                    <button @click="doPrint"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 打印</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="content-body" :class="{ 'markdown-body': markdownTheme && markdownTheme.value !== 'default' }" v-html="detail.doc.content_html || renderedHtml"></div>
          <div class="footer">{{ footerText }}</div>
        </div>
      </div>
    </div>

    <!-- Back to top -->
    <div v-if="showBackTop" class="back-top" @click="scrollToTop">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
    </div>

    <!-- Version panel -->
    <template v-if="showVersions">
      <div class="version-overlay" @click="showVersions = false"></div>
      <div class="version-panel">
        <div class="panel-header">
          <h3>版本历史</h3>
          <span class="close-btn" @click="showVersions = false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </span>
        </div>
        <div class="panel-body">
          <div v-if="versions.length === 0" style="color: #999; padding: 20px 0;">暂无历史版本</div>
          <div v-for="v in versions" :key="v.hash" class="version-item">
            <div class="version-meta">{{ v.date }} · {{ v.author }} · {{ v.message }}</div>
            <div class="version-actions">
              <button class="btn btn-sm" @click="previewVersion(v.hash)">预览</button>
              <button class="btn btn-sm" @click="rollbackVersion(v.hash)">回滚</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Version preview modal -->
    <template v-if="versionPreview">
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:200;" @click="versionPreview = null"></div>
      <div style="position:fixed;top:5vh;left:10vw;right:10vw;bottom:5vh;background:#fff;z-index:210;border-radius:8px;overflow-y:auto;padding:24px;">
        <h3 style="margin-bottom:12px;">版本预览</h3>
        <div class="content-body" v-html="versionPreviewHtml"></div>
      </div>
    </template>

    <MoveModal ref="moveRef" />
  </div>
  <div v-else style="padding: 60px; text-align: center; color: #999;">加载中...</div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { renderMarkdown } from '../markdown'
import api from '../api'
import SyncStatus from '../components/SyncStatus.vue'
import MoveModal from '../components/MoveModal.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const route = useRoute()
const siteName = inject<any>('siteName')
const footerText = inject<any>('footerText')
const toast = inject<any>('toast')
const confirm = inject<any>('confirm')
const markdownTheme = inject<any>('markdownTheme')

const detail = ref<any>(null)
const renderedHtml = ref('')
const showMore = ref(false)
const showNewMenu = ref(false)
const showVersions = ref(false)
const versions = ref<any[]>([])
const versionPreview = ref<any>(null)
const versionPreviewHtml = ref('')
const showBackTop = ref(false)
const isDragging = ref(false)
const contentRef = ref<HTMLElement>()
const moveRef = ref()
const searchKey = ref('')
const searchResults = ref<any[]>([])
let searchTimer: any = null

function getFilePath(): string {
  const raw = props.id || (route.params.id as string)
  if (!raw) return ''
  return decodeURIComponent(raw)
}

async function loadDetail() {
  const filePath = getFilePath()
  if (!filePath) { router.push('/'); return }
  renderedHtml.value = ''
  try {
    detail.value = await api.getDetail(filePath)
    if (!detail.value) {
      console.warn('Document not found:', filePath)
      router.push('/')
      return
    }
    if (detail.value.doc.content) {
      renderedHtml.value = renderMarkdown(detail.value.doc.content)
    }
  } catch (e) {
    console.error('Failed to load detail:', filePath, e)
    router.push('/')
  }
}

function goDoc(filePath: string) {
  searchKey.value = ''
  searchResults.value = []
  router.push('/doc/' + encodeURIComponent(filePath))
}

function doSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    if (!searchKey.value.trim()) { searchResults.value = []; return }
    searchResults.value = await api.search(searchKey.value.trim())
  }, 300)
}

async function doDelete() {
  const doc = detail.value.doc
  const msg = doc.is_directory
    ? `确定删除目录「${doc.title}」及其所有子文档？`
    : `确定删除「${doc.title}」？`
  const ok = await confirm(msg)
  if (!ok) return
  await api.deleteDoc(doc.file_path)
  toast('已删除', 'success')
  router.push('/')
}

async function togglePin() {
  const doc = detail.value.doc
  const newVal = !doc.is_pinned
  await api.pinDoc(doc.file_path, newVal)
  doc.is_pinned = newVal
  toast(newVal ? '已置顶' : '已取消置顶')
}

async function openMoveModal() {
  const targetPath = await moveRef.value?.show()
  if (targetPath === null || targetPath === undefined) return
  try {
    const newPath = await api.moveDoc(detail.value.doc.file_path, targetPath)
    toast('移动成功')
    if (newPath) {
      router.replace('/doc/' + encodeURIComponent(newPath))
    }
    loadDetail()
  } catch (e: any) {
    toast(e.message || '移动失败', 'error')
  }
}

async function loadVersions() {
  versions.value = await api.getVersions(detail.value.doc.file_path)
}

async function previewVersion(commitHash: string) {
  const content = await api.getVersionContent(detail.value.doc.file_path, commitHash)
  if (content) {
    versionPreview.value = true
    versionPreviewHtml.value = renderMarkdown(content)
  }
}

async function rollbackVersion(commitHash: string) {
  const ok = await confirm('确定回滚到此版本？')
  if (!ok) return
  await api.rollbackVersion(detail.value.doc.file_path, commitHash)
  toast('回滚成功')
  showVersions.value = false
  loadDetail()
}

async function doExportPdf() {
  const doc = detail.value.doc
  const html = `
    <html><head><meta charset="utf-8"><style>
      body { font-family: sans-serif; padding: 40px; line-height: 1.8; }
      pre { background: #f6f8fa; padding: 12px; border-radius: 6px; overflow-x: auto; }
      code { font-size: 13px; }
      blockquote { border-left: 4px solid var(--tc); padding: 8px 16px; color: #666; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 8px; }
    </style></head><body>
      <h1>${doc.title}</h1>
      ${doc.content_html || renderedHtml.value}
    </body></html>
  `
  const result = await api.exportPdf(html, doc.title)
  if (result) toast('PDF 已保存')
}

function doPrint() { window.print() }

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

function scrollToTop() {
  contentRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

function createNew(isDirectory: boolean) {
  const parentPath = detail.value.parentPath || ''
  router.push(`/edit?parent_path=${encodeURIComponent(parentPath)}&is_directory=${isDirectory}`)
}

// Drag and drop
function onDragOver(e: DragEvent) {
  if (e.dataTransfer?.types.includes('Files')) isDragging.value = true
}
function onDragLeave() { isDragging.value = false }
async function onDrop(e: DragEvent) {
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (!files) return
  const mdFiles: Array<{ name: string; content: string }> = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    if (f.name.endsWith('.md')) {
      const text = await f.text()
      mdFiles.push({ name: f.name, content: text })
    }
  }
  if (mdFiles.length === 0) { toast('请拖放 .md 文件', 'warning'); return }
  const parentPath = detail.value.parentPath || ''
  await api.importMd(mdFiles, parentPath)
  toast(`导入了 ${mdFiles.length} 个文件`)
  loadDetail()
}

function onContentScroll() {
  showBackTop.value = (contentRef.value?.scrollTop || 0) > 300
}

watch(() => route.params.id, () => {
  if (route.params.id) loadDetail()
})

function handleDocClick(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest('.sidebar-new')) {
    showNewMenu.value = false
  }
  if (!(e.target as HTMLElement).closest('.more-wrap')) {
    showMore.value = false
  }
}

let themeLink: HTMLLinkElement | null = null

function loadThemeCss(theme: string) {
  if (themeLink) {
    themeLink.remove()
    themeLink = null
  }
  if (theme && theme !== 'default') {
    themeLink = document.createElement('link')
    themeLink.rel = 'stylesheet'
    themeLink.href = `css/markdown-themes/${theme}.css`
    document.head.appendChild(themeLink)
  }
}

watch(() => markdownTheme?.value, (val) => {
  loadThemeCss(val || 'default')
}, { immediate: true })

watch(detail, (val) => {
  if (val) {
    nextTick(() => {
      contentRef.value?.addEventListener('scroll', onContentScroll)
    })
  }
})

onMounted(() => {
  loadDetail()
  document.addEventListener('click', handleDocClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocClick)
  if (themeLink) {
    themeLink.remove()
    themeLink = null
  }
})
</script>

<style scoped>
.page-detail {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
.layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.sidebar {
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid #f0f0f0;
  background: #fafbfc;
  padding: 16px 12px;
  overflow-y: auto;
  height: 100%;
  position: relative;
}
.sidebar.dragover { background: #f8f7ff; border-right-color: var(--tc); }
.sidebar .drop-hint { display: none; text-align: center; font-size: 11px; color: var(--tc); padding: 10px 0; }
.sidebar.dragover .drop-hint { display: block; }
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.sidebar-title { font-size: 12px; color: #999; font-weight: 600; letter-spacing: 0.5px; }
.sidebar-new { position: relative; }
.sidebar-new-btn {
  background: none;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11px;
  color: var(--tc);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 3px;
}
.sidebar-new-btn:hover { background: color-mix(in srgb, var(--tc) 10%, transparent); }
.sidebar-new-menu {
  position: absolute;
  top: 28px;
  right: 0;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  z-index: 50;
  min-width: 120px;
}
.sidebar-new-menu a {
  display: block;
  padding: 8px 12px;
  font-size: 12px;
  color: #555;
  text-decoration: none;
  cursor: pointer;
}
.sidebar-new-menu a:hover { background: #f8f7ff; color: var(--tc); }
.sidebar-list {
  flex: 1;
}
.content {
  flex: 1;
  overflow-y: auto;
  height: 100%;
  background: #fff;
}
.content-inner {
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.doc-header { margin-bottom: 20px; }
.doc-header h1 { font-size: 24px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
.doc-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: #999;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.doc-tags { display: flex; gap: 6px; }
.doc-tag {
  background: color-mix(in srgb, var(--tc) 10%, transparent);
  color: var(--tc);
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
}
.doc-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}
.action-btn {
  font-size: 12px;
  color: #666;
  text-decoration: none;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 4px 12px;
  cursor: pointer;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  white-space: nowrap;
}
.action-btn:hover { border-color: var(--tc); color: var(--tc); }
.action-btn.danger:hover { border-color: #e74c3c; color: #e74c3c; }
.more-wrap { position: relative; }
.more-menu {
  display: block;
  position: absolute;
  right: 0;
  top: 32px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 50;
  min-width: 130px;
  padding: 4px 0;
}
.more-menu button {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 14px;
  font-size: 12px;
  color: #555;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}
.more-menu button:hover { background: #f8f7ff; color: var(--tc); }

@media print {
  .header, .breadcrumb, .sidebar, .doc-actions, .back-top, .footer, .more-menu { display: none !important; }
  .layout { display: block !important; }
  .content { overflow: visible !important; height: auto !important; padding: 0 !important; }
}
</style>
