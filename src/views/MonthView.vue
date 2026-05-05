<script setup>
import { ref, computed } from 'vue'
import { useEventsStore } from '../stores/events.js'
import { buildMonthGrid, shiftMonth, WEEK_LABELS_ZH } from '../lib/calendar.js'
import { dateKeyInTz, deviceTodayKey } from '../lib/time.js'
import EventCard from '../components/EventCard.vue'
import Ribbon from '../components/Ribbon.vue'
import EmptyState from '../components/EmptyState.vue'
import CalendarSegment from '../components/CalendarSegment.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
function goDetail(ev) {
  router.push({ name: 'event-detail', params: { id: ev.id } })
}

const eventsStore = useEventsStore()

const todayKey = deviceTodayKey()
const todayParts = todayKey.split('-').map(Number)
const cursor = ref({ year: todayParts[0], month: todayParts[1] })

const cells = computed(() => buildMonthGrid(cursor.value.year, cursor.value.month))

const eventsByDay = computed(() => {
  const map = new Map()
  for (const ev of eventsStore.events) {
    const key = dateKeyInTz(ev.startAt, ev.timezone)
    if (!key) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(ev)
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''))
  }
  return map
})

function prev() {
  cursor.value = shiftMonth(cursor.value.year, cursor.value.month, -1)
}
function next() {
  cursor.value = shiftMonth(cursor.value.year, cursor.value.month, +1)
}
function goToday() {
  cursor.value = { year: todayParts[0], month: todayParts[1] }
}

// Horizontal swipe to switch months (mobile)
let swipeStartX = 0
let swipeStartY = 0
const SWIPE_THRESHOLD = 60
function onTouchStart(e) {
  if (e.touches.length !== 1) return
  swipeStartX = e.touches[0].clientX
  swipeStartY = e.touches[0].clientY
}
function onTouchEnd(e) {
  if (!e.changedTouches.length) return
  const dx = e.changedTouches[0].clientX - swipeStartX
  const dy = e.changedTouches[0].clientY - swipeStartY
  if (Math.abs(dx) < SWIPE_THRESHOLD) return
  if (Math.abs(dy) > Math.abs(dx) * 0.7) return // mostly vertical
  if (dx < 0) next()
  else prev()
}

const prevMonth = computed(() => ((cursor.value.month + 10) % 12) + 1)
const nextMonth = computed(() => (cursor.value.month % 12) + 1)

const monthEventCount = computed(() => {
  const ym = `${cursor.value.year}-${String(cursor.value.month).padStart(2, '0')}`
  return eventsStore.events.filter(ev => {
    const k = dateKeyInTz(ev.startAt, ev.timezone)
    return k && k.startsWith(ym)
  }).length
})
const monthOshiCount = computed(() => {
  const ym = `${cursor.value.year}-${String(cursor.value.month).padStart(2, '0')}`
  const set = new Set()
  for (const ev of eventsStore.events) {
    const k = dateKeyInTz(ev.startAt, ev.timezone)
    if (!k || !k.startsWith(ym)) continue
    for (const id of ev.idolIds) set.add(id)
  }
  return set.size
})

</script>

<template>
  <section class="view-month">
    <div class="seg-wrap"><CalendarSegment /></div>
    <div class="month-head">
      <Ribbon>Anno {{ cursor.year }}</Ribbon>
      <h1 class="month-title">
        <span class="month-num">{{ cursor.month }}</span><span class="month-suffix">月</span>
      </h1>
      <div class="month-frame">
        <span>{{ String(monthEventCount).padStart(2, '0') }} 場</span>
        <span>·</span>
        <span>{{ monthOshiCount }} 推し</span>
      </div>
      <div class="month-nav">
        <button class="btn-frame" @click="prev">‹ {{ prevMonth }}月</button>
        <button class="btn-frame active" @click="goToday">今天</button>
        <button class="btn-frame" @click="next">{{ nextMonth }}月 ›</button>
      </div>
    </div>

    <EmptyState v-if="eventsStore.events.length === 0" />

    <div
      class="grid-wrap"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <div class="weekrow">
        <div v-for="(w, i) in WEEK_LABELS_ZH" :key="i" :class="{ sun: i === 0 }">
          {{ w }}
        </div>
      </div>

      <div class="grid-month">
      <div
        v-for="cell in cells"
        :key="cell.key"
        class="cell"
        :class="{
          'out': !cell.inMonth,
          'today': cell.key === todayKey,
          'sun': cell.dow === 0,
        }"
      >
        <span class="num">{{ cell.date }}</span>
        <EventCard
          v-for="ev in (eventsByDay.get(cell.key) ?? [])"
          :key="ev.id"
          :event="ev"
          :compact="true"
          @select="goDetail($event)"
        />
      </div>
    </div>
    </div>

  </section>
