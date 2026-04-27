<script setup>
import { ref, computed } from 'vue'
import { useEventsStore } from '../stores/events.js'
import { buildMonthGrid, shiftMonth, WEEK_LABELS_ZH } from '../lib/calendar.js'
import { dateKeyInTz, deviceTodayKey } from '../lib/time.js'
import EventCard from '../components/EventCard.vue'
import EventDetailModal from '../components/EventDetailModal.vue'

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

const monthLabel = computed(() => `${cursor.value.year}年${cursor.value.month}月`)

const selected = ref(null)
const liveSelected = computed(() =>
  selected.value ? eventsStore.byId(selected.value.id) : null
)
</script>

<template>
  <section class="month">
    <header class="head">
      <h2>{{ monthLabel }}</h2>
      <div class="nav">
        <button @click="prev" aria-label="上個月">‹</button>
        <button class="ghost" @click="goToday">今天</button>
        <button @click="next" aria-label="下個月">›</button>
      </div>
    </header>

    <div class="weekrow">
      <div v-for="(w, i) in WEEK_LABELS_ZH" :key="i" class="weekday" :class="{ sun: i === 0, sat: i === 6 }">
        {{ w }}
      </div>
    </div>

    <div class="grid">
      <div
        v-for="cell in cells"
        :key="cell.key"
        class="cell"
        :class="{
          'out-of-month': !cell.inMonth,
          'today': cell.key === todayKey,
          'sun': cell.dow === 0,
          'sat': cell.dow === 6,
        }"
      >
        <div class="date-num">{{ cell.date }}</div>
        <div class="events">
          <EventCard
            v-for="ev in (eventsByDay.get(cell.key) ?? [])"
            :key="ev.id"
            :event="ev"
            :compact="true"
            @select="selected = $event"
          />
        </div>
      </div>
    </div>

    <EventDetailModal :event="liveSelected" @close="selected = null" @select="selected = $event" />

    <p v-if="eventsStore.events.length === 0" class="empty">
      還沒有任何活動。<router-link to="/events">先去新增第一場</router-link>。
    </p>
  </section>
</template>

<style scoped>
.month { padding: .75rem 1rem 1.5rem; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: .75rem; }
.head h2 { margin: 0; font-size: 1.2rem; }
.nav { display: flex; gap: .25rem; }
.nav button {
  padding: .35rem .75rem; border: 1px solid #ccc; border-radius: 6px;
  background: #fff; color: #333; cursor: pointer; font-size: 1rem;
}
.nav button.ghost { background: #f3f4f6; }
.weekrow {
  display: grid; grid-template-columns: repeat(7, 1fr);
  font-size: .75rem; color: #666; text-align: center;
  border-bottom: 1px solid #e5e7eb; padding-bottom: .25rem;
}
.weekday.sun { color: #ef4444; }
.weekday.sat { color: #2563eb; }
.grid {
  display: grid; grid-template-columns: repeat(7, 1fr);
  gap: 1px; background: #e5e7eb; border: 1px solid #e5e7eb;
}
.cell {
  background: #fff; min-height: 5.5rem;
  padding: .15rem .2rem; display: flex; flex-direction: column; gap: .15rem;
  overflow: hidden;
}
.cell.out-of-month { background: #fafafa; color: #bbb; }
.cell.today { background: #fff7ed; }
.cell.today .date-num { color: #ea580c; font-weight: 700; }
.date-num { font-size: .75rem; text-align: right; padding-right: .15rem; }
.cell.sun .date-num { color: #ef4444; }
.cell.sat .date-num { color: #2563eb; }
.cell.out-of-month .date-num { color: #ccc; }
.events { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
.empty { text-align: center; color: #888; padding: 2rem 0; }

@media (max-width: 480px) {
  .month { padding: .5rem; }
  .cell { min-height: 4.5rem; }
  .date-num { font-size: .7rem; }
}
</style>
