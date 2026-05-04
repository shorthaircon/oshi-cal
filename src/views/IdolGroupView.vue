<script setup>
import { ref, computed } from 'vue'
import { useEventsStore } from '../stores/events.js'
import { useIdolsStore } from '../stores/idols.js'
import { formatInTz } from '../lib/time.js'
import { tzCodeOf } from '../lib/timezones.js'
import { readableTextOn } from '../lib/colors.js'
import IdolChip from '../components/IdolChip.vue'
import EmptyState from '../components/EmptyState.vue'
import CalendarSegment from '../components/CalendarSegment.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
function goDetail(ev) {
  router.push({ name: 'event-detail', params: { id: ev.id } })
}

const eventsStore = useEventsStore()
const idolsStore = useIdolsStore()

const showPast = ref({})

const groups = computed(() => {
  return idolsStore.idols.map(idol => {
    const all = eventsStore.events
      .filter(ev => ev.idolIds.includes(idol.id))
      .sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''))
    const now = Date.now()
    const future = all.filter(ev => ev.startAt && new Date(ev.startAt).getTime() >= now)
    const past = all.filter(ev => ev.startAt && new Date(ev.startAt).getTime() < now)
    const next = future[0] ?? null
    return { idol, all, future, past, next }
  })
})

function toggle(idolId) {
  showPast.value[idolId] = !showPast.value[idolId]
}

function daysUntil(iso) {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}

function countdownLabel(ev) {
  if (!ev) return '無未來活動'
  const d = daysUntil(ev.startAt)
  if (d === 0) return '今天'
  if (d === 1) return '明天'
  return `${d} 天後`
}
</script>

<template>
  <section class="page">
    <div class="seg-wrap"><CalendarSegment /></div>
    <header class="page-head">
      <div class="brand-mark">— By Oshi —</div>
      <h2 class="t-h2">依推し</h2>
    </header>

    <EmptyState v-if="eventsStore.events.length === 0" />

    <div v-for="g in groups" :key="g.idol.id" class="group">
      <header class="g-head" :style="{ background: g.idol.color, color: readableTextOn(g.idol.color) }">
        <span class="name">{{ g.idol.name }}</span>
        <span class="count">{{ g.all.length }} 場</span>
        <span class="next" v-if="g.next">下次 · {{ countdownLabel(g.next) }}</span>
        <span class="next muted" v-else>無未來活動</span>
      </header>

      <ul v-if="g.future.length || (showPast[g.idol.id] && g.past.length)" class="g-list">
        <li
          v-for="ev in g.future"
          :key="ev.id"
          class="g-card"
          @click="goDetail(ev)"
        >
          <div class="line1">
            <span class="time">{{ ev.timeUnknown ? `${formatInTz(ev.startAt, ev.timezone).split(' ')[0]} ・ 時間待確認` : formatInTz(ev.startAt, ev.timezone) }} <span class="tzc">{{ tzCodeOf(ev.timezone) }}</span></span>
            <span v-if="(eventsStore.conflictMap.get(ev.id)?.length ?? 0) > 0" class="conflict" title="時間衝突">⚠</span>
          </div>
          <strong class="title">{{ ev.title }}</strong>
          <div class="meta">
            <span v-if="ev.venue">📍 {{ ev.venue }}</span>
            <span v-if="ev.idolIds.length > 1" class="multi">
              <IdolChip
                v-for="i in ev.idolIds.map(id => idolsStore.byId(id)).filter(x => x && x.id !== g.idol.id)"
                :key="i.id"
                :idol="i"
                size="sm"
              />
            </span>
          </div>
        </li>
        <template v-if="showPast[g.idol.id]">
          <li
            v-for="ev in g.past"
            :key="ev.id"
            class="g-card past"
            @click="goDetail(ev)"
          >
            <div class="line1">
              <span class="time">{{ ev.timeUnknown ? `${formatInTz(ev.startAt, ev.timezone).split(' ')[0]} ・ 時間待確認` : formatInTz(ev.startAt, ev.timezone) }} <span class="tzc">{{ tzCodeOf(ev.timezone) }}</span></span>
              <span class="past-tag">已結束</span>
            </div>
            <strong class="title">{{ ev.title }}</strong>
            <div class="meta">
              <span v-if="ev.venue">📍 {{ ev.venue }}</span>
            </div>
          </li>
        </template>
      </ul>
      <p v-else class="g-empty">沒有未來活動。</p>

      <button v-if="g.past.length" class="g-toggle" @click="toggle(g.idol.id)">
        {{ showPast[g.idol.id] ? '隱藏' : '顯示' }}過去 {{ g.past.length }} 場
      </button>
    </div>
  </section>
