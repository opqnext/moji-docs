<template>
  <div class="page-settings">
    <header class="header">
      <div class="header-left">
        <span class="logo" @click="$router.push('/')">{{ siteName }}</span>
      </div>
      <div class="header-right">
        <router-link to="/">文档</router-link>
        <router-link to="/settings" class="active">设置</router-link>
        <SyncStatus />
      </div>
    </header>

    <div class="settings-layout">
      <div class="settings-sidebar">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="settings-tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >{{ tab.label }}</div>
      </div>

      <div class="settings-content">
        <!-- 数据大盘 -->
        <div v-if="activeTab === 'dashboard'" class="settings-panel">
          <h3>数据大盘</h3>
          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-num">{{ dashboard.totalDocs }}</div>
              <div class="stat-label">文章总数</div>
            </div>
            <div class="stat-card">
              <div class="stat-num">{{ dashboard.totalDirs }}</div>
              <div class="stat-label">目录总数</div>
            </div>
            <div class="stat-card">
              <div class="stat-num">{{ dashboard.todayUpdates }}</div>
              <div class="stat-label">今日更新</div>
            </div>
            <div class="stat-card">
              <div class="stat-num">{{ dashboard.weekUpdates }}</div>
              <div class="stat-label">本周更新</div>
            </div>
          </div>
          <div class="sys-info">
            <div class="sys-info-title">系统信息</div>
            <div class="sys-info-row"><span>应用版本</span><span>{{ appInfo.version || '1.0.0' }}</span></div>
            <div class="sys-info-row"><span>文档存储</span><span>{{ settings.docs_path || '-' }}</span></div>
            <div class="sys-info-row"><span>Markdown 解析</span><span>marked.js</span></div>
            <div class="sys-info-row"><span>代码高亮</span><span>highlight.js</span></div>
            <div class="sys-info-row"><span>数据索引</span><span>SQLite (better-sqlite3)</span></div>
            <div class="sys-info-row"><span>文件监听</span><span>chokidar</span></div>
            <div class="sys-info-row"><span>版本管理</span><span>simple-git</span></div>
            <div class="sys-info-row"><span>运行时</span><span>Electron {{ appInfo.electronVersion || '-' }}</span></div>
            <div class="sys-info-row"><span>当前时区</span><span>Asia/Shanghai (UTC+8)</span></div>
          </div>
        </div>

        <!-- 基础设置 -->
        <div v-if="activeTab === 'basic'" class="settings-panel">
          <h3>基础设置</h3>
          <div class="form-group">
            <label>系统名称</label>
            <input v-model="settings.site_name" />
          </div>
          <div class="form-group">
            <label>页脚文字</label>
            <input v-model="settings.footer_text" />
          </div>
          <button class="btn btn-primary" @click="saveBasic">保存</button>
        </div>

        <!-- 主题颜色 -->
        <div v-if="activeTab === 'theme'" class="settings-panel">
          <h3>外观主题</h3>
          <div class="form-group">
            <label>选择主题色</label>
            <div class="color-picker-row">
              <input type="color" v-model="settings.theme_color" />
              <input v-model="settings.theme_color" class="color-hex-input" placeholder="#02af6a" maxlength="7" />
              <div class="color-preview-box" :style="{ background: settings.theme_color }"></div>
            </div>
            <div class="preset-colors">
              <div
                v-for="c in presetColors"
                :key="c.value"
                class="preset-color"
                :class="{ active: settings.theme_color === c.value }"
                :style="{ background: c.value }"
                :title="c.label"
                @click="settings.theme_color = c.value"
              ></div>
            </div>
          </div>
          <div class="form-group" style="margin-top: 20px;">
            <label>界面字体大小</label>
            <div class="font-size-row">
              <div class="font-size-track">
                <input
                  type="range"
                  min="12"
                  max="16"
                  step="1"
                  v-model.number="settings.font_size"
                  class="font-size-slider"
                />
                <div class="font-size-labels">
                  <span>12</span><span>13</span><span>14</span><span>15</span><span>16</span>
                </div>
              </div>
              <span class="font-size-value">{{ settings.font_size || 14 }}px</span>
            </div>
          </div>
          <div class="btn-group">
            <button class="btn btn-primary" @click="saveTheme">保存主题</button>
            <button class="btn" @click="resetTheme">恢复默认</button>
          </div>
        </div>

        <!-- 文档样式 -->
        <div v-if="activeTab === 'mdtheme'" class="settings-panel">
          <h3>文档样式</h3>
          <p class="panel-desc">选择 Markdown 渲染后的 CSS 样式主题</p>
          <div class="md-theme-grid">
            <div
              v-for="t in mdThemes"
              :key="t.id"
              class="md-theme-card"
              :class="{ active: settings.markdown_theme === t.id }"
              @click="settings.markdown_theme = t.id"
            >
              <div class="md-theme-preview" :style="{ background: t.bg, border: '1px solid ' + t.border }">
                <div :style="{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: t.title }">标题示例</div>
                <div :style="{ fontSize: '12px', color: t.text, lineHeight: '1.6' }">正文，<code :style="{ background: t.codeBg, padding: '1px 4px', borderRadius: '3px', fontSize: '11px', color: t.code }">代码</code></div>
                <div :style="{ marginTop: '4px', borderLeft: '3px solid ' + t.quote, padding: '3px 6px', background: t.quoteBg, fontSize: '11px', color: t.text, opacity: 0.7 }">引用</div>
              </div>
              <div class="md-theme-name">{{ t.name }}</div>
            </div>
          </div>
          <button class="btn btn-primary" style="margin-top: 16px;" @click="saveMdTheme">保存</button>
        </div>

        <!-- Git 同步 -->
        <div v-if="activeTab === 'git'" class="settings-panel">
          <h3>Git 同步</h3>

          <div v-if="gitInfo.isRepo" class="git-status-box">
            <div class="git-status-row">
              <span class="git-label">仓库状态</span>
              <span class="git-value git-connected">已连接</span>
            </div>
            <div class="git-status-row" v-if="gitInfo.branch">
              <span class="git-label">当前分支</span>
              <span class="git-value">{{ gitInfo.branch }}</span>
            </div>
            <div class="git-status-row" v-if="gitInfo.lastCommit">
              <span class="git-label">最近提交</span>
              <span class="git-value">{{ gitInfo.lastCommit }}</span>
            </div>
            <div class="git-status-row" v-if="gitInfo.lastSyncTime">
              <span class="git-label">上次同步</span>
              <span class="git-value">{{ gitInfo.lastSyncTime }}</span>
            </div>
          </div>
          <div v-else class="git-status-box">
            <div class="git-status-row">
              <span class="git-label">仓库状态</span>
              <span class="git-value" style="color: #999;">未初始化</span>
            </div>
          </div>

          <div class="form-group">
            <label>Git 仓库地址</label>
            <input v-model="settings.git_url" placeholder="https://github.com/user/repo.git" />
          </div>
          <div class="form-group">
            <label>分支</label>
            <input v-model="settings.git_branch" placeholder="main" />
          </div>
          <div class="form-group">
            <label>同步间隔 (分钟)</label>
            <input v-model.number="settings.git_interval" type="number" min="0" step="1" placeholder="5, 0=关闭" />
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-primary" @click="saveGit">保存</button>
            <button class="btn" @click="doGitSync" :disabled="gitSyncing">
              {{ gitSyncing ? '同步中...' : '立即同步' }}
            </button>
            <button class="btn" @click="doGitPull" :disabled="gitSyncing">拉取</button>
            <button v-if="!gitInfo.isRepo && settings.git_url" class="btn" @click="doGitInit">初始化 Git</button>
          </div>
          <div v-if="gitMsg" style="margin-top: 12px; color: #666; font-size: 13px; white-space: pre-wrap;">{{ gitMsg }}</div>
        </div>

        <!-- 本地存储 -->
        <div v-if="activeTab === 'storage'" class="settings-panel">
          <h3>本地存储</h3>
          <div class="form-group">
            <label>文档路径</label>
            <input :value="settings.docs_path" disabled />
          </div>
          <p style="color: #999; font-size: 13px; margin-bottom: 16px;">Markdown 文件存储在此目录下，可通过文件管理器直接访问。</p>
          <button class="btn" @click="changeStorageDir">更改存储目录</button>
          <p style="color: #e74c3c; font-size: 12px; margin-top: 8px;">
            ⚠ 更改存储目录将重新初始化应用（等同于重新走引导流程），当前索引将被清除。如需保留数据请先手动备份。
          </p>
        </div>

        <!-- 冲突管理 -->
        <div v-if="activeTab === 'conflict'" class="settings-panel">
          <h3>冲突管理</h3>
          <p style="color: #666; font-size: 13px; margin-bottom: 16px;">
            Git 同步时如果产生冲突，系统会自动保留本地版本（原文件）和远程版本（文件名含「_冲突_远程_」），你可以在这里查看和处理。
          </p>
          <button class="btn" @click="loadConflicts" style="margin-bottom: 16px;">刷新冲突列表</button>
          <div v-if="conflicts.length === 0" style="color: #999;">暂无冲突文件</div>
          <div v-else>
            <div v-for="item in conflicts" :key="item.file_path" class="conflict-item">
              <div class="conflict-info">
                <span class="conflict-title">{{ item.title }}</span>
                <span class="conflict-path">{{ item.file_path }}</span>
              </div>
              <div class="conflict-actions">
                <button class="btn btn-sm" @click="viewConflictDoc(item)">查看</button>
                <button class="btn btn-sm btn-danger" @click="deleteConflictDoc(item)">删除远程版本</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 回收站 -->
        <div v-if="activeTab === 'trash'" class="settings-panel">
          <h3>回收站</h3>
          <div v-if="deletedDocs.length === 0" style="color: #999;">回收站为空</div>
          <table v-else class="trash-table">
            <thead>
              <tr><th>标题</th><th>类型</th><th>删除时间</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="doc in deletedDocs" :key="doc.file_path">
                <td>{{ doc.title }}</td>
                <td>{{ doc.is_directory ? '目录' : '文章' }}</td>
                <td>{{ doc.updated_at }}</td>
                <td>
                  <button class="btn btn-sm" @click="restoreDoc(doc.file_path)">恢复</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 索引管理 -->
        <div v-if="activeTab === 'index'" class="settings-panel">
          <h3>索引管理</h3>
          <div class="stat-grid" style="margin-bottom: 20px;">
            <div class="stat-card">
              <div class="stat-num">{{ indexInfo.docs }}</div>
              <div class="stat-label">已索引文档</div>
            </div>
            <div class="stat-card">
              <div class="stat-num">{{ indexInfo.dirs }}</div>
              <div class="stat-label">已索引目录</div>
            </div>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-primary" @click="doRebuildIndex" :disabled="indexRebuilding">
              {{ indexRebuilding ? '重建中...' : '重建索引' }}
            </button>
            <button class="btn" @click="doCleanImages" :disabled="cleaningImages">
              {{ cleaningImages ? '清理中...' : '清理未引用图片' }}
            </button>
          </div>
          <div v-if="indexMsg" style="margin-top: 12px; color: #666; font-size: 13px;">{{ indexMsg }}</div>
        </div>

        <!-- 检查更新 -->
        <div v-if="activeTab === 'update'" class="settings-panel">
          <h3>检查更新</h3>
          <div class="sys-info" style="margin-bottom: 20px;">
            <div class="sys-info-row"><span>当前版本</span><span>{{ appInfo.version || '1.0.0' }}</span></div>
            <div class="sys-info-row" v-if="updateResult.latestVersion">
              <span>最新版本</span>
              <span :style="{ color: updateResult.hasUpdate ? '#e74c3c' : '#27ae60', fontWeight: 500 }">
                {{ updateResult.latestVersion }}
              </span>
            </div>
            <div class="sys-info-row" v-if="updateResult.releaseDate">
              <span>发布日期</span><span>{{ updateResult.releaseDate }}</span>
            </div>
          </div>

          <div v-if="updateResult.hasUpdate" class="update-available">
            <div class="update-badge">发现新版本</div>
            <p v-if="updateResult.releaseNotes" class="update-notes">{{ updateResult.releaseNotes }}</p>
            <div style="display: flex; gap: 10px;">
              <button v-if="updateResult.downloadUrl" class="btn btn-primary" @click="openDownload">
                下载安装包
              </button>
              <button v-if="updateResult.htmlUrl" class="btn" @click="openReleasePage">
                查看 Release 页面
              </button>
            </div>
          </div>

          <div v-else-if="updateChecked && !updateResult.error" class="update-uptodate">
            当前已是最新版本
          </div>

          <div v-if="updateResult.error" class="update-error">
            {{ updateResult.error }}
          </div>

          <div style="margin-top: 20px;">
            <button class="btn btn-primary" @click="doCheckUpdate" :disabled="updateChecking">
              {{ updateChecking ? '检查中...' : '检查更新' }}
            </button>
          </div>

          <div style="margin-top: 24px; font-size: 13px; color: #999;">
            更新源：<a href="https://github.com/opqnext/moji-docs/releases" target="_blank" style="color: var(--tc);">GitHub Releases</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import SyncStatus from '../components/SyncStatus.vue'

