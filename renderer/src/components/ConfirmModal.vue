<template>
  <Teleport to="body">
    <div v-if="visible" class="confirm-overlay" @click.self="cancel">
      <div class="confirm-box">
        <p>{{ message }}</p>
        <div class="confirm-actions">
          <button class="btn btn-cancel" @click="cancel">取消</button>
          <button class="btn btn-danger" @click="ok">确定</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const visible = ref(false)
const message = ref('')
let resolver: ((v: boolean) => void) | null = null

function show(msg: string): Promise<boolean> {
  message.value = msg
  visible.value = true
  return new Promise(resolve => { resolver = resolve })
}

function ok() {
  visible.value = false
  resolver?.(true)
}

function cancel() {
  visible.value = false
  resolver?.(false)
}

defineExpose({ show })
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 9000;
  display: flex;
  justify-content: center;
  padding-top: 18vh;
}
.confirm-box {
  background: #fff;
  border-radius: 8px;
  padding: 28px 32px 20px;
  min-width: 340px;
  max-width: 440px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  height: fit-content;
}
.confirm-box p { margin: 0 0 20px; font-size: 15px; line-height: 1.6; }
.confirm-actions { display: flex; gap: 10px; justify-content: flex-end; }
.btn {
  padding: 7px 20px;
  border-radius: 6px;
  border: 1px solid #ddd;
  cursor: pointer;
  font-size: 14px;
  background: #fff;
}
.btn-danger {
  background: #e74c3c;
  color: #fff;
  border-color: #e74c3c;
}
.btn-cancel:hover { background: #f5f5f5; }
.btn-danger:hover { background: #c0392b; }
</style>
