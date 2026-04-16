<p align="center">
  <img src="assets/icon.png" alt="MojiDocs" width="128">
</p>

<h1 align="center">MojiDocs</h1>

<p align="center">
  <strong>离线优先的 Markdown Wiki 桌面应用</strong><br>
  Git 管文件，SQLite 管索引，数据完全属于你
</p>

<p align="center">
  <a href="https://github.com/opqnext/moji-docs/releases/latest"><img src="https://img.shields.io/github/v/release/opqnext/moji-docs?style=flat-square&color=10b981" alt="Release"></a>
  <a href="https://github.com/opqnext/moji-docs/releases"><img src="https://img.shields.io/github/downloads/opqnext/moji-docs/total?style=flat-square&color=3b82f6" alt="Downloads"></a>
  <a href="https://github.com/opqnext/moji-docs/stargazers"><img src="https://img.shields.io/github/stars/opqnext/moji-docs?style=flat-square&color=eab308" alt="Stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/opqnext/moji-docs?style=flat-square&color=6366f1" alt="License"></a>
  <a href="https://github.com/opqnext/moji-docs"><img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-888?style=flat-square" alt="Platform"></a>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> ·
  <a href="#下载安装">下载安装</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#技术栈">技术栈</a> ·
  <a href="#开发指南">开发指南</a> ·
  <a href="#开源协议">开源协议</a>
</p>

---

## 简介

MojiDocs 是一款跨平台的 Markdown Wiki 桌面应用，基于 **Electron + Vue 3 + SQLite** 构建。

核心理念：**`.md` 文件是唯一数据源**，通过 Git 跟踪和同步；SQLite 仅作为全文搜索索引，可随时从文件重建。你的笔记以标准 Markdown 格式存储在本地文件系统中，完全兼容 Obsidian、Hugo、Hexo 等工具。

## 功能特性

**文档管理**
- 文档/目录创建、编辑、删除、移动、置顶
- 树形结构浏览（最近 / 全部 / 树形三种视图）
- 拖拽导入 `.md` 文件

**Markdown 编辑器**
- 双栏实时预览 / 单栏 / 纯预览模式切换
- 工具栏：加粗、斜体、标题、引用、列表、链接、图片、代码块、表格
- 图片粘贴上传（截图 → Ctrl+V → 自动保存到 `assets/`）
- 14 种 Markdown 渲染主题（GitHub、掘金、VuePress 等）

**搜索与版本**
- SQLite FTS5 全文搜索（关键字高亮 + 上下文片段）
- Git 版本历史（浏览、预览、回滚）

**同步与导出**
- Git 定时同步（pull + push，支持冲突检测）
- PDF 导出 / 打印
- 离线优先，所有操作本地立即完成

**个性化**
- 主题颜色自定义（色谱 + 十六进制输入）
- 数据大盘（文章/目录/版本统计）
- 回收站（软删除 + 级联恢复）

## 下载安装

前往 [GitHub Releases](https://github.com/opqnext/moji-docs/releases/latest) 下载对应平台的安装包：

| 平台 | 格式 |
|------|------|
| macOS | `.dmg` |
| Windows | `.exe` |
| Linux | `.AppImage` / `.deb` |

> macOS 用户首次打开可能需要在「系统设置 → 隐私与安全性」中允许运行。

## 快速开始

### 环境要求

- Node.js ≥ 18
- npm ≥ 9

### 开发运行

```bash
git clone https://github.com/opqnext/moji-docs.git
cd moji-docs
npm install
npm run dev
```

### 构建打包

```bash
npm run build      # 编译
npm run package    # 打包为安装包（产物在 release/ 目录）
```

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [Electron](https://www.electronjs.org/) | 33 | 跨平台桌面框架 |
| [Vue 3](https://vuejs.org/) | 3.5 | 前端 UI 框架 |
| [electron-vite](https://electron-vite.org/) | 2.3 | 构建工具 |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 11 | SQLite 数据库（索引 + FTS5 全文搜索） |
| [marked](https://marked.js.org/) | 17 | Markdown 渲染 |
| [highlight.js](https://highlightjs.org/) | 11 | 代码语法高亮 |
| [simple-git](https://github.com/steveukx/git-js) | 3.27 | Git 同步 |
| [chokidar](https://github.com/paulmillr/chokidar) | 3.6 | 文件系统监听 |
| [electron-builder](https://www.electron.build/) | 25 | 应用打包 |

## 项目结构

```
moji-docs/
├── main/                  # 主进程（Node.js）
│   ├── index.ts           #   入口：窗口、协议、IPC
│   ├── database.ts        #   SQLite 初始化
│   ├── indexer.ts          #   文件 → 索引构建
│   ├── git-sync.ts        #   Git 同步调度
│   ├── file-watcher.ts    #   文件系统监听
│   └── ipc/               #   IPC 通道
├── preload/               # 预加载脚本
├── renderer/              # 渲染进程（Vue 3）
│   └── src/
│       ├── views/         #   页面组件
│       └── components/    #   通用组件
├── assets/                # 应用图标
├── scripts/               # 工具脚本
└── doc/                   # 项目文档
```

## 开发指南

### 热更新

| 修改内容 | 是否需要重启 |
|---------|-------------|
| `renderer/` 下的 Vue/CSS 文件 | 不需要（HMR 热更新） |
| `main/` 下的主进程代码 | 需要重新运行 `npm run dev` |

### 调试

- **渲染进程**：开发模式自动打开 DevTools，或按 `Cmd+Option+I`
- **主进程**：`console.log()` 输出到终端，或使用 `--inspect=9229` 连接 Chrome DevTools

### 版本发布

1. 更新 `package.json` 中的 `version`
2. `npm run build && npm run package`
3. 在 [GitHub Releases](https://github.com/opqnext/moji-docs/releases/new) 创建 Release（tag: `v1.x.x`）
4. 上传安装包

## 数据存储

用户数据存储在自选的本地目录中，结构如下：

```
~/MojiDocs/                    # 笔记根目录（= Git 仓库根）
├── .moji/                     # 应用数据（不同步）
│   ├── index.db               #   SQLite 索引（可重建）
│   └── config.json            #   本地设置
├── assets/                    # 图片资源（Git 跟踪）
├── Getting Started.md         # 笔记文件
└── Projects/                  # 目录
    └── Project A.md
```

- 卸载或重装应用**不会**影响用户数据
- `.moji/` 目录自动被 `.gitignore` 排除，不会同步到远程

## Star History

<a href="https://star-history.com/#opqnext/moji-docs&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=opqnext/moji-docs&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=opqnext/moji-docs&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=opqnext/moji-docs&type=Date" />
  </picture>
</a>

## 开源协议

[MIT License](LICENSE) © 2018-2025 [opqnext](https://github.com/opqnext)
