<template>
  <div class="page-home">
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

    <!-- Search results -->
    <div v-if="searchKey && searchResults.length > 0" class="main" style="padding: 24px;">
      <h4 style="margin-bottom: 12px; color: #666; display: flex; align-items: center; gap: 8px;">
        <span class="search-back-btn" @click="searchKey = ''; searchResults = []" title="返回">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </span>
        搜索结果 ({{ searchResults.length }})
      </h4>
      <div v-for="item in searchResults" :key="item.file_path" class="search-result-item" @click="goDoc(item)">
        <div class="search-result-header">
          <svg class="search-doc-icon" v-if="item.is_directory" viewBox="0 0 24 24" fill="none" stroke="var(--tc)" stroke-width="1.5"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
          <svg class="search-doc-icon" v-else viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
          <span class="search-title" v-html="highlightResult(item.title_hl || item.title)"></span>
          <span class="doc-time">{{ formatTime(item.updated_at) }}</span>
        </div>
        <div v-if="item.content_snippet" class="search-snippet" v-html="highlightResult(item.content_snippet)"></div>
      </div>
    </div>

    <!-- Search empty state -->
    <div v-else-if="searchKey && searchResults.length === 0" class="main" style="padding: 24px;">
      <h4 style="margin-bottom: 12px; color: #666; display: flex; align-items: center; gap: 8px;">
        <span class="search-back-btn" @click="searchKey = ''; searchResults = []" title="返回">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </span>
        搜索结果
      </h4>
      <div class="search-empty">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="1"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p>暂无搜索结果</p>
      </div>
    </div>

    <div v-else class="main">
      <div class="home-layout">
        <!-- Left: Recent / All / Tree -->
        <div class="home-left">
          <div class="tabs">
            <div class="tab" :class="{ active: activeTab === 'recent' }" @click="activeTab = 'recent'">最近</div>
            <div class="tab" :class="{ active: activeTab === 'all' }" @click="switchTab('all')">全部</div>
            <div class="tab" :class="{ active: activeTab === 'tree' }" @click="switchTab('tree')">树</div>
          </div>

          <!-- Recent tab -->
          <div v-if="activeTab === 'recent'">
            <div v-if="recent.today.length" class="section-group">
              <h4>今天</h4>
              <div v-for="item in recent.today" :key="item.file_path" class="doc-item" @click="goDoc(item)">
                <svg class="doc-icon" v-if="item.is_directory" viewBox="0 0 24 24" fill="none" stroke="var(--tc)" stroke-width="1.5"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                <svg class="doc-icon" v-else viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
                <span class="doc-title">{{ item.title }}</span>
                <span class="doc-time">{{ formatTime(item.updated_at) }}</span>
              </div>
            </div>
            <div v-if="recent.week.length" class="section-group">
              <h4>7天内</h4>
              <div v-for="item in recent.week" :key="item.file_path" class="doc-item" @click="goDoc(item)">
                <svg class="doc-icon" v-if="item.is_directory" viewBox="0 0 24 24" fill="none" stroke="var(--tc)" stroke-width="1.5"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                <svg class="doc-icon" v-else viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
                <span class="doc-title">{{ item.title }}</span>
                <span class="doc-time">{{ formatTime(item.updated_at) }}</span>
              </div>
            </div>
            <div v-if="recent.earlier.length" class="section-group">
              <h4>更早</h4>
              <div v-for="item in recent.earlier" :key="item.file_path" class="doc-item" @click="goDoc(item)">
                <svg class="doc-icon" v-if="item.is_directory" viewBox="0 0 24 24" fill="none" stroke="var(--tc)" stroke-width="1.5"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                <svg class="doc-icon" v-else viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
                <span class="doc-title">{{ item.title }}</span>
                <span class="doc-time">{{ formatTime(item.updated_at) }}</span>
              </div>
            </div>
            <div v-if="!recent.today.length && !recent.week.length && !recent.earlier.length" style="color: #999; padding: 20px 0;">
              暂无文档
            </div>
          </div>

          <!-- All tab -->
          <div v-if="activeTab === 'all'">
            <div class="breadcrumb" style="padding: 0 0 10px; background: transparent; border: none;">
              <a @click="browseDir('')" style="cursor:pointer">根目录</a>
              <template v-for="(p, idx) in allBreadcrumb" :key="p.file_path">
                <span class="sep">/</span>
                <a v-if="idx < allBreadcrumb.length - 1" @click="browseDir(p.file_path)" style="cursor:pointer">{{ p.title }}</a>
                <a v-else @click="goDoc(p)" style="cursor:pointer; color: var(--tc);">{{ p.title }}</a>
              </template>
            </div>
            <div v-for="item in allChildren" :key="item.file_path" class="doc-item" @click="item.is_directory ? browseDir(item.file_path) : goDoc(item)">
              <svg class="doc-icon" v-if="item.is_directory" viewBox="0 0 24 24" fill="none" stroke="var(--tc)" stroke-width="1.5"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
              <svg class="doc-icon" v-else viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
              <span class="doc-title">{{ item.title }}</span>
              <span class="doc-time">{{ formatTime(item.updated_at) }}</span>
            </div>
            <div v-if="!allChildren.length" style="color: #999; padding: 20px 0;">空目录</div>
          </div>

          <!-- Tree tab -->
          <div v-if="activeTab === 'tree'">
            <div v-if="treeData.length === 0" style="color: #999; padding: 20px 0;">暂无数据</div>
            <div v-else>
              <TreeNode v-for="node in treeData" :key="node.file_path" :node="node" @select="goDoc" />
            </div>
          </div>
        </div>

        <!-- Right: Pinned + Navigation + New -->
        <div class="home-right">
          <div class="pin-section">
            <h4>置顶</h4>
            <div v-if="pinned.length" class="pin-items">
              <div v-for="item in pinned" :key="item.file_path" class="pin-item" :title="item.title" @click="goDoc(item)">
                <svg v-if="item.is_directory" class="pin-icon" viewBox="0 0 24 24" fill="none" stroke="var(--tc)" stroke-width="1.5"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                <svg v-else class="pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
                <span class="pin-text">{{ item.title }}</span>
              </div>
            </div>
            <div v-else class="empty-tip">暂无置顶</div>
          </div>

          <div class="pin-section">
            <h4>导航</h4>
            <div v-if="navigation.length" class="grid-list">
              <div v-for="item in navigation" :key="item.file_path" class="grid-item" :title="item.title" @click="$router.push('/doc/' + encodeURIComponent(item.file_path))">
                {{ item.title }}
              </div>
            </div>
            <div v-else class="empty-tip">暂无目录</div>
          </div>

          <div class="new-actions">
            <a class="new-action-item" @click="$router.push('/edit?is_directory=true')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新建目录
            </a>
            <a class="new-action-item" @click="$router.push('/edit')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新建文章
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">{{ footerText }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import TreeNode from '../components/TreeNode.vue'
import SyncStatus from '../components/SyncStatus.vue'

