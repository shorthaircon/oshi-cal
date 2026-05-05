<script setup>
import { ref, computed, watch } from 'vue'
import { compressImage, blobFromUrl, blobFromClipboard } from '../lib/imageUtils.js'
import { putImage, deleteImage } from '../lib/imageStore.js'
import { uuid } from '../lib/uuid.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  currentCoverId: { type: String, default: null },
})
const emit = defineEmits(['update:open', 'change'])

const fileInput = ref(null)
const urlText = ref('')
const status = ref('idle') // idle | loading | error
const errorMsg = ref('')

watch(() => props.open, (v) => {
  if (v) {
    urlText.value = ''
    status.value = 'idle'
    errorMsg.value = ''
  }
})

async function commit(rawBlob) {
  status.value = 'loading'
  errorMsg.value = ''
  try {
    const compressed = await compressImage(rawBlob)
    const newId = uuid()
    await putImage(newId, compressed)
    if (props.currentCoverId) {
      await deleteImage(props.currentCoverId).catch(() => {})
    }
    emit('change', newId)
    emit('update:open', false)
  } catch (e) {
    status.value = 'error'
    errorMsg.value = `處理失敗：${e.message || e}`
  } finally {
    if (status.value === 'loading') status.value = 'idle'
  }
}

function pickFile() {
  fileInput.value?.click()
}

async function onFile(e) {
  const f = e.target.files?.[0]
  if (!f) return
  await commit(f)
  e.target.value = ''
}

async function fromUrl() {
  const url = urlText.value.trim()
  if (!url) return
  status.value = 'loading'
  errorMsg.value = ''
  try {
    const blob = await blobFromUrl(url)
    await commit(blob)
  } catch (e) {
    status.value = 'error'
    errorMsg.value = `抓取失敗：${e.message || e}`
  }
}

async function fromClipboard() {
  status.value = 'loading'
  errorMsg.value = ''
  try {
    const blob = await blobFromClipboard()
    await commit(blob)
  } catch (e) {
    status.value = 'error'
    errorMsg.value = `${e.message || e}`
  }
}

async function removeCover() {
  if (props.currentCoverId) {
    await deleteImage(props.currentCoverId).catch(() => {})
  }
  emit('change', null)
  emit('update:open', false)
}

function close() {
  emit('update:open', false)
}
</script>

<template>
  <teleport to="body">
    <div class="scrim" :class="{ on: open }" @click="close"></div>
    <div class="sheet" :class="{ on: open }">
      <div class="handle"></div>
      <h3 class="title">設定封面圖</h3>

      <div class="options">
        <button class="opt" type="button" :disabled="status === 'loading'" @click="pickFile">
          <span class="icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </span>
          <span class="label">上傳檔案</span>
          <span class="hint">從相簿/檔案選一張</span>
        </button>

        <div class="opt url-opt">
          <span class="icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </span>
          <div class="url-input">
            <input
              v-model="urlText"
              type="url"
              placeholder="貼上圖片網址 https://..."
              :disabled="status === 'loading'"
              @keyup.enter="fromUrl"
            />
            <button
              class="load-btn"
              type="button"
              :disabled="status === 'loading' || !urlText.trim()"
              @click="fromUrl"
            >載入</button>
          </div>
        </div>

        <button class="opt" type="button" :disabled="status === 'loading'" @click="fromClipboard">
          <span class="icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            </svg>
          </span>
          <span class="label">從剪貼簿貼上</span>
          <span class="hint">截圖後直接用這個</span>
        </button>

        <button
          v-if="currentCoverId"
          class="opt danger"
          type="button"
          :disabled="status === 'loading'"
          @click="removeCover"
        >
          <span class="icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 6h18"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" x2="10" y1="11" y2="17"/>
              <line x1="14" x2="14" y1="11" y2="17"/>
            </svg>
          </span>
          <span class="label">移除封面圖</span>
        </button>
      </div>

      <p v-if="status === 'loading'" class="status">處理中...</p>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

      <div class="foot">
        <button class="btn-ghost" type="button" @click="close">取消</button>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        style="display:none"
        @change="onFile"
      />
    </div>
  </teleport>