const router = useRouter()
const siteName = inject<any>('siteName')
const toast = inject<any>('toast')
const confirm = inject<any>('confirm')
const reloadSettings = inject<any>('reloadSettings')

const activeTab = ref('dashboard')
const tabs = [
  { id: 'dashboard', label: '数据大盘' },
  { id: 'basic', label: '基础设置' },
  { id: 'theme', label: '外观主题' },
  { id: 'mdtheme', label: '文档样式' },
  { id: 'git', label: 'Git 同步' },
  { id: 'storage', label: '本地存储' },
  { id: 'conflict', label: '冲突管理' },
  { id: 'trash', label: '回收站' },
  { id: 'index', label: '索引管理' },
  { id: 'update', label: '检查更新' }
]

const mdThemes = [
  { id: 'default', name: '默认', bg: '#fff', title: '#1a1a1a', text: '#333', code: '#e74c3c', codeBg: '#f5f5f5', quote: '#4caf50', quoteBg: '#f9f9f9', border: '#eee' },
  { id: 'github', name: 'GitHub', bg: '#fff', title: '#24292f', text: '#24292f', code: '#24292f', codeBg: 'rgba(175,184,193,0.2)', quote: '#d0d7de', quoteBg: '#fff', border: '#d8dee4' },
  { id: 'juejin', name: '掘金', bg: '#fff', title: '#1d2129', text: '#252933', code: '#ff502c', codeBg: '#fff5f5', quote: '#cbcbcb', quoteBg: '#f8f8f8', border: '#ececec' },
]