const router = useRouter()
const siteName = inject<any>('siteName')
const footerText = inject<any>('footerText')

const activeTab = ref('recent')
const recent = ref<any>({ today: [], week: [], earlier: [] })
const pinned = ref<any[]>([])
const navigation = ref<any[]>([])
const searchKey = ref('')
const searchResults = ref<any[]>([])
const allChildren = ref<any[]>([])
const allBreadcrumb = ref<any[]>([])
const treeData = ref<any[]>([])

let searchTimer: any = null

function goDoc(item: any) {
  const filePath = item.file_path
  if (!filePath) return
  router.push('/doc/' + encodeURIComponent(filePath))
}

function highlightResult(text: string): string {
  if (!text) return ''
  return text
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\{\{HL\}\}/g, '<mark class="search-hl">')
    .replace(/\{\{\/HL\}\}/g, '</mark>')
}

function formatTime(t: string) {
  if (!t) return ''
  return t.substring(5, 16)
}

async function doSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    if (!searchKey.value.trim()) {
      searchResults.value = []
      return
    }
    searchResults.value = await api.search(searchKey.value.trim())
  }, 300)
}

async function browseDir(parentPath: string) {
  allChildren.value = await api.getChildren(parentPath)
  if (!parentPath) {
    allBreadcrumb.value = []
  } else {
    const detail = await api.getDetail(parentPath)
    if (detail) {
      allBreadcrumb.value = [...detail.breadcrumb, { file_path: detail.doc.file_path, title: detail.doc.title }]
    }
  }
}

function switchTab(tab: string) {
  activeTab.value = tab
  if (tab === 'all') browseDir('')
  if (tab === 'tree') loadTree()
}

async function loadTree() {
  treeData.value = await api.getTree()
}

onMounted(async () => {
  const [r, p, n] = await Promise.all([
    api.getRecent(),
    api.getPinned(),
    api.getNavigation()
  ])
  recent.value = r
  pinned.value = p
  navigation.value = n
})
</script>

<style scoped>
.page-home {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.main { flex-grow: 1; width: 100%; max-width: 1100px; margin: 0 auto; padding: 24px; }
.home-layout { display: flex; gap: 40px; }
.home-left { flex: 1; min-width: 0; }
.home-right { width: 240px; flex-shrink: 0; }

.empty-tip { color: #999; font-size: calc(var(--fs, 14px) - 1px); padding: 8px 0; }

.new-actions { margin-top: 16px; }
.new-action-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  font-size: calc(var(--fs, 14px) - 1px);
  color: var(--tc);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
  font-weight: 500;
}
.new-action-item:hover { background: color-mix(in srgb, var(--tc) 10%, transparent); }

.search-result-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 4px;
}
.search-result-item:hover { background: #f5f5f5; }
.search-result-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.search-doc-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.search-title {
  flex: 1;
  font-size: var(--fs, 14px);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.search-back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  color: #999;
  transition: all 0.15s;
}
.search-back-btn:hover { background: #f0f0f0; color: var(--tc); }
.search-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #ccc;
}
.search-empty p { margin-top: 12px; font-size: 14px; color: #999; }
.search-snippet {
  margin-top: 4px;
  margin-left: 26px;
  font-size: calc(var(--fs, 14px) - 1px);
  color: #777;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
