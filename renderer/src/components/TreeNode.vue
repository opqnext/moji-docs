<template>
  <div class="tree-node">
    <div class="tree-item" @click="handleClick">
      <span v-if="hasChildren" class="tree-toggle" :class="{ open: isExpanded }">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </span>
      <span v-else style="width: 12px; display: inline-block;"></span>
      <svg v-if="node.is_directory" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tc)" stroke-width="1.5"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
      <span style="font-size: var(--fs, 14px);">{{ node.title }}</span>
    </div>
    <div v-show="isExpanded" class="tree-children">
      <TreeNode
        v-for="child in node.children"
        :key="child.file_path"
        :node="child"
        :expandedId="childExpandedId"
        @select="$emit('select', $event)"
        @expanded="onChildExpanded"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ node: any; expandedId?: string }>()
const emit = defineEmits(['select', 'expanded'])

const isExpanded = ref(false)
const childExpandedId = ref<string>('')
const hasChildren = computed(() => props.node.children && props.node.children.length > 0)

import { watch } from 'vue'
watch(() => props.expandedId, (val) => {
  if (val && val !== props.node.file_path) {
    isExpanded.value = false
  }
})

function handleClick() {
  if (hasChildren.value) {
    isExpanded.value = !isExpanded.value
    if (isExpanded.value) {
      emit('expanded', props.node.file_path)
    }
  } else {
    emit('select', props.node)
  }
}

function onChildExpanded(id: string) {
  childExpandedId.value = id
}
</script>