const presetColors = [
  { value: '#02af6a', label: '默认绿' },
  { value: '#3498db', label: '蓝' },
  { value: '#6c5ce7', label: '紫' },
  { value: '#e74c3c', label: '红' },
  { value: '#f39c12', label: '橙' },
  { value: '#1abc9c', label: '青' },
  { value: '#e84393', label: '粉' },
  { value: '#636e72', label: '灰' },
  { value: '#2d3436', label: '深灰' },
  { value: '#0984e3', label: '天蓝' }
]

const settings = ref<any>({})
const dashboard = ref<any>({ totalDocs: 0, totalDirs: 0, todayUpdates: 0, weekUpdates: 0 })
const appInfo = ref<any>({})
const deletedDocs = ref<any[]>([])
const conflicts = ref<any[]>([])
const gitMsg = ref('')
const gitSyncing = ref(false)
const gitInfo = ref<any>({ isRepo: false, branch: '', lastCommit: '', lastSyncTime: '' })
const indexInfo = ref({ docs: 0, dirs: 0, total: 0 })
const indexRebuilding = ref(false)
const cleaningImages = ref(false)
const indexMsg = ref('')
const updateChecking = ref(false)
const updateChecked = ref(false)
const updateResult = ref<any>({})

async function loadSettings() {
  settings.value = await api.getSettings()
}

