<template>
  <div class="page-editor">
    <!-- Top bar -->
    <div class="editor-header">
      <button class="back-btn" @click="goBackWithSave" title="返回">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <input
        ref="titleInput"
        class="title-input"
        v-model="title"
        placeholder="文档标题"
        @keydown.enter="saveDoc"
      />
      <div class="editor-header-actions">
        <span v-if="saveStatus" class="save-status" :class="saveStatus">{{ saveStatusText }}</span>
        <button class="btn btn-primary" @click="saveDoc()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          保存
        </button>
        <button class="btn" :class="{ 'btn-primary': previewMode }" @click="togglePreview">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          {{ previewMode ? '编辑' : '预览' }}
        </button>
        <button class="btn" @click="goBackWithSave">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          退出
        </button>
      </div>
    </div>

    <!-- Hidden fields -->
    <div class="editor-meta" style="display: none;">
      <input v-model="tags" placeholder="标签" />
    </div>

    <!-- Toolbar -->
    <div class="toolbar" v-show="!previewMode">
      <button class="tool-btn" title="加粗" @click="insertMd('**', '**')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
      </button>
      <button class="tool-btn" title="斜体" @click="insertMd('*', '*')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
      </button>
      <button class="tool-btn" title="标题" @click="insertMd('\n## ', '')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17 12l3-2v8"/></svg>
      </button>
      <span class="tool-sep"></span>
      <button class="tool-btn" title="引用" @click="insertMd('\n> ', '')">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
      </button>
      <button class="tool-btn" title="有序列表" @click="insertMd('\n1. ', '')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
      </button>
      <button class="tool-btn" title="无序列表" @click="insertMd('\n- ', '')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      </button>
      <span class="tool-sep"></span>
      <button class="tool-btn" title="链接" @click="insertMd('[', '](url)')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </button>
      <button class="tool-btn" title="图片" @click="insertMd('![alt](url', ')')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </button>
      <button class="tool-btn" title="行内代码" @click="insertMd('`', '`')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
      </button>
      <button class="tool-btn" title="代码块" @click="insertMd('\n```\n', '\n```\n')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M7 8l3 4-3 4"/><line x1="13" y1="16" x2="17" y2="16"/></svg>
      </button>
      <button class="tool-btn" title="表格" @click="insertTable">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
      </button>
      <span class="tool-sep"></span>
      <button class="tool-btn" title="撤销" @click="editorUndo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
      </button>
      <button class="tool-btn" title="重做" @click="editorRedo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      </button>
      <span class="tool-sep"></span>
      <button class="tool-btn" :class="{ active: layout === 'single' }" title="单栏" @click="layout = 'single'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
      </button>
      <button class="tool-btn" :class="{ active: layout === 'double' }" title="双栏" @click="layout = 'double'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
      </button>
    </div>

    <!-- Editor body -->
    <div class="editor-body" :class="{ 'single-column': layout === 'single', 'preview-only': previewMode }">
      <div class="editor-pane" v-show="!previewMode">
        <textarea
          ref="textareaRef"
          v-model="content"
          @input="onContentInput"
          @scroll="syncScroll"
          @paste="handlePaste"
          @keydown="handleKeydown"
          placeholder="开始写作..."
        ></textarea>
      </div>
      <div class="preview-pane" ref="previewRef" v-show="layout === 'double' || previewMode">
        <div class="content-body" v-html="previewHtml"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { renderMarkdown } from '../markdown'
import api from '../api'

const router = useRouter()
const route = useRoute()
const toast = inject<any>('toast')

const title = ref('')
const content = ref('')
const tags = ref('')
const isDirectory = ref(false)
const parentPath = ref('')
const filePath = ref('')
const layout = ref('double')
const previewMode = ref(false)
const previewHtml = ref('')
const textareaRef = ref<HTMLTextAreaElement>()
const previewRef = ref<HTMLElement>()
const titleInput = ref<HTMLInputElement>()
let syncingScroll = false

const saveStatus = ref<'saved' | 'unsaved' | ''>('')
const saveStatusText = ref('')
let autoSaveTimer: any = null
let lastSavedContent = ''
let lastSavedTitle = ''

// Undo/Redo
const undoStack = ref<string[]>([])
const redoStack = ref<string[]>([])
let lastSnapshot = ''
let snapshotTimer: any = null

function takeSnapshot() {
  if (content.value !== lastSnapshot) {
    undoStack.value.push(lastSnapshot)
    if (undoStack.value.length > 50) undoStack.value.shift()
    redoStack.value = []
    lastSnapshot = content.value
  }
}

function editorUndo() {
  if (undoStack.value.length === 0) return
  redoStack.value.push(content.value)
  content.value = undoStack.value.pop()!
  lastSnapshot = content.value
  updatePreview()
}

function editorRedo() {
  if (redoStack.value.length === 0) return
  undoStack.value.push(content.value)
  content.value = redoStack.value.pop()!
  lastSnapshot = content.value
  updatePreview()
}

