<template>
  <div class="page-setup">
    <div class="setup-card">
      <div class="setup-logo">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--tc)" stroke-width="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <h1>Moji文档</h1>
        <p class="setup-desc">Markdown Wiki 桌面应用</p>
      </div>

      <!-- Step 1: Choose directory -->
      <div v-if="step === 1" class="setup-step">
        <h3>选择笔记存放目录</h3>
        <p class="hint">所有笔记将以 .md 文件保存在此目录中</p>
        <div class="dir-picker">
          <input class="dir-input" :value="docsRoot" readonly placeholder="点击右侧按钮选择目录" />
          <button class="btn btn-primary" @click="pickDirectory">选择目录</button>
        </div>
        <div class="step-actions">
          <button class="btn btn-primary" :disabled="!docsRoot" @click="step = 2">下一步</button>
        </div>
      </div>

      <!-- Step 2: Git config (optional) -->
      <div v-if="step === 2" class="setup-step">
        <h3>Git 云同步 <span class="optional-tag">可选</span></h3>
        <p class="hint">配置 Git 仓库实现多设备同步，也可以稍后在设置中配置</p>
        <div class="form-group">
          <label>Git 仓库地址</label>
          <input v-model="gitUrl" placeholder="https://github.com/user/my-notes.git" />
        </div>
        <div class="form-group" v-if="gitUrl">
          <label>分支</label>
          <input v-model="gitBranch" placeholder="main" />
        </div>
        <div class="step-actions">
          <button class="btn" @click="step = 1">上一步</button>
          <button class="btn" @click="doSetup(false)" :disabled="loading">跳过，仅本地使用</button>
          <button class="btn btn-primary" @click="doSetup(true)" :disabled="loading || !gitUrl">
            {{ loading ? '初始化中...' : '完成设置' }}
          </button>
        </div>
      </div>

      <!-- Step 3: Progress -->
      <div v-if="step === 3" class="setup-step" style="text-align: center;">
        <h3>{{ loading ? '正在初始化...' : '设置完成' }}</h3>
        <div v-if="loading" class="progress-area">
          <div class="progress-bar"><div class="progress-fill" :style="{ width: progress + '%' }"></div></div>
          <p class="progress-text">{{ progressText }}</p>
        </div>
        <div v-else class="success-area">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#27ae60" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p>笔记目录已就绪，开始使用 Moji文档 吧！</p>
          <button class="btn btn-primary" @click="enterApp">进入应用</button>
        </div>
        <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

const router = useRouter()

const step = ref(1)
const docsRoot = ref('')
const gitUrl = ref('')
const gitBranch = ref('main')
const loading = ref(false)
const progress = ref(0)
const progressText = ref('')
const errorMsg = ref('')

async function pickDirectory() {
  const dir = await api.selectDirectory()
  if (dir) docsRoot.value = dir
}

async function doSetup(withGit: boolean) {
  step.value = 3
  loading.value = true
  errorMsg.value = ''

  try {
    progress.value = 20
    progressText.value = '创建笔记目录...'

    const params: any = { docsRoot: docsRoot.value }
    if (withGit && gitUrl.value) {
      params.gitUrl = gitUrl.value
      params.gitBranch = gitBranch.value || 'main'
      progress.value = 40
      progressText.value = '连接 Git 仓库...'
    }

    progress.value = 60
    progressText.value = withGit ? '拉取远程数据...' : '初始化索引...'

    await api.setup(params)

    progress.value = 100
    progressText.value = '完成!'
    loading.value = false
  } catch (e: any) {
    errorMsg.value = e.message || '初始化失败'
    loading.value = false
  }
}

function enterApp() {
  router.push('/')
}
</script>

<style scoped>
.page-setup {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #fff;
}
.setup-card {
  padding: 40px;
  width: 520px;
}
.setup-logo {
  text-align: center;
  margin-bottom: 32px;
}
.setup-logo h1 {
  font-size: 24px;
  margin-top: 12px;
  color: var(--tc);
}
.setup-desc {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
}
.setup-step h3 {
  font-size: 16px;
  margin-bottom: 8px;
}
.hint {
  font-size: 13px;
  color: #999;
  margin-bottom: 16px;
}
.optional-tag {
  font-size: 11px;
  color: #999;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 400;
}
.dir-picker {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}
.dir-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  background: #fafafa;
  color: #333;
  outline: none;
}
.form-group {
  margin-bottom: 14px;
}
.form-group label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
}
.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
}
.form-group input:focus {
  border-color: var(--tc);
}
.step-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
}
.progress-area {
  text-align: center;
  padding: 20px 0;
}
.progress-bar {
  height: 6px;
  background: #eee;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 12px;
}
.progress-fill {
  height: 100%;
  background: var(--tc);
  border-radius: 3px;
  transition: width 0.3s;
}
.progress-text {
  font-size: 13px;
  color: #999;
}
.success-area {
  text-align: center;
  padding: 20px 0;
}
.success-area p {
  margin: 12px 0 20px;
  color: #666;
}
.error-text {
  color: #e74c3c;
  font-size: 13px;
  margin-top: 12px;
  text-align: center;
}
</style>
