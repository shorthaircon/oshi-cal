<script setup>
import { useRouter, useRoute } from 'vue-router'
import { detectedUrl, dismissBanner } from '../lib/clipboardDetect.js'

const router = useRouter()
const route = useRoute()

function importNow() {
  const url = detectedUrl.value
  dismissBanner()
  if (!url) return
  // Navigate to import panel with prefilled URL via query
  router.push({
    path: '/events',
    query: { import: '1', prefill: url },
  })
}

function close() {
  dismissBanner()
}

// Hide on detail page or import-mode page (avoid noise during import flow itself)
import { computed } from 'vue'
const visible = computed(() => {
  if (!detectedUrl.value) return false
  if (route.path.startsWith('/event/')) return false
  if (route.path === '/events' && route.query.import === '1') return false
  return true
})
</script>

<template>
  <transition name="cb-slide">
    <div v-if="visible" class="clip-banner">
      <span class="msg">
        <span class="emoji">📋</span>
        偵測到 Eventernote 連結
      </span>
      <div class="actions">
        <button type="button" class="cb-import" @click="importNow">匯入</button>
        <button type="button" class="cb-close" @click="close" aria-label="關閉">×</button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.clip-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fef0c7;
  border: 1px solid var(--gold);
  border-radius: 6px;
  padding: .55rem .85rem;
  margin: 0 0 .85rem;
  gap: .5rem;
  font-size: .85rem;
}
.msg {
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  color: var(--ink);
  font-family: var(--font-jp);
  font-weight: 500;
}
.emoji { font-size: 1.05rem; }
.actions {
  display: flex;
  gap: .35rem;
  align-items: center;
}
.cb-import {
  background: var(--ink);
  color: #fff;
  border: 1px solid var(--ink);
  border-radius: 4px;
  padding: .4rem 1rem;
  font-size: .82rem;
  cursor: pointer;
  font-weight: 500;
  font-family: var(--font-body);
  transition: background .15s, border-color .15s;
  min-height: 36px;
}
.cb-import:hover {
  background: var(--berry);
  border-color: var(--berry);
}
.cb-close {
  background: transparent;
  border: 0;
  padding: .25rem .55rem;
  font-size: 1.4rem;
  color: var(--ink-soft);
  cursor: pointer;
  line-height: 1;
}
.cb-close:hover { color: var(--ink); }

.cb-slide-enter-active,
.cb-slide-leave-active {
  transition: opacity .25s, transform .25s;
}
.cb-slide-enter-from,
.cb-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