function updatePreview() {
  previewHtml.value = renderMarkdown(content.value)
}

function onContentInput() {
  updatePreview()
  markUnsaved()
  if (snapshotTimer) clearTimeout(snapshotTimer)
  snapshotTimer = setTimeout(takeSnapshot, 500)
  scheduleAutoSave()
}

function markUnsaved() {
  if (content.value !== lastSavedContent || title.value !== lastSavedTitle) {
    saveStatus.value = 'unsaved'
    saveStatusText.value = '未保存'
  }
}

function scheduleAutoSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    if (title.value.trim() && (content.value !== lastSavedContent || title.value !== lastSavedTitle)) {
      saveDoc(true)
    }
  }, 30000)
}

function togglePreview() {
  previewMode.value = !previewMode.value
  if (previewMode.value) updatePreview()
}

function insertMd(before: string, after: string) {
  const ta = textareaRef.value
  if (!ta) return
  takeSnapshot()
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const selected = content.value.substring(start, end)
  content.value = content.value.substring(0, start) + before + selected + after + content.value.substring(end)
  nextTick(() => {
    ta.focus()
    ta.selectionStart = start + before.length
    ta.selectionEnd = start + before.length + selected.length
    updatePreview()
    markUnsaved()
    scheduleAutoSave()
  })
}

function insertTable() {
  insertMd('\n| 列1 | 列2 | 列3 |\n|------|------|------|\n| ', ' |  |  |\n')
}

function syncScroll() {
  if (syncingScroll) return
  syncingScroll = true
  const ta = textareaRef.value
  const pv = previewRef.value
  if (ta && pv) {
    const ratio = ta.scrollTop / (ta.scrollHeight - ta.clientHeight || 1)
    pv.scrollTop = ratio * (pv.scrollHeight - pv.clientHeight)
  }
  requestAnimationFrame(() => { syncingScroll = false })
}

async function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      e.preventDefault()
      const file = items[i].getAsFile()
      if (!file) return
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1]
        const ext = file.type.split('/')[1] || 'png'
        try {
          const url = await api.uploadImage(base64, ext)
          insertMd(`![image](${url})`, '')
        } catch {
          toast('图片上传失败', 'error')
        }
      }
      reader.readAsDataURL(file)
      break
    }
  }
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    saveDoc()
    return
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    saveDoc()
    return
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    if (e.shiftKey) {
      e.preventDefault()
      editorRedo()
    } else {
      e.preventDefault()
      editorUndo()
    }
    return
  }

  const ta = textareaRef.value
  if (!ta) return

  if (e.key === 'Enter') {
    const pos = ta.selectionStart
    const text = content.value
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1
    const currentLine = text.substring(lineStart, pos)

    const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/)
    const unorderedMatch = currentLine.match(/^(\s*)([-*])\s(.*)$/)

    if (orderedMatch) {
      const [, indent, numStr, body] = orderedMatch
      if (!body.trim()) {
        e.preventDefault()
        takeSnapshot()
        content.value = text.substring(0, lineStart) + text.substring(pos)
        nextTick(() => { ta.selectionStart = ta.selectionEnd = lineStart; updatePreview(); markUnsaved(); scheduleAutoSave() })
      } else {
        e.preventDefault()
        takeSnapshot()
        const nextNum = parseInt(numStr) + 1
        const insert = `\n${indent}${nextNum}. `
        content.value = text.substring(0, pos) + insert + text.substring(pos)
        nextTick(() => { ta.selectionStart = ta.selectionEnd = pos + insert.length; updatePreview(); markUnsaved(); scheduleAutoSave() })
      }
      return
    }

    if (unorderedMatch) {
      const [, indent, marker, body] = unorderedMatch
      if (!body.trim()) {
        e.preventDefault()
        takeSnapshot()
        content.value = text.substring(0, lineStart) + text.substring(pos)
        nextTick(() => { ta.selectionStart = ta.selectionEnd = lineStart; updatePreview(); markUnsaved(); scheduleAutoSave() })
      } else {
        e.preventDefault()
        takeSnapshot()
        const insert = `\n${indent}${marker} `
        content.value = text.substring(0, pos) + insert + text.substring(pos)
        nextTick(() => { ta.selectionStart = ta.selectionEnd = pos + insert.length; updatePreview(); markUnsaved(); scheduleAutoSave() })
      }
      return
    }
  }

  if (e.key === 'Tab') {
    const pos = ta.selectionStart
    const text = content.value
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1
    const currentLine = text.substring(lineStart, text.indexOf('\n', pos) === -1 ? text.length : text.indexOf('\n', pos))

    if (/^\s*([-*]|\d+\.)\s/.test(currentLine)) {
      e.preventDefault()
      takeSnapshot()
      if (e.shiftKey) {
        const dedented = currentLine.replace(/^  /, '')
        if (dedented !== currentLine) {
          content.value = text.substring(0, lineStart) + dedented + text.substring(lineStart + currentLine.length)
          nextTick(() => { ta.selectionStart = ta.selectionEnd = Math.max(lineStart, pos - 2); updatePreview(); markUnsaved(); scheduleAutoSave() })
        }
      } else {
        content.value = text.substring(0, lineStart) + '  ' + text.substring(lineStart)
        nextTick(() => { ta.selectionStart = ta.selectionEnd = pos + 2; updatePreview(); markUnsaved(); scheduleAutoSave() })
      }
      return
    }

    e.preventDefault()
    takeSnapshot()
    content.value = text.substring(0, pos) + '  ' + text.substring(pos)
    nextTick(() => { ta.selectionStart = ta.selectionEnd = pos + 2; updatePreview(); markUnsaved(); scheduleAutoSave() })
  }
}

