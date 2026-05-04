<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const items = [
  { path: '/', label: '月' },
  { path: '/timeline', label: '時間軸' },
  { path: '/by-oshi', label: '依推し' },
]

function isActive(path) {
  return route.path === path
}
</script>

<template>
  <div class="cal-segment" role="tablist">
    <router-link
      v-for="item in items"
      :key="item.path"
      :to="item.path"
      role="tab"
      :class="['seg', { on: isActive(item.path) }]"
      :aria-selected="isActive(item.path)"
    >{{ item.label }}</router-link>
  </div>
</template>

<style scoped>
.cal-segment {
  display: inline-flex;
  border: 1.5px solid var(--ink);
  border-radius: 999px;
  padding: 3px;
  background: var(--paper);
  margin: 0 auto 1rem;
  gap: 2px;
}
.seg {
  font-family: var(--font-nav);
  font-size: .75rem;
  letter-spacing: .15em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--ink-soft);
  text-decoration: none;
  padding: .45rem 1rem;
  border-radius: 999px;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  transition: all .15s;
  white-space: nowrap;
}
.seg:hover { color: var(--ink); }
.seg.on {
  background: var(--ink);
  color: #fff;
}

@media (max-width: 600px) {
  .cal-segment { display: flex; width: fit-content; }
  .seg { font-size: .7rem; padding: .5rem .9rem; }
}
</style>
