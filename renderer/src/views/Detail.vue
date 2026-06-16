<template>
  <div class="page-detail" v-if="detail">
    <header class="header">
      <div class="header-left">
        <span class="logo" @click="$router.push('/')">{{ siteName }}</span>
      </div>
      <div class="header-right">
        <input class="search-input" v-model="headerSearchKey" placeholder="搜索文档..." @keydown.enter="openSearchWithKey" />
        <router-link to="/" class="active">文档</router-link>
        <router-link to="/settings">设置</router-link>
        <SyncStatus />
      </div>
    </header>

    <SearchOverlay v-model:visible="showSearch" :initial-keyword="headerSearchKey" @select="onSearchSelect" />

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
            <span class="doc-title" :title="item.title">{{ item.title }}</span>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="content" ref="contentRef">
        <div class="content-inner">
          <div class="doc-header">
            <h1>{{ detail.doc.title }}</h1>
            <div class="doc-meta">
              <span>更新于 {{ detail.doc.updated_at }}</span>
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
          <div class="content-body" ref="contentBodyRef" :class="{ 'markdown-body': markdownTheme && markdownTheme.value !== 'default' }" v-html="detail.doc.content_html || renderedHtml" @contextmenu="imgMenu.onContextMenu"></div>
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

    <!-- Find in page bar -->
    <div v-if="findBarVisible" class="find-bar">
      <input
        ref="findInputRef"
        v-model="findText"
        class="find-input"
        placeholder="搜索本页内容..."
        @input="doFindInPage"
        @keydown.enter.exact="doFindNext"
        @keydown.enter.shift="doFindPrev"
        @keydown.escape="closeFindBar"
      />
      <span class="find-count" v-if="findText">{{ findMatchInfo }}</span>
      <button class="find-nav-btn" @click="doFindPrev" title="上一个 (Shift+Enter)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
      </button>
      <button class="find-nav-btn" @click="doFindNext" title="下一个 (Enter)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <button class="find-nav-btn" @click="closeFindBar" title="关闭 (Esc)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <!-- Image context menu -->
    <div v-if="imgMenu.menuVisible.value" class="image-ctx-menu" :style="{ left: imgMenu.menuX.value + 'px', top: imgMenu.menuY.value + 'px' }">
      <button class="ctx-item" @click="imgMenu.copyImage()">复制图片</button>
      <button class="ctx-item" @click="imgMenu.saveImageAs()">图片另存为</button>
    </div>
  </div>
  <div v-else style="padding: 60px; text-align: center; color: #999;">加载中...</div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { renderMarkdown } from '../markdown'
import api from '../api'
import SyncStatus from '../components/SyncStatus.vue'
import MoveModal from '../components/MoveModal.vue'
import SearchOverlay from '../components/SearchOverlay.vue'
import { useImageContextMenu } from '../composables/useImageContextMenu'

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
const contentBodyRef = ref<HTMLElement>()
const moveRef = ref()
const showSearch = ref(false)
const headerSearchKey = ref('')

function openSearchWithKey() {
  if (headerSearchKey.value.trim()) {
    showSearch.value = true
  }
}

const imgMenu = useImageContextMenu({
  containerRef: () => contentBodyRef.value,
  toast,
  showSaveAs: true
})

function getFilePath(): string {
  const raw = props.id || (route.params.id as string)
  if (!raw) return ''
  return decodeURIComponent(raw)
}

let loadVersion = 0

async function loadDetail() {
  const filePath = getFilePath()
  if (!filePath) { router.push('/'); return }
  const currentVersion = ++loadVersion
  renderedHtml.value = ''
  try {
    const result = await api.getDetail(filePath)
    if (currentVersion !== loadVersion) return
    if (!result) {
      console.warn('Document not found:', filePath)
      router.push('/')
      return
    }
    detail.value = result
    if (result.doc.content) {
      renderedHtml.value = renderMarkdown(result.doc.content)
    }
  } catch (e) {
    if (currentVersion !== loadVersion) return
    console.error('Failed to load detail:', filePath, e)
    router.push('/')
  }
}

