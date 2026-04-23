import matter from 'gray-matter'

export interface DocMeta {
  title: string
  tags: string[]
  pinned: boolean
  sort: number
  created: string
  updated: string
  [key: string]: unknown
}

const DEFAULT_META: DocMeta = {
  title: '',
  tags: [],
  pinned: false,
  sort: 0,
  created: '',
  updated: ''
}

export interface ParsedDoc {
  meta: DocMeta
  content: string
  rawFrontMatter: Record<string, unknown>
}

export function parseDoc(raw: string): ParsedDoc {
  const { data, content } = matter(raw)

  const meta: DocMeta = {
    title: String(data.title ?? ''),
    tags: normalizeTags(data.tags),
    pinned: Boolean(data.pinned),
    sort: Number(data.sort) || 0,
    created: normalizeDateTime(data.created),
    updated: normalizeDateTime(data.updated)
  }

  return { meta, content: content.trim(), rawFrontMatter: data }
}

export function serializeDoc(meta: Partial<DocMeta>, content: string, preserveFields?: Record<string, unknown>): string {
  const frontMatter: Record<string, unknown> = { ...(preserveFields || {}) }

  if (meta.title !== undefined) frontMatter.title = meta.title
  if (meta.tags !== undefined) frontMatter.tags = meta.tags
  if (meta.pinned !== undefined) frontMatter.pinned = meta.pinned
  if (meta.sort !== undefined && meta.sort !== 0) frontMatter.sort = meta.sort
  if (meta.created) frontMatter.created = meta.created
  if (meta.updated) frontMatter.updated = meta.updated

  return matter.stringify(content.endsWith('\n') ? content : content + '\n', frontMatter)
}

export function nowString(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const MAX_FILENAME_CHARS = 100

export function titleToFilename(title: string): string {
  if (!title.trim()) return 'untitled'
  let name = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim()
  if (Array.from(name).length > MAX_FILENAME_CHARS) {
    name = Array.from(name).slice(0, MAX_FILENAME_CHARS).join('')
  }
  return name
}

export function filenameToTitle(filename: string): string {
  return filename.replace(/\.md$/i, '').trim()
}

export function buildDefaultMeta(title: string): DocMeta {
  const now = nowString()
  return { ...DEFAULT_META, title, created: now, updated: now }
}

function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') {
    return raw.split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}

function normalizeDateTime(raw: unknown): string {
  if (!raw) return ''
  if (raw instanceof Date) {
    const d = raw
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }
  return String(raw)
}
