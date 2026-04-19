<template>
  <Teleport to="body">
    <div v-if="visible" class="move-overlay" @click.self="close">
      <div class="move-box">
        <h3>移动到目录</h3>
        <div class="move-tree">
          <div
            class="move-tree-item root"
            :class="{ selected: selectedPath === '' }"
            :style="rootDisabled ? { opacity: '0.35', cursor: 'not-allowed' } : {}"
            @click="!rootDisabled && (selectedPath = '')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tc)" stroke-width="1.5"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
            <span>根目录</span>
          </div>
          <div v-if="loading" style="padding: 16px; color: #999; text-align: center;">加载中...</div>
          <template v-else>
            <MoveTreeNode
              v-for="node in treeData"
              :key="node.file_path"
              :node="node"
              :selectedPath="selectedPath"
              :disabledPaths="disabledPaths"
              :depth="1"
              @select="selectedPath = $event"
            />
          </template>
        </div>
        <div v-if="selectedPath !== null" class="move-selected">
          目标：<strong>{{ selectedPath || '根目录' }}</strong>
        </div>
        <div class="move-actions">
          <button class="btn btn-cancel" @click="close">取消</button>
          <button class="btn btn-primary" @click="doMove">移动</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, defineComponent, h, computed } from 'vue'
import api from '../api'

const visible = ref(false)
const selectedPath = ref('')
const treeData = ref<any[]>([])
const loading = ref(false)
const currentFilePath = ref('')
let resolver: ((v: string | null) => void) | null = null

const disabledPaths = computed(() => {
  const fp = currentFilePath.value
  if (!fp) return new Set<string>()

  const paths = new Set<string>()
  const isDir = fp.endsWith('/_index.md') || fp === '_index.md'

  if (isDir) {
    let dirRel = fp.replace(/\/?_index\.md$/, '')
    paths.add(fp)
    collectDescendantDirs(treeData.value, dirRel, paths)
  } else {
    const parentDir = fp.includes('/') ? fp.substring(0, fp.lastIndexOf('/')) : ''
    if (parentDir) {
      paths.add(parentDir + '/_index.md')
    }
  }
  return paths
})

const rootDisabled = computed(() => {
  const fp = currentFilePath.value
  if (!fp) return false
  const isDir = fp.endsWith('/_index.md') || fp === '_index.md'
  if (isDir) return fp === '_index.md'
  return !fp.includes('/')
})

function collectDescendantDirs(nodes: any[], dirRel: string, paths: Set<string>) {
  for (const node of nodes) {
    if (!node.is_directory) continue
    const nodeDirRel = node.file_path.replace(/\/?_index\.md$/, '')
    if (nodeDirRel === dirRel || nodeDirRel.startsWith(dirRel + '/')) {
      paths.add(node.file_path)
    }
    if (node.children?.length) {
      collectDescendantDirs(node.children, dirRel, paths)
    }
  }
}

async function show(filePath?: string): Promise<string | null> {
  currentFilePath.value = filePath || ''
  selectedPath.value = ''
  visible.value = true
  loading.value = true
  try {
    treeData.value = await api.getTree()
  } catch {
    treeData.value = []
  }
  loading.value = false
  return new Promise(resolve => { resolver = resolve })
}

function doMove() {
  visible.value = false
  resolver?.(selectedPath.value)
}

function close() {
  visible.value = false
  resolver?.(null)
}

defineExpose({ show })

const MoveTreeNode = defineComponent({
  name: 'MoveTreeNode',
  props: {
    node: { type: Object, required: true },
    selectedPath: { type: String, default: '' },
    disabledPaths: { type: Set, default: () => new Set() },
    depth: { type: Number, default: 0 }
  },
  emits: ['select'],
  setup(props, { emit }) {
    const expanded = ref(false)

    return () => {
      if (!props.node.is_directory) return null

      const children = props.node.children?.filter((c: any) => c.is_directory) || []
      const isSelected = props.selectedPath === props.node.file_path
      const isDisabled = props.disabledPaths.has(props.node.file_path)

      const disabledStyle = isDisabled ? { opacity: '0.35', cursor: 'not-allowed' } : {}

      return h('div', { class: 'move-tree-branch' }, [
        h('div', {
          class: ['move-tree-item', { selected: isSelected }],
          style: { paddingLeft: (props.depth * 20 + 12) + 'px', ...disabledStyle },
          onClick: () => { if (!isDisabled) emit('select', props.node.file_path) }
        }, [
          children.length > 0
            ? h('span', {
                class: ['move-toggle', { open: expanded.value }],
                onClick: (e: Event) => { e.stopPropagation(); expanded.value = !expanded.value }
              }, [
                h('svg', { width: '12', height: '12', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', innerHTML: '<polyline points="9 18 15 12 9 6"/>' })
              ])
            : h('span', { style: 'width: 12px; display: inline-block;' }),
          h('svg', { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'var(--tc)', 'stroke-width': '1.5', innerHTML: '<path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>' }),
          h('span', { class: 'move-tree-title' }, props.node.title)
        ]),
        expanded.value && children.length > 0
          ? children.map((child: any) =>
              h(MoveTreeNode, {
                key: child.file_path,
                node: child,
                selectedPath: props.selectedPath,
                disabledPaths: props.disabledPaths,
                depth: props.depth + 1,
                onSelect: (path: string) => emit('select', path)
              })
            )
          : null
      ])
    }
  }
})
</script>

<style scoped>
.move-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 9000;
  display: flex;
  justify-content: center;
  padding-top: 12vh;
}
.move-box {
  background: #fff;
  border-radius: 8px;
  padding: 24px 28px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  height: fit-content;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}
.move-box h3 { margin: 0 0 16px; font-size: 16px; }
.move-tree {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 8px 0;
  max-height: 400px;
  min-height: 200px;
}
.move-tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  border-radius: 4px;
  margin: 0 4px;
  transition: background 0.1s;
}
.move-tree-item:hover { background: #f5f5f5; }
.move-tree-item.selected { background: color-mix(in srgb, var(--tc, #02af6a) 12%, transparent); color: var(--tc, #02af6a); font-weight: 500; }
.move-toggle {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s;
  flex-shrink: 0;
  color: #999;
}
.move-toggle.open { transform: rotate(90deg); }
.move-tree-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.move-selected {
  margin-top: 12px;
  font-size: 13px;
  color: #666;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 4px;
}
.move-selected strong { color: var(--tc, #02af6a); }
.move-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
.btn {
  padding: 7px 20px;
  border-radius: 6px;
  border: 1px solid #ddd;
  cursor: pointer;
  font-size: 14px;
  background: #fff;
}
.btn-primary { background: var(--tc, #02af6a); color: #fff; border-color: var(--tc, #02af6a); }
.btn-cancel:hover { background: #f5f5f5; }
.btn-primary:hover { opacity: 0.85; }
</style>
