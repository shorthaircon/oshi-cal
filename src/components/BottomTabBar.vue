<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useIdolsStore } from '../stores/idols.js'
import { useEventsStore } from '../stores/events.js'
import { useMetaStore } from '../stores/meta.js'
import { needsBackup } from '../lib/backupReminder.js'

const route = useRoute()
const idolsStore = useIdolsStore()
const eventsStore = useEventsStore()
const metaStore = useMetaStore()

const CAL_ROUTES = ['/', '/timeline', '/by-oshi']
const STORAGE_KEY = 'oshi-cal-last-cal-route'

const lastCalRoute = ref(sessionStorage.getItem(STORAGE_KEY) || '/')

watch(
  () => route.path,
  (p) => {
    if (CAL_ROUTES.includes(p)) {
      lastCalRoute.value = p
      sessionStorage.setItem(STORAGE_KEY, p)
    }
  },
  { immediate: true }
)

const isCalendarActive = computed(() => CAL_ROUTES.includes(route.path))

const showBackupDot = computed(() => needsBackup({
  idols: idolsStore.idols,
  events: eventsStore.events,
  lastBackupAt: metaStore.lastBackupAt,
  lastBackupCount: metaStore.lastBackupCount,
}))
</script>

<template>
  <nav class="bottom-tabs" role="tablist" aria-label="主要分頁">
    <router-link
      to="/events"
      role="tab"
      :class="['tab', { on: route.path === '/events' }]"
    >
      <span class="label">活動</span>
    </router-link>
    <router-link
      :to="lastCalRoute"
      role="tab"
      :class="['tab', { on: isCalendarActive }]"
    >
      <span class="label">行事曆</span>
    </router-link>
    <router-link
      to="/idols"
      role="tab"
      :class="['tab', { on: route.path === '/idols' }]"
    >
      <span class="label">推し</span>
    </router-link>
    <router-link
      to="/settings"
      role="tab"
      :class="['tab', { on: route.path === '/settings' }]"
    >
      <span class="label">設定</span>
      <span v-if="showBackupDot" class="dot" title="14 天未備份"></span>
    </router-link>
  </nav>
</template>

<style scoped>
.bottom-tabs {
  display: none;
}

@media (max-width: 600px) {
  .bottom-tabs {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--paper);
    border-top: 2px solid var(--ink);
    box-shadow: 0 -4px 16px rgba(59, 31, 43, 0.08);
    z-index: 100;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
  .tab {
    flex: 1;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: .65rem .25rem .55rem;
    min-height: 56px;
    font-family: var(--font-nav);
    font-size: .8rem;
    letter-spacing: .1em;
    color: var(--ink-soft);
    text-decoration: none;
    position: relative;
    transition: color .15s;
  }
  .tab:hover { color: var(--ink); }
  .tab.on {
    color: var(--ink);
    font-weight: 600;
  }
  .tab.on::before {
    content: '';
    position: absolute;
    top: 0;
    left: 30%;
    right: 30%;
    height: 3px;
    background: var(--berry);
    border-radius: 0 0 3px 3px;
  }
  .label {
    font-family: var(--font-jp);
    font-weight: inherit;
  }
  .dot {
    width: 6px;
    height: 6px;
    background: var(--berry);
    border-radius: 50%;
    position: absolute;
    top: 8px;
    right: 28%;
  }
}
</style>
