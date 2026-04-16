import { marked, Renderer } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'

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

function resolveImageSrc(href: string): string {
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

export function renderMarkdown(md: string): string {
  try {
    return marked.parse(preprocessImageSize(md)) as string
  } catch {
    return md
  }
}