async function loadDashboard() {
  dashboard.value = await api.getDashboard()
  try {
    appInfo.value = await api.getAppInfo()
  } catch {}
}

async function loadTrash() {
  deletedDocs.value = await api.getDeleted()
}

async function loadConflicts() {
  conflicts.value = await api.getConflicts()
}

async function loadGitInfo() {
  try {
    gitInfo.value = await api.gitStatus()
  } catch {}
}

async function saveBasic() {
  await api.saveSettings({
    site_name: settings.value.site_name,
    footer_text: settings.value.footer_text
  })
  toast('保存成功')
  reloadSettings()
}

async function saveTheme() {
  await api.saveSettings({
    theme_color: settings.value.theme_color,
    font_size: String(settings.value.font_size || 14)
  })
  toast('保存成功')
  reloadSettings()
}

function resetTheme() {
  settings.value.theme_color = '#02af6a'
  settings.value.font_size = 14
}

async function saveMdTheme() {
  await api.saveSettings({ markdown_theme: settings.value.markdown_theme })
  toast('文档样式已保存')
  reloadSettings()
}

async function saveGit() {
  await api.saveSettings({
    git_url: settings.value.git_url,
    git_branch: settings.value.git_branch,
    git_interval: String(
      settings.value.git_interval === '' || settings.value.git_interval === undefined
        ? 5
        : Math.max(0, Math.round(Number(settings.value.git_interval)))
    )
  })
  toast('保存成功')
  loadGitInfo()
}

