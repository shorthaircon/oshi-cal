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
</script>

<template>
  <div class="app">
    <header class="topbar">
      <router-link to="/" class="brand">oshi-cal</router-link>
      <nav>
        <router-link to="/">月曆</router-link>
        <router-link to="/timeline">時間軸</router-link>
        <router-link to="/events">活動</router-link>
        <router-link to="/idols">偶像</router-link>
        <router-link to="/settings" class="settings-link">
          設定
          <span v-if="showDot" class="dot" title="14 天未備份"></span>
        </router-link>
      </nav>
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app { max-width: 720px; margin: 0 auto; }
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: .75rem 1rem; border-bottom: 1px solid #eee;
}
.brand { font-weight: 700; font-size: 1.1rem; text-decoration: none; color: #111; }
nav { display: flex; gap: .85rem; flex-wrap: wrap; font-size: .9rem; }
nav a { text-decoration: none; color: #666; }
nav a.router-link-active { color: #111; font-weight: 600; }
.settings-link { position: relative; }
.dot {
  display: inline-block; width: 8px; height: 8px;
  background: #ef4444; border-radius: 50%;
  position: absolute; top: -2px; right: -10px;
}
</style>
