<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const TYPES = [
  { value: '',          label: '全部' },
  { value: 'concert',   label: '演唱會' },
  { value: 'event',     label: '現地活動' },
  { value: 'streaming', label: '線上' },
]

const current = computed(() => route.query.type || '')

function pick(v) {
  const q = { ...route.query }
  if (v) q.type = v
  else delete q.type
  router.replace({ path: '/events', query: q })
}
</script>

<template>
  <div class="type-segment" role="tablist">
    <button
      v-for="t in TYPES"
      :key="t.value || 'all'"
      type="button"
      role="tab"
      :class="['seg', { on: current === t.value }]"
      :aria-selected="current === t.value"
      @click="pick(t.value)"
    >{{ t.label }}</button>
  </div>
</template>

<style scoped>
.type-segment {
  display: inline-flex;
  border: 1.5px solid var(--ink);
  border-radius: 999px;
  padding: 3px;
  background: var(--paper);
  gap: 2px;
}
.seg {
  font-family: var(--font-nav);
  font-size: .72rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--ink-soft);
  background: transparent;
  border: 0;
  padding: .45rem .8rem;
  border-radius: 999px;
  min-height: 32px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all .15s;
  white-space: nowrap;
  font-family: var(--font-jp);
}
.seg:hover { color: var(--ink); }
.seg.on {
  background: var(--ink);
  color: #fff;
}

@media (max-width: 600px) {
  .type-segment { display: flex; width: 100%; }
  .seg { font-size: .72rem; padding: .5rem .6rem; flex: 1; }
}
</style>