let isSaving = false
let isNavigating = false

async function saveDoc(silent = false) {
  if (isSaving || isNavigating) return
  if (!title.value.trim()) {
    if (!silent) toast('请输入标题', 'warning')
    return
  }
  isSaving = true
  const html = renderMarkdown(content.value)
  try {
    const resultPath = await api.saveDoc({
      file_path: filePath.value || undefined,
      title: title.value,
      content: content.value,
      content_html: html,
      tags: tags.value,
      is_directory: isDirectory.value,
      parent_path: parentPath.value
    })
    filePath.value = resultPath
    lastSavedContent = content.value
    lastSavedTitle = title.value
    saveStatus.value = 'saved'
    saveStatusText.value = '已保存'
    if (!silent) {
      toast('保存成功')
      isNavigating = true
      router.push('/doc/' + encodeURIComponent(resultPath))
    }
  } catch (e: any) {
    if (!silent) toast(e.message || '保存失败', 'error')
  }
  isSaving = false
}

async function goBackWithSave() {
  if (isNavigating) return
  isNavigating = true
  if (title.value.trim() && (content.value !== lastSavedContent || title.value !== lastSavedTitle)) {
    await saveDoc(true)
  }
  if (filePath.value) {
    router.push('/doc/' + encodeURIComponent(filePath.value))
  } else {
    router.push('/')
  }
}

function handleBeforeUnload() {
  if (title.value.trim() && (content.value !== lastSavedContent || title.value !== lastSavedTitle)) {
    saveDoc(true)
  }
}

onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    filePath.value = decodeURIComponent(id)
    const detail = await api.getDetail(filePath.value)
    if (detail) {
      title.value = detail.doc.title
      content.value = detail.doc.content || ''
      tags.value = detail.doc.tags || ''
      isDirectory.value = !!detail.doc.is_directory
      parentPath.value = detail.doc.parent_path || ''
      lastSavedContent = content.value
      lastSavedTitle = title.value
      lastSnapshot = content.value
      updatePreview()
    }
  } else {
    parentPath.value = route.query.parent_path as string || ''
    isDirectory.value = route.query.is_directory === 'true'
    lastSnapshot = ''
  }

  nextTick(() => titleInput.value?.focus())
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  if (snapshotTimer) clearTimeout(snapshotTimer)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  handleBeforeUnload()
})
</script>

<style scoped>
.page-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fff;
}
.editor-header {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid #e8e8e8;
  gap: 12px;
}
.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
  color: #555;
  flex-shrink: 0;
  transition: all 0.15s;
}
.back-btn:hover { background: #f0f0f0; color: var(--tc); }
.title-input {
  flex: 1;
  font-size: 18px;
  border: none;
  outline: none;
  font-weight: 600;
  padding: 4px 0;
}
.editor-header-actions { display: flex; gap: 8px; align-items: center; }

.save-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}
.save-status.saved { color: #27ae60; }
.save-status.unsaved { color: #f39c12; }

.toolbar {
  display: flex;
  align-items: center;
  padding: 6px 24px;
  border-bottom: 1px solid #e8e8e8;
  gap: 2px;
  background: #fafafa;
}
.tool-btn {
  width: 30px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  transition: all 0.1s;
}
.tool-btn:hover { background: #e8e8e8; color: #333; }
.tool-btn.active { background: #ddd; }
.tool-btn svg { width: 16px; height: 16px; }
.tool-sep { width: 1px; height: 20px; background: #e0e0e0; margin: 0 4px; }

.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.editor-pane {
  flex: 1;
  display: flex;
  border-right: 1px solid #e8e8e8;
}
.editor-pane textarea {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  resize: none;
  padding: 20px 24px;
  font-size: var(--fs, 14px);
  font-family: "SF Mono", "Monaco", "Menlo", monospace;
  line-height: 1.7;
}
.preview-pane {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}
.single-column .preview-pane { display: none; }
.single-column .editor-pane { border-right: none; }
.preview-only .editor-pane { display: none; }
.preview-only .preview-pane { flex: 1; }
</style>