</template>

<style scoped>
.seg-wrap { display: flex; justify-content: center; }
.page-head {
  text-align: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--line);
}
.brand-mark {
  font-family: var(--font-nav);
  font-size: .7rem; letter-spacing: .35em;
  text-transform: uppercase;
  color: var(--berry); font-weight: 500;
  margin-bottom: .5rem;
}
.t-h2 {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 900;
  letter-spacing: .15em;
  text-transform: uppercase;
  color: var(--ink);
  margin: 0;
}
.empty {
  text-align: center;
  color: var(--ink-faint);
  padding: 2rem 0;
  font-family: var(--font-jp);
}

.group {
  margin-bottom: 1.5rem;
  border: 2px solid var(--ink);
  border-radius: 4px;
  overflow: hidden;
  background: var(--paper);
  box-shadow: 0 2px 0 var(--ink), 0 12px 24px rgba(59, 31, 43, 0.08);
}
.g-head {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .65rem 1rem;
  font-family: var(--font-jp);
  font-size: .95rem;
  font-weight: 600;
  border-bottom: 2px solid var(--ink);
}
.g-head .name { flex: 1; }
.g-head .count {
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
  font-size: .8rem;
  opacity: .85;
  font-weight: 500;
}
.g-head .next {
  font-family: var(--font-nav);
  font-size: .7rem;
  letter-spacing: .15em;
  text-transform: uppercase;
  opacity: .85;
}
.g-head .muted { opacity: .65; }

.g-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.g-card {
  padding: .75rem 1rem;
  border-top: 1px solid var(--line-soft);
  cursor: pointer;
  transition: background .15s;
}
.g-card:first-child { border-top: 0; }
.g-card:hover { background: #fff; }
.g-card.past { opacity: .6; }
.line1 {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-bottom: .25rem;
}
.time {
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
  font-size: .8rem;
  color: var(--ink-soft);
  flex: 1;
}
.tzc {
  font-family: var(--font-nav);
  font-size: .65rem;
  letter-spacing: .1em;
  color: var(--ink-faint);
}
.title {
  font-family: var(--font-jp);
  font-size: .95rem;
  color: var(--ink);
  display: block;
}
.past-tag {
  font-family: var(--font-nav);
  font-size: .65rem;
  letter-spacing: .15em;
  padding: .1rem .45rem;
  border-radius: 999px;
  background: var(--gold);
  color: #fff;
}
.conflict { color: #c2410c; }
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin-top: .25rem;
  font-family: var(--font-body);
  font-size: .75rem;
  color: var(--ink-faint);
}
.multi {
  display: flex;
  gap: .25rem;
  flex-wrap: wrap;
}
.g-empty {
  padding: 1rem;
  font-size: .85rem;
  color: var(--ink-faint);
  font-family: var(--font-jp);
  margin: 0;
}
.g-toggle {
  width: 100%;
  padding: .55rem;
  border: none;
  border-top: 1px solid var(--line);
  background: var(--bg);
  color: var(--ink-soft);
  cursor: pointer;
  font-family: var(--font-nav);
  font-size: .7rem;
  letter-spacing: .15em;
  text-transform: uppercase;
  font-weight: 500;
}
.g-toggle:hover {
  background: var(--washi);
  color: var(--ink);
}
</style>