async function doGitSync() {
  gitSyncing.value = true
  gitMsg.value = '同步中...'
  try {
    const result = await api.syncGit()
    gitMsg.value = result.message || '同步完成'
    loadGitInfo()
  } catch (e: any) {
    gitMsg.value = '同步失败: ' + (e.message || e)
  }
  gitSyncing.value = false
}

async function doGitPull() {
  gitSyncing.value = true
  gitMsg.value = '拉取中...'
  try {
    const result = await api.syncGit()
    gitMsg.value = result.message || '拉取完成'
    loadGitInfo()
  } catch (e: any) {
    gitMsg.value = '拉取失败: ' + (e.message || e)
  }
  gitSyncing.value = false
}

async function doGitInit() {
  if (!settings.value.git_url) {
    toast('请先填写 Git 仓库地址', 'warning')
    return
  }
  gitMsg.value = '初始化中...'
  try {
    const result = await api.gitInit(settings.value.git_url, settings.value.git_branch || 'main')
    gitMsg.value = result.message
    if (result.success) {
      toast('Git 初始化成功')
      loadGitInfo()
    }
  } catch (e: any) {
    gitMsg.value = '初始化失败: ' + (e.message || e)
  }
}

async function changeStorageDir() {
  const ok = await confirm('更改存储目录将重新初始化应用，当前索引将被清除。如需保留数据请先手动备份。\n\n确定要更改吗？')
  if (!ok) return
  router.push('/setup')
}

function viewConflictDoc(item: any) {
  router.push('/doc/' + encodeURIComponent(item.file_path))
}

