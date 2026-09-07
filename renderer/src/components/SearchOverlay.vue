<template>
  <Teleport to="body">
    <div v-if="visible" class="search-overlay" @click.self="close">
      <div class="search-panel">
        <div class="search-panel-header">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref="inputRef"
            v-model="keyword"
            class="search-panel-input"
            placeholder="搜索文档..."
            @input="onInput"
            @keydown.escape="close"
            @keydown.down.prevent="moveDown"
            @keydown.up.prevent="moveUp"
            @keydown.enter.prevent="selectCurrent"
          />
          <kbd class="search-kbd" @click="close">Esc</kbd>
        </div>

        <div v-if="keyword && results.length > 0" class="search-panel-results">
          <div
            v-for="(item, idx) in results"
            :key="item.file_path"
            class="search-item"
            :class="{ active: idx === activeIndex }"
            @click="select(item)"
            @mouseenter="activeIndex = idx"
          >
            <div class="search-item-header">
              <svg class="search-item-icon" v-if="item.is_directory" viewBox="0 0 24 24" fill="none" stroke="var(--tc)" stroke-width="1.5"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
              <svg class="search-item-icon" v-else viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
              <span class="search-item-title" v-html="highlight(item.title_hl || item.title)"></span>
              <span class="search-item-time">{{ formatTime(item.updated_at) }}</span>
            </div>
            <div v-if="item.content_snippet" class="search-item-snippet" v-html="highlight(item.content_snippet)"></div>
          </div>
        </div>

        <div v-else-if="keyword && results.length === 0 && !loading" class="search-panel-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="1"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <p>未找到匹配文档</p>
        </div>

        <div v-else-if="!keyword" class="search-panel-hint">
          <p>输入关键词搜索文档标题和内容</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import api from '../api'

const props = defineProps<{ visible: boolean; initialKeyword?: string }>()
const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'select', filePath: string): void
}>()

const inputRef = ref<HTMLInputElement>()
const keyword = ref('')
const results = ref<any[]>([])
const activeIndex = ref(0)
const loading = ref(false)
let searchTimer: any = null

watch(() => props.visible, (val) => {
  if (val) {
    if (props.initialKeyword) {
      keyword.value = props.initialKeyword
      doSearch()
    }
    nextTick(() => {
      inputRef.value?.focus()
      inputRef.value?.select()
    })
  } else {
    keyword.value = ''
    results.value = []
    activeIndex.value = 0
  }
})

async function doSearch() {
  if (!keyword.value.trim()) {
    results.value = []
    return
  }
  loading.value = true
  try {
    results.value = await api.search(keyword.value.trim())
  } catch {
    results.value = []
  }
  loading.value = false
  activeIndex.value = 0
}

function close() {
  emit('update:visible', false)
}

function onInput() {
  if (searchTimer) clearTimeout(searchTimer)
  activeIndex.value = 0
  if (!keyword.value.trim()) {
    results.value = []
    return
  }
  loading.value = true
  searchTimer = setTimeout(async () => {
    try {
      results.value = await api.search(keyword.value.trim())
    } catch {
      results.value = []
    }
    loading.value = false
  }, 200)
}

function moveDown() {
  if (results.value.length === 0) return
  activeIndex.value = (activeIndex.value + 1) % results.value.length
  scrollToActive()
}

function moveUp() {
  if (results.value.length === 0) return
  activeIndex.value = (activeIndex.value - 1 + results.value.length) % results.value.length
  scrollToActive()
}

function scrollToActive() {
  nextTick(() => {
    const el = document.querySelector('.search-item.active')
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function selectCurrent() {
  if (results.value.length === 0) return
  select(results.value[activeIndex.value])
}

function select(item: any) {
  emit('select', item.file_path)
  close()
}

function highlight(text: string): string {
  if (!text) return ''
  return text
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\{\{HL\}\}/g, '<mark class="search-hl">')
    .replace(/\{\{\/HL\}\}/g, '</mark>')
}

function formatTime(t: string): string {
  if (!t) return ''
  return t.substring(5, 16)
}
</script>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  padding-top: 8vh;
}
.search-panel {
  width: 880px;
  max-height: 80vh;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.search-panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
}
.search-icon { flex-shrink: 0; }
.search-panel-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  background: transparent;
}
.search-kbd {
  font-size: 11px;
  padding: 2px 6px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  color: #999;
  cursor: pointer;
}
.search-panel-results {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.search-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
}
.search-item:hover,
.search-item.active {
  background: #f5f7fa;
}
.search-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.search-item-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.search-item-title {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.search-item-time {
  font-size: 11px;
  color: #bbb;
  flex-shrink: 0;
}
.search-item-snippet {
  margin-top: 4px;
  margin-left: 24px;
  font-size: 12px;
  color: #777;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.search-panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
  color: #ccc;
}
.search-panel-empty p {
  margin-top: 12px;
  font-size: 13px;
  color: #999;
}
.search-panel-hint {
  padding: 32px 0;
  text-align: center;
}
.search-panel-hint p {
  font-size: 13px;
  color: #bbb;
}

:deep(.search-hl) {
  background: #fff3a8;
  color: inherit;
  padding: 1px 2px;
  border-radius: 2px;
}
</style>
