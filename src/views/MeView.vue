<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useEventsStore } from '../stores/events.js'
import { useIdolsStore } from '../stores/idols.js'
import {
  attendedCount,
  attendedThisYear,
  attendedByIdol,
  spendingByCurrency,
} from '../lib/stats.js'
import { formatSpending } from '../lib/currency.js'
import IdolChip from '../components/IdolChip.vue'

const router = useRouter()
const eventsStore = useEventsStore()
const idolsStore = useIdolsStore()

const total = computed(() => attendedCount(eventsStore.events))
const thisYear = computed(() => attendedThisYear(eventsStore.events))
const currentYear = new Date().getFullYear()
const spending = computed(() => spendingByCurrency(eventsStore.events))
const spendingText = computed(() => formatSpending(spending.value))
const ranking = computed(() => attendedByIdol(eventsStore.events, idolsStore.idols))

function goSettings() {
  router.push('/settings')
}
function goIdol(idol) {
  router.push({ path: '/events', query: { idol: idol.id } })
}
</script>

<template>
  <section class="view-me">
    <header class="me-toolbar">
      <h1 class="me-title">個人</h1>
      <button class="gear-btn" type="button" @click="goSettings" aria-label="設定">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
    </header>

    <div class="hero">
      <div class="hero-num">{{ total }}</div>
      <div class="hero-label">累計參加場次</div>

      <div v-if="total > 0" class="hero-sub">
        <div>{{ currentYear }} 已參加 <strong>{{ thisYear }}</strong> 場</div>
        <div v-if="spendingText" class="spending">{{ spendingText }}</div>
      </div>
      <div v-else class="hero-hint">
        ※ 將活動狀態改為「已參加」後計入
      </div>
    </div>

    <section v-if="ranking.length" class="ranking">
      <h2 class="ranking-title">最常陪伴的推し</h2>
      <ol class="ranking-list">
        <li
          v-for="(row, i) in ranking"
          :key="row.idol.id"
          class="ranking-row"
          :class="{ top: i < 3 }"
          @click="goIdol(row.idol)"
        >
          <span class="rank-num">{{ i + 1 }}</span>
          <IdolChip :idol="row.idol" size="md" />
          <span class="rank-count"><strong>{{ row.count }}</strong> 場</span>
        </li>
      </ol>
    </section>
  </section>
</template>

<style scoped>
.view-me { text-align: left; }

.me-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .5rem .25rem 1rem;
  border-bottom: 2px solid var(--ink);
  margin-bottom: 1.25rem;
}
.me-title {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 1.5rem;
  margin: 0;
  color: var(--ink);
}
.gear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 6px;
  width: 44px;
  height: 44px;
  color: var(--ink-soft);
  cursor: pointer;
  transition: all .15s;
}
.gear-btn:hover { color: var(--ink); border-color: var(--ink); background: var(--bg); }

.hero {
  text-align: center;
  padding: 1rem 0 2rem;
  border-bottom: 1px solid var(--line);
  margin-bottom: 1.5rem;
}
.hero-num {
  font-family: var(--font-display);
  font-size: 5.5rem;
  font-weight: 400;
  line-height: 1;
  color: var(--berry);
  margin-bottom: .35rem;
  font-variant-numeric: tabular-nums;
}
.hero-label {
  font-family: var(--font-nav);
  font-size: .85rem;
  letter-spacing: .15em;
  color: var(--ink-soft);
  margin-bottom: 1.25rem;
}
.hero-sub {
  font-family: var(--font-jp);
  font-size: .95rem;
  color: var(--ink);
  display: flex;
  flex-direction: column;
  gap: .35rem;
}
.hero-sub strong {
  font-family: var(--font-num);
  font-weight: 500;
  color: var(--berry);
  font-variant-numeric: tabular-nums;
}
.spending {
  font-family: var(--font-num);
  font-size: .9rem;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
  letter-spacing: .02em;
}
.hero-hint {
  font-family: var(--font-jp);
  font-size: .82rem;
  color: var(--ink-faint);
  margin-top: .5rem;
}

.ranking { padding: 0 .25rem; }
.ranking-title {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 1.1rem;
  margin: 0 0 .85rem;
  text-align: center;
  color: var(--ink);
}
.ranking-list {
  list-style: none;
  padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: .4rem;
}
.ranking-row {
  display: grid;
  grid-template-columns: 2.2rem 1fr auto;
  align-items: center;
  gap: .65rem;
  padding: .55rem .75rem;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 8px;
  cursor: pointer;
  transition: all .15s;
}
.ranking-row:hover {
  border-color: var(--ink);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.ranking-row.top {
  background: var(--bg);
  border-color: var(--berry);
}
.rank-num {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 400;
  color: var(--ink-soft);
  text-align: center;
  line-height: 1;
}
.ranking-row.top .rank-num {
  color: var(--berry);
}
.rank-count {
  font-family: var(--font-jp);
  font-size: .85rem;
  color: var(--ink-soft);
  white-space: nowrap;
}
.rank-count strong {
  font-family: var(--font-num);
  font-weight: 500;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  font-size: 1rem;
  margin-right: .15rem;
}
.ranking-row.top .rank-count strong {
  color: var(--berry);
  font-weight: 600;
}
</style>
