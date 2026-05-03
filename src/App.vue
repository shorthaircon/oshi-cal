<script setup>
import { computed } from 'vue'
import { useIdolsStore } from './stores/idols.js'
import { useEventsStore } from './stores/events.js'
import { useMetaStore } from './stores/meta.js'
import { needsBackup } from './lib/backupReminder.js'

const idolsStore = useIdolsStore()
const eventsStore = useEventsStore()
const metaStore = useMetaStore()

const showDot = computed(() => needsBackup({
  idols: idolsStore.idols,
  events: eventsStore.events,
  lastBackupAt: metaStore.lastBackupAt,
  lastBackupCount: metaStore.lastBackupCount,
}))

const BASE = import.meta.env.BASE_URL
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="brand-mark">— Established for Idol Devotees —</div>
      <div class="brand-row">
        <img :src="`${BASE}logo.svg`" width="36" height="36" alt="" />
        <router-link to="/" class="brand">oshi-cal</router-link>
      </div>
      <nav>
        <router-link to="/">月曆</router-link>
        <router-link to="/timeline">時間軸</router-link>
        <router-link to="/by-oshi">依推し</router-link>
        <router-link to="/events">活動</router-link>
        <router-link to="/idols">推し</router-link>
        <router-link to="/settings" class="settings-link">
          設定
          <span v-if="showDot" class="reminder-dot" title="14 天未備份"></span>
        </router-link>
      </nav>
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app {
  max-width: 980px;
  margin: 0 auto;
  padding: 1.25rem 1rem 4rem;
}
.topbar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .35rem;
  padding: .75rem 0 1rem;
  border-bottom: 2px solid var(--ink);
  margin-bottom: 1.5rem;
  text-align: center;
}
.brand-mark {
  font-family: var(--font-nav);
  font-size: .7rem;
  letter-spacing: .35em;
  text-transform: uppercase;
  color: var(--berry);
  font-weight: 500;
}
.brand-row { display: flex; align-items: center; gap: 12px; }
.brand {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--ink);
  text-transform: uppercase;
  white-space: nowrap;
  text-decoration: none;
}
.brand:hover { text-decoration: none; }
nav {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
  font-family: var(--font-nav);
  text-transform: uppercase;
  letter-spacing: .15em;
  font-size: .75rem;
  margin-top: .5rem;
  font-weight: 500;
}
nav a {
  color: var(--ink-soft);
  text-decoration: none;
  padding-bottom: 2px;
}
nav a:hover { color: var(--berry); text-decoration: none; }
nav a.router-link-active { color: var(--ink); border-bottom: 1px solid var(--berry); }

.settings-link { position: relative; }
.reminder-dot {
  display: inline-block; width: 6px; height: 6px;
  background: var(--berry); border-radius: 50%;
  position: absolute; top: -2px; right: -10px;
}

@media (max-width: 600px) {
  nav { gap: 1rem; font-size: .65rem; }
  .brand { font-size: 2rem; }
  .app { padding: 1rem .75rem 3rem; }
}
</style>