async function deleteConflictDoc(item: any) {
  const ok = await confirm(`确定删除远程冲突版本「${item.title}」？`)
  if (!ok) return
  await api.deleteDoc(item.file_path)
  toast('已删除')
  loadConflicts()
}

async function restoreDoc(filePath: string) {
  await api.restoreDoc(filePath)
  toast('恢复成功')
  loadTrash()
}

async function loadIndexInfo() {
  try {
    indexInfo.value = await api.indexStatus()
  } catch {}
}

async function doRebuildIndex() {
  indexRebuilding.value = true
  indexMsg.value = ''
  try {
    const stats = await api.rebuildIndex()
    indexMsg.value = `重建完成：新增 ${stats.added}，更新 ${stats.updated}，删除 ${stats.removed}，总计 ${stats.total}`
    if (stats.failures && stats.failures.length > 0) {
      indexMsg.value += `\n⚠ ${stats.failures.length} 个文件解析失败：\n` +
        stats.failures.map((f: any) => `  · ${f.filePath}: ${f.error}`).join('\n')
      toast(`索引重建完成，但有 ${stats.failures.length} 个文件解析失败，请检查文件格式`, 'warning')
    }
    await loadIndexInfo()
  } catch (e: any) {
    indexMsg.value = '重建失败: ' + (e.message || '未知错误')
  }
  indexRebuilding.value = false
}

async function doCheckUpdate() {
  updateChecking.value = true
  updateResult.value = {}
  try {
    updateResult.value = await api.checkUpdate()
    updateChecked.value = true
  } catch (e: any) {
    updateResult.value = { hasUpdate: false, error: e.message || '检查失败' }
  }
  updateChecking.value = false
}

function openDownload() {
  const url = updateResult.value.downloadUrl || updateResult.value.htmlUrl
  if (url) window.open(url, '_blank')
}

function openReleasePage() {
  if (updateResult.value.htmlUrl) {
    window.open(updateResult.value.htmlUrl, '_blank')
  }
}

async function doCleanImages() {
  cleaningImages.value = true
  indexMsg.value = ''
  try {
    const result = await api.cleanImages()
    indexMsg.value = `清理完成：删除 ${result.deleted.length} 个未引用图片（共 ${result.total} 张图片）`
  } catch (e: any) {
    indexMsg.value = '清理失败: ' + (e.message || '未知错误')
  }
  cleaningImages.value = false
}

watch(activeTab, (tab) => {
  if (tab === 'dashboard') loadDashboard()
  if (tab === 'trash') loadTrash()
  if (tab === 'index') loadIndexInfo()
  if (tab === 'git') loadGitInfo()
  if (tab === 'conflict') loadConflicts()
})

onMounted(async () => {
  await loadSettings()
  loadDashboard()
})
</script>

