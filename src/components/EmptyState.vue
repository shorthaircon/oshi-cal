<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useIdolsStore } from '../stores/idols.js'

defineProps({
  title: { type: String, default: '從第一場活動開始' },
  subtitle: { type: String, default: '貼上 Eventernote 網址，10 秒自動建立活動' },
})

const router = useRouter()
const idolsStore = useIdolsStore()

const showSecondaryLink = computed(() => idolsStore.idols.length === 0)

function startImport() {
  router.push({ path: '/events', query: { import: '1' } })
}
</script>

<template>
  <div class="empty-state">
    <div class="eyebrow">— 第一次使用 —</div>
    <h3 class="title">{{ title }}</h3>
    <p class="subtitle">{{ subtitle }}</p>
    <button class="btn-primary" @click="startImport">貼 Eventernote URL</button>
    <p v-if="showSecondaryLink" class="secondary">
      也可以 <router-link to="/idols">手動新增推し →</router-link>
    </p>
  </div>
</template>

<style scoped>
.empty-state {
  text-align: center;
  background: var(--paper);
  border: 2px solid var(--ink);
  border-radius: 4px;
  padding: 2rem 1.5rem;
  box-shadow: 0 2px 0 var(--ink), 0 12px 24px rgba(59, 31, 43, 0.08);
  margin: 1rem 0 1.5rem;
}
.eyebrow {
  font-family: var(--font-nav);
  font-size: .7rem;
  letter-spacing: .35em;
  text-transform: uppercase;
  color: var(--berry);
  font-weight: 500;
  margin-bottom: .5rem;
}
.title {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 900;
  letter-spacing: .05em;
  color: var(--ink);
  margin: 0 0 .5rem;
}
.subtitle {
  font-family: var(--font-jp);
  font-size: .9rem;
  color: var(--ink-soft);
  margin: 0 0 1.25rem;
  line-height: 1.5;
}
.btn-primary {
  background: var(--ink);
  color: #fff;
  border: 2px solid var(--ink);
  padding: .85rem 1.6rem;
  min-height: 44px;
  font-family: var(--font-body);
  font-size: .95rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: all .2s;
}
.btn-primary:hover { background: var(--berry); border-color: var(--berry); }
.secondary {
  margin: 1rem 0 0;
  font-size: .85rem;
  font-family: var(--font-jp);
  color: var(--ink-soft);
}
.secondary a {
  color: var(--berry);
  text-decoration: none;
  font-weight: 500;
}
.secondary a:hover { text-decoration: underline; }
</style>
