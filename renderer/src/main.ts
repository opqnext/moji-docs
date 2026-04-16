import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Setup from './views/Setup.vue'
import Home from './views/Home.vue'
import Detail from './views/Detail.vue'
import Editor from './views/Editor.vue'
import Settings from './views/Settings.vue'
import './styles/main.css'
import 'highlight.js/styles/github.css'
import api from './api'
import { setDocsRoot } from './markdown'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/setup', component: Setup },
    { path: '/', component: Home },
    { path: '/doc/:id', component: Detail, props: true },
    { path: '/edit/:id?', component: Editor, props: true },
    { path: '/settings', component: Settings }
  ]
})

router.beforeEach(async (to) => {
  if (to.path === '/setup') return true
  try {
    const configured = await api.isConfigured()
    if (!configured) return '/setup'
  } catch {}
  return true
})

api.getSettings().then((settings: any) => {
  if (settings?.docs_path) setDocsRoot(settings.docs_path)
}).catch(() => {})

const app = createApp(App)
app.use(router)
app.mount('#app')