<style scoped>
.page-settings {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.settings-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
  max-width: 1000px;
  margin: 16px auto 0;
  width: 100%;
}
.settings-sidebar {
  width: 180px;
  background: #fafafa;
  border-right: 1px solid #e8e8e8;
  padding: 16px 0;
  flex-shrink: 0;
}
.settings-tab {
  padding: 10px 24px;
  cursor: pointer;
  font-size: var(--fs, 14px);
  color: #555;
  transition: all 0.15s;
}
.settings-tab:hover { background: #f0f0f0; color: var(--tc); }
.settings-tab.active {
  color: var(--tc);
  font-weight: 600;
  background: color-mix(in srgb, var(--tc) 10%, transparent);
  border-right: 3px solid var(--tc);
}
.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}
.settings-panel h3 { margin-bottom: 20px; font-size: 18px; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-size: 13px; color: #666; }
.form-group input, .form-group select {
  width: 100%;
  max-width: 400px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: var(--fs, 14px);
  outline: none;
}
.form-group input:focus { border-color: var(--tc); }

.btn-group { display: flex; gap: 10px; }

.stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px; }
.stat-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}
.stat-num { font-size: 28px; font-weight: 700; color: var(--tc); }
.stat-label { font-size: 12px; color: #999; margin-top: 2px; }

/* System info */
.sys-info { font-size: 13px; color: #999; }
.sys-info-title { font-size: 14px; font-weight: 600; color: #555; margin-bottom: 8px; }
.sys-info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
}
.sys-info-row span:last-child { color: #333; }

/* Theme color picker */
.color-picker-row { display: flex; align-items: center; gap: 12px; }
.color-picker-row input[type="color"] {
  width: 40px;
  height: 36px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 2px;
  cursor: pointer;
  background: #fff;
}
.color-hex-input {
  width: 120px !important;
  height: 36px;
  font-family: monospace;
}
.color-preview-box {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.preset-colors { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
.preset-color {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
}
.preset-color:hover { transform: scale(1.15); }
.preset-color.active { border-color: #333; }

/* Markdown themes */
.md-theme-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.md-theme-card {
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s;
}
.md-theme-card:hover { border-color: #bbb; }
.md-theme-card.active { border-color: var(--tc); }
.md-theme-preview { padding: 12px; min-height: 60px; font-size: 13px; }
.md-theme-name { padding: 6px 10px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #e8e8e8; }

/* Git status */
.git-status-box {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
}
.git-status-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}
.git-label { color: #999; }
.git-value { color: #333; }
.git-connected { color: #27ae60; font-weight: 500; }

/* Conflict */
.conflict-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  gap: 12px;
}
.conflict-info { flex: 1; min-width: 0; }
.conflict-title { font-size: 14px; font-weight: 500; display: block; }
.conflict-path { font-size: 12px; color: #999; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.conflict-actions { display: flex; gap: 8px; flex-shrink: 0; }

/* Trash */
.trash-table { width: 100%; border-collapse: collapse; }
.trash-table th, .trash-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e8e8e8; font-size: 13px; }
.trash-table th { font-weight: 600; color: #666; }

/* Update */
.update-available {
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
.update-badge {
  display: inline-block;
  background: #e74c3c;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 10px;
  margin-bottom: 8px;
}
.update-notes {
  font-size: 13px;
  color: #555;
  white-space: pre-wrap;
  margin: 8px 0 12px;
  line-height: 1.6;
}
.update-uptodate {
  background: #f0fff4;
  border: 1px solid #c6f6d5;
  border-radius: 8px;
  padding: 16px;
  color: #27ae60;
  font-weight: 500;
  margin-bottom: 16px;
}
.update-error {
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 8px;
  padding: 12px 16px;
  color: #d69e2e;
  font-size: 13px;
  margin-bottom: 16px;
}
/* Font size */
.font-size-row { display: flex; align-items: flex-start; gap: 12px; max-width: 400px; }
.font-size-track { flex: 1; }
.font-size-slider {
  width: 100%;
  -webkit-appearance: none;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  outline: none;
  margin: 6px 0 0;
}
.font-size-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--tc);
  cursor: pointer;
}
.font-size-value {
  font-size: var(--fs, 14px);
  font-weight: 600;
  color: var(--tc);
  width: 36px;
  flex-shrink: 0;
  text-align: center;
  font-family: monospace;
  line-height: 16px;
  margin-top: 3px;
}
.font-size-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #bbb;
  margin-top: 4px;
  padding: 0 6px;
}

.panel-desc { font-size: 13px; color: #666; margin-bottom: 16px; }
.md-theme-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.md-theme-card {
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.md-theme-card:hover { border-color: #bbb; }
.md-theme-card.active { border-color: var(--tc); box-shadow: 0 0 0 1px var(--tc); }
.md-theme-preview { border-radius: 6px; padding: 10px; }
.md-theme-name { text-align: center; font-size: 12px; color: #666; margin-top: 6px; font-weight: 500; }
</style>