function goDoc(filePath: string) {
  router.push('/doc/' + encodeURIComponent(filePath))
}

function onSearchSelect(filePath: string) {
  headerSearchKey.value = ''
  router.push('/doc/' + encodeURIComponent(filePath))
}

watch(showSearch, (val) => {
  if (!val) headerSearchKey.value = ''
})

async function doDelete() {
  const doc = detail.value.doc
  const msg = doc.is_directory
    ? `确定删除目录「${doc.title}」及其所有子文档？`
    : `确定删除「${doc.title}」？`
  const ok = await confirm(msg)
  if (!ok) return
  const breadcrumb = detail.value.breadcrumb
  try {
    await api.deleteDoc(doc.file_path)
    toast('已删除', 'success')
    if (breadcrumb && breadcrumb.length > 0) {
      const parent = breadcrumb[breadcrumb.length - 1]
      router.push('/doc/' + encodeURIComponent(parent.file_path))
    } else {
      router.push('/')
    }
  } catch (e: any) {
    toast(e.message || '删除失败', 'error')
  }
}

async function togglePin() {
  const doc = detail.value.doc
  const newVal = !doc.is_pinned
  try {
    await api.pinDoc(doc.file_path, newVal)
    doc.is_pinned = newVal
    toast(newVal ? '已置顶' : '已取消置顶')
  } catch (e: any) {
    toast(e.message || '操作失败', 'error')
  }
}

async function openMoveModal() {
  const targetPath = await moveRef.value?.show(detail.value.doc.file_path)
  if (targetPath === null || targetPath === undefined) return
  try {
    const newPath = await api.moveDoc(detail.value.doc.file_path, targetPath)
    toast('移动成功')
    if (newPath) {
      await router.replace('/doc/' + encodeURIComponent(newPath))
    }
  } catch (e: any) {
    toast(e.message || '移动失败', 'error')
  }
}

