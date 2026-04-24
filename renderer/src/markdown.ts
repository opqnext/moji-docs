import { marked, Renderer } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'

marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  }
}))

marked.setOptions({ breaks: true, gfm: true })

let docsRoot = ''

export function setDocsRoot(root: string): void {
  docsRoot = root
}

export function resolveImageSrc(href: string): string {
  if (!href) return href
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('data:')) {
    return href
  }
  if (docsRoot && href.startsWith('assets/')) {
    return `moji-file://${docsRoot}/${href}`
  }
  return href
}

const renderer = new Renderer()
renderer.image = function ({ href, title, text }: { href: string; title: string | null; text: string }) {
  const src = resolveImageSrc(href)
  const titleAttr = title ? ` title="${title}"` : ''
  return `<img src="${src}" alt="${text || ''}"${titleAttr} />`
}

marked.use({ renderer })

function preprocessImageSize(md: string): string {
  return md.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\s*=(\d*)x(\d*)\)/g,
    (_match, alt, url, w, h) => {
      const src = resolveImageSrc(url)
      const width = w ? ` width="${w}"` : ''
      const height = h ? ` height="${h}"` : ''
      return `<img src="${src}" alt="${alt}"${width}${height} />`
    }
  )
}

const CUSTOM_ALERTS = [
  { prefix: '!>', bg: '#fffbeb', border: '#f59e0b', color: '#92400e' },
  { prefix: '?>', bg: '#eff6ff', border: '#3b82f6', color: '#1e40af' },
  { prefix: 'x>', bg: '#fef2f2', border: '#ef4444', color: '#991b1b' },
  { prefix: '√>', bg: '#f0fdf4', border: '#22c55e', color: '#166534' },
]

function postprocessCustomAlerts(html: string): string {
  for (const a of CUSTOM_ALERTS) {
    const escaped = a.prefix.replace(/[?]/g, '\\$&')
    const re = new RegExp(
      `<p>(?:${escaped}|${escaped.replace('>', '&gt;')})\\s+(.+?)</p>`,
      'gs'
    )
    html = html.replace(re, (_, text) =>
      `<div style="background:${a.bg};border-left:4px solid ${a.border};padding:12px 16px;margin:16px 0;border-radius:4px;color:${a.color};font-size:inherit;line-height:1.6;">${text}</div>`
    )
  }
  return html
}

export function renderMarkdown(md: string): string {
  try {
    const html = marked.parse(preprocessImageSize(md)) as string
    const alertProcessed = postprocessCustomAlerts(html)
    return DOMPurify.sanitize(alertProcessed, {
      ADD_TAGS: ['img', 'iframe'],
      ADD_ATTR: ['width', 'height', 'alt', 'title', 'target', 'rel'],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|moji-file):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    })
  } catch {
    return md
  }
}
