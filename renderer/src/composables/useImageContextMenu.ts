import { ref, onMounted, onBeforeUnmount } from 'vue'
import api from '../api'

export interface ImageContextMenuOptions {
  containerRef: () => HTMLElement | null | undefined
  toast?: (msg: string, type?: string) => void
  showSaveAs?: boolean
}

export function useImageContextMenu(options: ImageContextMenuOptions) {
  const menuVisible = ref(false)
  const menuX = ref(0)
  const menuY = ref(0)
  let targetSrc = ''

  function onContextMenu(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target.tagName !== 'IMG') return

    e.preventDefault()
    e.stopPropagation()
    targetSrc = (target as HTMLImageElement).src
    menuX.value = e.clientX
    menuY.value = e.clientY
    menuVisible.value = true
  }

  function hideMenu() {
    menuVisible.value = false
  }

  async function copyImage() {
    hideMenu()
    try {
      await api.copyImage(targetSrc)
      options.toast?.('已复制图片', 'success')
    } catch {
      options.toast?.('复制图片失败', 'error')
    }
  }

  async function saveImageAs() {
    hideMenu()
    try {
      const path = await api.saveImageAs(targetSrc)
      if (path) options.toast?.('图片已保存', 'success')
    } catch {
      options.toast?.('保存图片失败', 'error')
    }
  }

  function onDocumentClick() {
    hideMenu()
  }

  onMounted(() => {
    document.addEventListener('click', onDocumentClick)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('click', onDocumentClick)
  })

  return {
    menuVisible,
    menuX,
    menuY,
    onContextMenu,
    hideMenu,
    copyImage,
    saveImageAs
  }
}
