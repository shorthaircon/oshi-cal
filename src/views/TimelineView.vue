<script setup>
import { ref, computed } from 'vue'
import { useEventsStore, STATUSES } from '../stores/events.js'
import { useIdolsStore } from '../stores/idols.js'
import { formatJst, jstDateKey, jstTodayKey } from '../lib/time.js'
import EventDetailModal from '../components/EventDetailModal.vue'
import IdolChip from '../components/IdolChip.vue'

const eventsStore = useEventsStore()
const idolsStore = useIdolsStore()

const showPast = ref(false)

const todayKey = jstTodayKey()

const sorted = computed(() => {
  const list = eventsStore.events.filter(ev => {
    const k = jstDateKey(ev.startAt)
    if (!k) return false
    return showPast.value || k >= todayKey
  })
  return list.sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''))
})

const grouped = computed(() => {
  const map = new Map()
  for (const ev of sorted.value) {
    const k = jstDateKey(ev.startAt)
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(ev)
  }
  return Array.from(map.entries()) // [[key, events], ...]
})

function idolsOf(ev) {
  return ev.idolIds.map(id => idolsStore.byId(id)).filter(Boolean)
}
function statusLabel(v) {
  return STATUSES.find(s => s.value === v)?.label ?? v
}
function isPastKey(k) { return k < todayKey }
const selected = ref(null)
const liveSelected = computed(() =>
  selected.value ? eventsStore.byId(selected.value.id) : null
)
function formatDay(key) {
  const [y, m, d] = key.split('-').map(Number)
  const dow = ['日','一','二','三','四','五','六'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${y}/${String(m).padStart(2,'0')}/${String(d).padStart(2,'0')} (${dow})`
}
</script>

<template>
  <section class="timeline">
    <header class="head">
      <h2>時間軸</h2>
      <label class="toggle">
        <input type="checkbox" v-model="showPast" />
        顯示過去活動
      </label>
    </header>

    <p v-if="sorted.length === 0" class="empty">
      <template v-if="eventsStore.events.length === 0">
        還沒有活動。<router-link to="/events">去新增</router-link>。
      </template>
      <template v-else-if="!showPast">
        沒有未來活動。打開上方 toggle 看過去的。
      </template>
      <template v-else>沒有任何活動。</template>
    </p>

    <EventDetailModal :event="liveSelected" @close="selected = null" />

    <div v-for="[key, list] in grouped" :key="key" class="day">
      <div class="day-head" :class="{ past: isPastKey(key), today: key === todayKey }">
        <span class="day-key">{{ formatDay(key) }}</span>
        <span v-if="key === todayKey" class="today-tag">今天</span>
        <span v-else-if="isPastKey(key)" class="past-tag">已過</span>
      </div>
      <ul class="list">
        <li v-for="ev in list" :key="ev.id" class="card" @click="selected = ev">
          <div class="line1">
            <span class="time">{{ formatJst(ev.startAt).split(' ')[1] }}</span>
            <strong class="title">{{ ev.title }}</strong>
            <span class="status" :data-s="ev.status">{{ statusLabel(ev.status) }}</span>
          </div>
          <div v-if="idolsOf(ev).length" class="chips">
            <IdolChip v-for="i in idolsOf(ev)" :key="i.id" :idol="i" size="sm" />
          </div>
          <div class="meta">
            <span v-if="ev.venue">📍 {{ ev.venue }}</span>
            <span v-if="ev.ticketPrice != null">¥{{ ev.ticketPrice.toLocaleString() }}</span>
            <a v-if="ev.ticketUrl" :href="ev.ticketUrl" target="_blank" rel="noopener">購票</a>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.timeline { padding: 1rem; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.head h2 { margin: 0; }
.toggle { font-size: .85rem; color: #555; display: flex; align-items: center; gap: .35rem; }
.empty { text-align: center; color: #888; padding: 2rem 0; }

.day { margin-bottom: 1rem; }
.day-head {
  font-size: .85rem; color: #555; padding: .25rem 0;
  border-bottom: 1px solid #e5e7eb; margin-bottom: .5rem;
  display: flex; gap: .5rem; align-items: center;
}
.day-head.today { color: #ea580c; font-weight: 600; }
.day-head.past { color: #999; }
.today-tag { background: #fff7ed; color: #ea580c; font-size: .7rem; padding: .1rem .4rem; border-radius: 999px; }
.past-tag { background: #f3f4f6; color: #888; font-size: .7rem; padding: .1rem .4rem; border-radius: 999px; }
.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .5rem; }
.card { background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: .6rem .75rem; cursor: pointer; }
.card:hover { background: #f3f4f6; }
.line1 { display: flex; align-items: center; gap: .5rem; margin-bottom: .25rem; }
.time { font-family: monospace; font-size: .85rem; color: #444; min-width: 3.5rem; }
.title { flex: 1; font-size: .95rem; }
.status { font-size: .7rem; padding: .1rem .5rem; border-radius: 999px; background: #e5e7eb; color: #374151; }
.status[data-s="ticketed"] { background: #dbeafe; color: #1e40af; }
.status[data-s="attended"] { background: #d1fae5; color: #065f46; }
.status[data-s="cancelled"] { background: #fee2e2; color: #991b1b; }
.chips { display: flex; flex-wrap: wrap; gap: .25rem; margin: .25rem 0; }
.chip { font-size: .7rem; padding: .1rem .5rem; border-radius: 999px; color: #fff; font-weight: 500; }
.meta { display: flex; gap: 1rem; font-size: .8rem; color: #555; flex-wrap: wrap; }
.meta a { color: #2563eb; }
</style>