</template>

<style scoped>
.seg-wrap { display: flex; justify-content: center; }
.grid-wrap { touch-action: pan-y; user-select: none; }
.month-head { text-align: center; padding: 0 0 1.25rem; }
.month-title {
  margin: 0.5rem 0 0;
  color: var(--ink);
  line-height: 1;
}
.month-num {
  font-family: var(--font-display);
  font-size: 4.5rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}
.month-suffix {
  font-family: var(--font-jp);
  font-size: 2.5rem;
  font-weight: 700;
}
.month-frame {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  padding: .55rem 1rem;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--ink);
  margin-top: 1rem;
  line-height: 1;
  white-space: nowrap;
  font-family: var(--font-nav);
  font-size: .8rem;
  letter-spacing: .15em;
  text-transform: uppercase;
  color: var(--ink-soft);
  font-weight: 500;
}
.month-nav {
  display: flex;
  gap: .75rem;
  justify-content: center;
  margin-top: 1rem;
  flex-wrap: wrap;
}
.btn-frame {
  background: transparent;
  color: var(--ink);
  border: 2px solid var(--ink);
  padding: .35rem .9rem;
  font-family: var(--font-nav);
  font-size: .7rem;
  letter-spacing: .15em;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 2px;
  font-weight: 500;
  transition: all .2s;
  white-space: nowrap;
}
.btn-frame:hover, .btn-frame.active {
  background: var(--berry);
  color: #fff;
  border-color: var(--berry);
}

.weekrow {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  font-family: var(--font-nav);
  font-size: .85rem;
  letter-spacing: .25em;
  text-transform: uppercase;
  color: var(--ink-soft);
  padding: .8rem 0;
  background: var(--bg);
  border: 2px solid var(--ink);
  border-bottom: 1px solid var(--ink);
  text-align: center;
  font-weight: 500;
  margin-top: 1rem;
}
.weekrow div.sun { color: var(--berry); }

.grid-month {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border: 2px solid var(--ink);
  border-top: 0;
  background: var(--ink);
  gap: 1px;
}
.cell {
  background: var(--paper);
  min-height: 5.5rem;
  padding: .35rem;
  display: flex;
  flex-direction: column;
  gap: .2rem;
  text-align: left;
  transition: background .2s;
  min-width: 0;
}
.cell:hover { background: #fff; }
.cell .num {
  font-family: var(--font-day);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  font-size: 1.15rem;
  color: var(--ink);
  line-height: 1;
}
.cell.today {
  box-shadow: inset 0 4px 0 var(--berry);
}
.cell.today .num { color: var(--ink); font-weight: 700; }
.cell.out { background: var(--bg); }
.cell.out .num { color: var(--ink-soft); opacity: .58; }
.cell.sun .num { color: var(--berry); }

.empty {
  text-align: center;
  color: var(--ink-faint);
  padding: 2rem 0;
  font-family: var(--font-jp);
}

@media (max-width: 600px) {
  .seg-wrap { margin-top: 0; }
  .seg-wrap :deep(.cal-segment) { margin-bottom: .5rem; }
  .month-head { padding: 0 0 .65rem; }
  .month-num { font-size: 2rem; }
  .month-suffix { font-size: 1.25rem; }
  .month-title { margin: .15rem 0 0; }
  .month-frame {
    padding: .35rem .75rem;
    margin-top: .4rem;
    font-size: .7rem;
    gap: .65rem;
  }
  .month-nav { margin-top: .5rem; gap: .5rem; }
  .btn-frame { padding: .3rem .7rem; font-size: .65rem; }
  .weekrow { padding: .5rem 0; font-size: .75rem; margin-top: .5rem; }
  .cell { min-height: 4.5rem; }
}
</style>