</template>

<style scoped>
.scrim {
  position: fixed; inset: 0;
  background: rgba(31, 32, 36, .45);
  opacity: 0; pointer-events: none;
  transition: opacity .25s ease;
  z-index: 200;
}
.scrim.on { opacity: 1; pointer-events: auto; }

.sheet {
  position: fixed; left: 0; right: 0; bottom: 0;
  background: var(--paper);
  border-top-left-radius: 18px; border-top-right-radius: 18px;
  box-shadow: 0 -8px 32px rgba(31, 32, 36, .18);
  transform: translateY(100%);
  transition: transform .3s cubic-bezier(.32, .72, 0, 1);
  z-index: 210;
  padding: 8px 18px calc(20px + env(safe-area-inset-bottom, 0));
  display: flex; flex-direction: column;
  max-height: 75vh;
}
.sheet.on { transform: translateY(0); }
.handle {
  align-self: center; width: 36px; height: 4px;
  border-radius: 2px; background: var(--line);
  margin: 4px 0 12px;
}
.title {
  font-family: var(--font-display);
  font-size: 1.15rem; font-weight: 400;
  margin: 0 0 1rem; text-align: center;
}
.options {
  display: flex; flex-direction: column; gap: .5rem;
}
.opt {
  display: flex; align-items: center; gap: .65rem;
  padding: .75rem .85rem;
  background: #fff;
  border: 1px solid var(--line); border-radius: 8px;
  cursor: pointer;
  font-family: var(--font-body);
  text-align: left;
  width: 100%;
  transition: all .15s;
}
.opt:hover:not(:disabled) {
  border-color: var(--ink);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, .06);
}
.opt:disabled { opacity: .55; cursor: wait; }
.opt .icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: var(--ink-soft);
}
.opt .icon svg { width: 22px; height: 22px; display: block; }
.opt:hover:not(:disabled) .icon { color: var(--ink); }
.opt.danger .icon { color: #b91c1c; }
.opt .label {
  font-family: var(--font-jp);
  font-size: .95rem; font-weight: 500;
  color: var(--ink);
}
.opt .hint {
  font-size: .75rem; color: var(--ink-faint);
  font-family: var(--font-jp);
  margin-left: auto;
}
.opt.danger {
  border-color: #fca5a5;
  background: #fff5f5;
}
.opt.danger .label { color: #b91c1c; }

.url-opt {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: .75rem .85rem;
}
.url-input {
  flex: 1;
  display: flex; gap: .5rem;
}
.url-input input {
  flex: 1; min-width: 0;
  padding: .45rem .65rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-family: var(--font-body);
  font-size: .85rem;
  outline: none;
}
.url-input input:focus { border-color: var(--berry); }
.load-btn {
  background: var(--ink); color: #fff;
  border: 1px solid var(--ink);
  padding: .45rem .85rem;
  border-radius: 6px;
  font-size: .8rem; font-weight: 500;
  cursor: pointer;
}
.load-btn:disabled { opacity: .5; cursor: not-allowed; }
.load-btn:hover:not(:disabled) { background: var(--berry); border-color: var(--berry); }

.status {
  text-align: center;
  font-family: var(--font-jp);
  color: var(--ink-soft);
  font-size: .85rem;
  margin: .65rem 0 0;
}
.error {
  text-align: center;
  color: #b91c1c;
  font-family: var(--font-jp);
  font-size: .85rem;
  margin: .65rem 0 0;
}

.foot {
  margin-top: 1rem;
  display: flex; justify-content: center;
}
.btn-ghost {
  background: transparent; color: var(--ink-soft);
  border: 1px solid var(--line);
  padding: .55rem 1.4rem; border-radius: 6px;
  font-family: var(--font-body); font-size: .9rem;
  cursor: pointer;
}
.btn-ghost:hover { color: var(--ink); border-color: var(--ink); }
</style>
