<template>
  <Teleport to="body">
    <div v-if="visible" class="move-overlay" @click.self="close">
      <div class="move-box">
        <h3>移动</h3>
        <div class="move-row">
          <label>目录ID:</label>
          <input v-model.number="targetId" type="number" min="0" placeholder="0 = 根目录" @keyup.enter="doMove" />
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
import { ref } from 'vue'

const visible = ref(false)
const targetId = ref(0)
let resolver: ((v: number | null) => void) | null = null

function show(): Promise<number | null> {
  targetId.value = 0
  visible.value = true
  return new Promise(resolve => { resolver = resolve })
}

function doMove() {
  visible.value = false
  resolver?.(targetId.value)
}

function close() {
  visible.value = false
  resolver?.(null)
}

defineExpose({ show })
</script>

<style scoped>
.move-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 9000;
  display: flex;
  justify-content: center;
  padding-top: 18vh;
}
.move-box {
  background: #fff;
  border-radius: 8px;
  padding: 24px 28px;
  min-width: 360px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  height: fit-content;
}
.move-box h3 { margin: 0 0 16px; font-size: 16px; text-align: left; }
.move-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}
.move-row label { white-space: nowrap; font-size: 14px; }
.move-row input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}
.move-actions { display: flex; gap: 10px; justify-content: flex-end; }
.btn {
  padding: 7px 20px;
  border-radius: 6px;
  border: 1px solid #ddd;
  cursor: pointer;
  font-size: 14px;
  background: #fff;
}
.btn-primary { background: var(--tc, #6c5ce7); color: #fff; border-color: var(--tc, #6c5ce7); }
.btn-cancel:hover { background: #f5f5f5; }
.btn-primary:hover { opacity: 0.85; }
</style>
