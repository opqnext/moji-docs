<template>
  <Teleport to="body">
    <div v-if="visible" class="toast" :class="type">{{ message }}</div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const visible = ref(false)
const message = ref('')
const type = ref('success')
let timer: any = null

function show(msg: string, t: string = 'success') {
  message.value = msg
  type.value = t
  visible.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { visible.value = false }, 2500)
}

defineExpose({ show })
</script>

<style scoped>
.toast {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 28px;
  border-radius: 6px;
  font-size: 14px;
  z-index: 9999;
  color: #fff;
  animation: toastIn 0.3s ease;
  pointer-events: none;
}
.toast.success { background: #27ae60; }
.toast.error { background: #e74c3c; }
.toast.warning { background: #f39c12; }
.toast.info { background: #3498db; }

@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
