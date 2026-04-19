<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">中文</a>
</p>

<p align="center">
  <img src="assets/icon.png" alt="MojiDocs" width="128">
</p>

<h1 align="center">MojiDocs</h1>

<p align="center">
  <strong>Offline-first Markdown Wiki Desktop App</strong><br>
  Git tracks files, SQLite indexes them — your data stays yours
</p>

<p align="center">
  <a href="https://github.com/opqnext/moji-docs/releases/latest"><img src="https://img.shields.io/github/v/release/opqnext/moji-docs?style=flat-square&color=10b981" alt="Release"></a>
  <a href="https://github.com/opqnext/moji-docs/releases"><img src="https://img.shields.io/github/downloads/opqnext/moji-docs/total?style=flat-square&color=3b82f6" alt="Downloads"></a>
  <a href="https://github.com/opqnext/moji-docs/stargazers"><img src="https://img.shields.io/github/stars/opqnext/moji-docs?style=flat-square&color=eab308" alt="Stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/opqnext/moji-docs?style=flat-square&color=6366f1" alt="License"></a>
  <a href="https://github.com/opqnext/moji-docs"><img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-888?style=flat-square" alt="Platform"></a>
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#download">Download</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#development">Development</a> ·
  <a href="#license">License</a>
</p>

---

## Overview

MojiDocs is a cross-platform Markdown Wiki desktop app built with **Electron + Vue 3 + SQLite**.

Core philosophy: **`.md` files are the single source of truth**, tracked and synced via Git. SQLite serves purely as a full-text search index and can be rebuilt from files at any time. Your notes are stored as standard Markdown in the local filesystem, fully compatible with Obsidian, Hugo, Hexo, and more.

## Features

**Document Management**
- Create, edit, delete, move, and pin documents/directories
- Tree-structured browsing (Recent / All / Tree views)
- Drag-and-drop `.md` file import

**Markdown Editor**
- Dual-pane live preview / single-pane / preview-only mode
- Toolbar: bold, italic, heading, quote, list, link, image, code block, table
- Paste-to-upload images (screenshot → Ctrl+V → auto-saved to `assets/`)
- Multiple Markdown rendering themes (GitHub, Juejin, etc.)

**Search & Versioning**
- SQLite FTS5 full-text search (keyword highlighting + context snippets)
- Git version history (browse, preview, rollback)

**Sync & Export**
- Scheduled Git sync (pull + push with conflict detection)
- PDF export / print
- Offline-first — all operations complete locally

**Customization**
- Custom theme colors (color picker + hex input)
- Dashboard (article/directory/version stats)
- Trash (soft delete + cascading restore)

## Download

Go to [GitHub Releases](https://github.com/opqnext/moji-docs/releases/latest) to download the installer for your platform:

| Platform | Format |
|----------|--------|
| macOS | `.dmg` |
| Windows | `.exe` |
| Linux | `.AppImage` / `.deb` |

### macOS Installation Note

Since the app is not signed with an Apple Developer certificate, macOS may show "damaged file" or "unverified developer" warnings. Fix with either method:

**Method 1**: Run in Terminal (recommended)

```bash
xattr -cr /Applications/MojiDocs.app
```

**Method 2**: Right-click the app icon → select "Open" → click "Open" in the dialog

> This is a macOS Gatekeeper restriction, not an issue with the app itself. Required once after each install or update.

## Quick Start

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Development

```bash
git clone https://github.com/opqnext/moji-docs.git
cd moji-docs
npm install
npm run dev
```

### Build

```bash
npm run build      # Compile
npm run package    # Package as installer (output in release/)
```

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| [Electron](https://www.electronjs.org/) | 33 | Cross-platform desktop framework |
| [Vue 3](https://vuejs.org/) | 3.5 | Frontend UI framework |
| [electron-vite](https://electron-vite.org/) | 2.3 | Build tool |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 11 | SQLite database (index + FTS5 full-text search) |
| [marked](https://marked.js.org/) | 17 | Markdown rendering |
| [highlight.js](https://highlightjs.org/) | 11 | Code syntax highlighting |
| [simple-git](https://github.com/steveukx/git-js) | 3.27 | Git sync |
| [chokidar](https://github.com/paulmillr/chokidar) | 3.6 | File system watching |
| [electron-builder](https://www.electron.build/) | 25 | App packaging |

## Project Structure

```
moji-docs/
├── main/                  # Main process (Node.js)
│   ├── index.ts           #   Entry: window, protocols, IPC
│   ├── database.ts        #   SQLite initialization
│   ├── indexer.ts          #   File → index builder
│   ├── git-sync.ts        #   Git sync scheduler
│   ├── file-watcher.ts    #   File system watcher
│   └── ipc/               #   IPC channels
├── preload/               # Preload scripts
├── renderer/              # Renderer process (Vue 3)
│   └── src/
│       ├── views/         #   Page components
│       └── components/    #   Shared components
├── assets/                # App icons
├── scripts/               # Utility scripts
└── doc/                   # Project documentation
```

## Development Guide

### Hot Reload

| Change | Restart Required? |
|--------|-------------------|
| `renderer/` Vue/CSS files | No (HMR hot reload) |
| `main/` main process code | Yes, re-run `npm run dev` |

### Debugging

- **Renderer process**: DevTools opens automatically in dev mode, or press `Cmd+Option+I`
- **Main process**: `console.log()` outputs to terminal, or use `--inspect=9229` with Chrome DevTools

### Releasing

1. Update `version` in `package.json`
2. `npm run build && npm run package`
3. Create a Release on [GitHub Releases](https://github.com/opqnext/moji-docs/releases/new) (tag: `v1.x.x`)
4. Upload installers

## Data Storage

User data is stored in a user-selected local directory:

```
~/MojiDocs/                    # Notes root (= Git repo root)
├── .moji/                     # App data (not synced)
│   ├── index.db               #   SQLite index (rebuildable)
│   └── config.json            #   Local settings
├── assets/                    # Image assets (Git tracked)
├── Getting Started.md         # Note files
└── Projects/                  # Directories
    └── Project A.md
```

- Uninstalling or reinstalling the app **does not** affect user data
- `.moji/` is automatically excluded via `.gitignore` and won't sync to remote

## Star History

<a href="https://star-history.com/#opqnext/moji-docs&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=opqnext/moji-docs&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=opqnext/moji-docs&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=opqnext/moji-docs&type=Date" />
  </picture>
</a>

## License

[MIT License](LICENSE) © 2018-2025 [opqnext](https://github.com/opqnext)