async function loadVersions() {
  try {
    versions.value = await api.getVersions(detail.value.doc.file_path)
  } catch (e: any) {
    toast(e.message || '加载版本失败', 'error')
    versions.value = []
  }
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
  try {
    await api.rollbackVersion(detail.value.doc.file_path, commitHash)
    toast('回滚成功')
    showVersions.value = false
    loadDetail()
  } catch (e: any) {
    toast(e.message || '回滚失败', 'error')
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
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
      <h1>${escapeHtml(doc.title)}</h1>
      ${doc.content_html || renderedHtml.value}
    </body></html>
  `
  try {
    const result = await api.exportPdf(html, doc.title)
    if (result) toast('PDF 已保存')
  } catch (e: any) {
    toast(e.message || '导出失败', 'error')
  }
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
  const results = await api.importMd(mdFiles, parentPath)
  const renamedCount = Array.isArray(results) ? results.filter((r: any) => r.renamed).length : 0
  if (renamedCount > 0) {
    toast(`导入完成，其中 ${renamedCount} 个文件因同名已自动重命名`)
  } else {
    toast(`导入了 ${mdFiles.length} 个文件`)
  }
  loadDetail()
}

let scrollRafId = 0

function onContentScroll() {
  if (scrollRafId) return
  scrollRafId = requestAnimationFrame(() => {
    scrollRafId = 0
    showBackTop.value = (contentRef.value?.scrollTop || 0) > 300
  })
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

function injectCopyButtons(container: HTMLElement) {
  container.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.code-copy-btn')) return
    const btn = document.createElement('button')
    btn.className = 'code-copy-btn'
    btn.textContent = '复制'
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(pre.textContent || '')
      btn.textContent = '已复制'
      setTimeout(() => btn.textContent = '复制', 1500)
    })
    pre.appendChild(btn)
  })
}

let scrollCleanup: (() => void) | null = null

watch(detail, (val) => {
  if (scrollCleanup) {
    scrollCleanup()
    scrollCleanup = null
  }
  if (val) {
    nextTick(() => {
      const el = contentRef.value
      if (el) {
        el.addEventListener('scroll', onContentScroll, { passive: true })
        scrollCleanup = () => el.removeEventListener('scroll', onContentScroll)
      }
      const body = el?.querySelector('.content-body')
      if (body) injectCopyButtons(body as HTMLElement)
    })
  }
})

watch(renderedHtml, () => {
  nextTick(() => {
    const body = contentRef.value?.querySelector('.content-body')
    if (body) injectCopyButtons(body as HTMLElement)
  })
})

// Find in page (mark.js)
import Mark from 'mark.js'

const findBarVisible = ref(false)
const findText = ref('')
const findInputRef = ref<HTMLInputElement>()
const findActiveMatch = ref(0)
const findTotalMatches = ref(0)
let markInstance: Mark | null = null

const findMatchInfo = computed(() => {
  if (!findText.value) return ''
  if (findTotalMatches.value === 0) return '无匹配'
  return `${findActiveMatch.value} / ${findTotalMatches.value}`
})

function openFindBar() {
  findBarVisible.value = true
  nextTick(() => {
    findInputRef.value?.focus()
    findInputRef.value?.select()
  })
}

function closeFindBar() {
  findBarVisible.value = false
  findText.value = ''
  findActiveMatch.value = 0
  findTotalMatches.value = 0
  clearMarks()
}

function clearMarks() {
  if (markInstance) markInstance.unmark()
}

function doFindInPage() {
  clearMarks()
  if (!findText.value || !contentBodyRef.value) {
    findActiveMatch.value = 0
    findTotalMatches.value = 0
    return
  }

  markInstance = new Mark(contentBodyRef.value)
  markInstance.mark(findText.value, {
    separateWordSearch: false,
    done(count) {
      findTotalMatches.value = count
      if (count > 0) {
        findActiveMatch.value = 1
        scrollToMark(0)
      } else {
        findActiveMatch.value = 0
      }
    }
  })
}

function scrollToMark(index: number) {
  const marks = contentBodyRef.value?.querySelectorAll('mark')
  if (!marks || marks.length === 0) return

  marks.forEach(m => m.classList.remove('find-current'))
  const target = marks[index]
  if (target) {
    target.classList.add('find-current')
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

function doFindNext() {
  if (findTotalMatches.value === 0) return
  findActiveMatch.value = findActiveMatch.value >= findTotalMatches.value ? 1 : findActiveMatch.value + 1
  scrollToMark(findActiveMatch.value - 1)
}

function doFindPrev() {
  if (findTotalMatches.value === 0) return
  findActiveMatch.value = findActiveMatch.value <= 1 ? findTotalMatches.value : findActiveMatch.value - 1
  scrollToMark(findActiveMatch.value - 1)
}

function handleFindShortcut(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
    e.preventDefault()
    openFindBar()
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    showSearch.value = true
  }
}

onMounted(() => {
  loadDetail()
  document.addEventListener('click', handleDocClick)
  document.addEventListener('keydown', handleFindShortcut)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocClick)
  document.removeEventListener('keydown', handleFindShortcut)
  clearMarks()
  if (scrollCleanup) {
    scrollCleanup()
    scrollCleanup = null
  }
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

.find-bar {
  position: fixed;
  top: 52px;
  right: 24px;
  z-index: 150;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 6px 10px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}
.content-body :deep(mark) {
  background: #fff3a8;
  color: inherit;
  padding: 1px 0;
  border-radius: 2px;
}
.content-body :deep(mark.find-current) {
  background: #ff9632;
  color: #fff;
}
.find-input {
  border: none;
  outline: none;
  font-size: 13px;
  width: 200px;
  padding: 4px 8px;
  background: #f8f9fa;
  border-radius: 4px;
}
.find-count {
  font-size: 11px;
  color: #999;
  white-space: nowrap;
  min-width: 50px;
  text-align: center;
}
.find-nav-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: #666;
  display: flex;
  align-items: center;
}
.find-nav-btn:hover { background: #f0f0f0; color: var(--tc); }

@media print {
  .header, .breadcrumb, .sidebar, .doc-actions, .back-top, .footer, .more-menu, .find-bar { display: none !important; }
  .layout { display: block !important; }
  .content { overflow: visible !important; height: auto !important; padding: 0 !important; }
}
</style>
