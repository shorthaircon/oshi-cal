<script setup>
import { ref, computed } from 'vue'
import { useEventsStore, STATUSES } from '../stores/events.js'
import { useIdolsStore } from '../stores/idols.js'
import { formatTimeInTz, dateKeyInTz, deviceTodayKey } from '../lib/time.js'
import { tzCodeOf } from '../lib/timezones.js'
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

const showPast = ref(false)
const todayKey = deviceTodayKey()

const sorted = computed(() => {
  const all = eventsStore.events.filter(ev => ev.startAt)
  const now = Date.now()
  const future = all
    .filter(ev => new Date(ev.startAt).getTime() >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
  if (!showPast.value) return future
  const past = all
    .filter(ev => new Date(ev.startAt).getTime() < now)
    .sort((a, b) => b.startAt.localeCompare(a.startAt))
  return [...future, ...past]
})

const grouped = computed(() => {
  const map = new Map()
  for (const ev of sorted.value) {
    const k = dateKeyInTz(ev.startAt, ev.timezone)
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(ev)
  }
  return Array.from(map.entries())
})

function idolsOf(ev) {
  return ev.idolIds.map(id => idolsStore.byId(id)).filter(Boolean)
}
function statusLabel(v) {
  return STATUSES.find(s => s.value === v)?.label ?? v
}
function isPastKey(k) { return k < todayKey }
function dayLabel(key) {
  const [y, m, d] = key.split('-').map(Number)
  const dow = ['日','一','二','三','四','五','六'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return { day: String(d).padStart(2, '0'), monthYear: `${m}月 · 週${dow}` }
}
function dayPart(ev) {
  const k = dateKeyInTz(ev.startAt, ev.timezone)
  if (!k) return { day: '', month: '' }
  const [, m, d] = k.split('-').map(Number)
  return { day: String(d).padStart(2, '0'), month: `${m}月` }
}
</script>

<template>
  <section class="view-timeline">
    <div class="seg-wrap"><CalendarSegment /></div>
    <header class="timeline-head">
      <div class="brand-mark">— Forthcoming Engagements —</div>
      <h2 class="t-h2">時間軸</h2>
      <p class="head-sub">in order of arrival</p>
      <label class="toggle">
        <input type="checkbox" v-model="showPast" />
        顯示過去活動
      </label>
    </header>

    <EmptyState v-if="eventsStore.events.length === 0" />
    <p v-else-if="sorted.length === 0" class="empty">
      <template v-if="!showPast">
        沒有未來活動。打開上方 toggle 看過去的。
      </template>
      <template v-else>沒有任何活動。</template>
    </p>

    <div v-for="[key, list] in grouped" :key="key" class="day">
      <ul class="agenda-list">
        <li v-for="ev in list" :key="ev.id" class="agenda-row" :class="{ past: isPastKey(dateKeyInTz(ev.startAt, ev.timezone)) }" @click="goDetail(ev)">
          <div class="when">
            <span class="day">{{ dayPart(ev).day }}</span>
            <span class="month">{{ dayPart(ev).month }}</span>
            <span class="time">{{ ev.timeUnknown ? 'TBD' : formatTimeInTz(ev.startAt, ev.timezone) }} {{ tzCodeOf(ev.timezone) }}</span>
          </div>
          <div class="title">
            {{ ev.title }}
            <small>
              <span v-if="ev.venue">📍 {{ ev.venue }}</span>
              <span v-if="(eventsStore.conflictMap.get(ev.id)?.length ?? 0) > 0" class="conflict-flag">⚠ {{ eventsStore.conflictMap.get(ev.id).length }} 場衝突</span>
              <span class="status-inline">· {{ statusLabel(ev.status) }}</span>
            </small>
          </div>
          <div v-if="idolsOf(ev).length" class="multi-chips">
            <IdolChip v-for="i in idolsOf(ev).slice(0, 3)" :key="i.id" :idol="i" size="sm" />
            <span v-if="idolsOf(ev).length > 3" class="more">+{{ idolsOf(ev).length - 3 }}</span>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.view-timeline { text-align: left; }
.seg-wrap { display: flex; justify-content: center; }
.timeline-head {
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
  margin: 0 0 .25rem;
}
.head-sub {
  font-family: var(--font-display);
  font-style: italic;
  font-size: .9rem;
  color: var(--ink-faint);
  margin: 0 0 1rem;
}
.toggle {
  font-size: .85rem;
  color: var(--ink-soft);
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  font-family: var(--font-jp);
}
.empty {
  text-align: center;
  color: var(--ink-faint);
  padding: 2rem 0;
  font-family: var(--font-jp);
}

.day { margin-bottom: 1.5rem; }
.day-divider {
  display: flex;
  align-items: baseline;
  gap: .75rem;
  padding: .5rem 0;
  margin-bottom: .75rem;
  border-bottom: 1px solid var(--ink);
}
.day-divider .day-key {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 1.6rem;
  color: var(--ink);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.day-divider .day-month {
  font-family: var(--font-nav);
  font-size: .7rem;
  letter-spacing: .15em;
  color: var(--ink-soft);
  text-transform: uppercase;
  flex: 1;
}
.day-tag {
  font-family: var(--font-nav);
  font-size: .65rem;
  letter-spacing: .15em;
  padding: .15rem .55rem;
  border-radius: 999px;
}
.today-tag { background: var(--berry); color: #fff; }
.past-tag { background: var(--gold); color: #fff; }

.agenda-list {
  list-style: none;
  padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: .85rem;
}
.agenda-row {
  display: grid;
  grid-template-columns: 5.5rem 1fr auto;
  gap: 1.25rem;
  align-items: center;
  cursor: pointer;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: .9rem 1.1rem;
  transition: transform .15s, box-shadow .15s;
}
.agenda-row:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(231, 86, 143, 0.15);
}
.agenda-row.past {
  opacity: .55;
  background: transparent;
  border-color: var(--line-soft);
}
.agenda-row.past:hover { opacity: .8; }
.agenda-row .when {
  text-align: center;
  padding: .4rem .25rem;
  background: #fff;
  border-radius: 6px;
  border: 1px solid var(--line);
  display: flex; flex-direction: column; gap: 0;
}
.agenda-row .when .day {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 1.5rem;
  color: var(--ink);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  margin-bottom: 1px;
}
.agenda-row .when .month {
  font-family: var(--font-jp);
  font-size: .7rem;
  color: var(--ink-soft);
  font-weight: 500;
  letter-spacing: .05em;
  line-height: 1;
}
.agenda-row .when .time {
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
  font-size: .7rem;
  color: var(--ink-faint);
  margin-top: .25rem;
  border-top: 1px solid var(--line-soft);
  padding-top: .3rem;
}
.status-inline { color: var(--ink-faint); }
.agenda-row .title {
  font-family: var(--font-jp);
  font-size: .95rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--ink);
}
.agenda-row .title small {
  display: flex;
  flex-wrap: wrap;
  gap: .75rem;
  font-family: var(--font-body);
  font-size: .8rem;
  color: var(--ink-faint);
  margin-top: .25rem;
  font-weight: 400;
}
.conflict-flag { color: #c2410c; }
.multi-chips {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}
.more {
  font-family: var(--font-nav);
  font-size: .7rem;
  color: var(--ink-faint);
  letter-spacing: .1em;
}

@media (max-width: 600px) {
  .agenda-row {
    grid-template-columns: 4rem 1fr;
    gap: .75rem;
  }
  .multi-chips {
    grid-column: 2;
    justify-self: start;
    flex-direction: row;
    flex-wrap: wrap;
    margin-top: .35rem;
  }
}
</style>
