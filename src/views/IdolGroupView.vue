<script setup>
import { ref, computed } from 'vue'
import { useEventsStore } from '../stores/events.js'
import { useIdolsStore } from '../stores/idols.js'
import { formatJst, jstDateKey, jstTodayKey } from '../lib/time.js'
import { readableTextOn } from '../lib/colors.js'
import EventDetailModal from '../components/EventDetailModal.vue'
import IdolChip from '../components/IdolChip.vue'

const eventsStore = useEventsStore()
const idolsStore = useIdolsStore()

const todayKey = jstTodayKey()
const showPast = ref({}) // { [idolId]: bool }
const selected = ref(null)

const liveSelected = computed(() =>
  selected.value ? eventsStore.byId(selected.value.id) : null
)

const groups = computed(() => {
  return idolsStore.idols.map(idol => {
    const all = eventsStore.events
      .filter(ev => ev.idolIds.includes(idol.id))
      .sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''))
    const future = all.filter(ev => jstDateKey(ev.startAt) >= todayKey)
    const past = all.filter(ev => jstDateKey(ev.startAt) < todayKey)
    const next = future[0] ?? null
    return { idol, all, future, past, next }
  })
})

function toggle(idolId) {
  showPast.value[idolId] = !showPast.value[idolId]
}

function daysUntil(iso) {
  if (!iso) return null
  const evKey = jstDateKey(iso)
  const [ey, em, ed] = evKey.split('-').map(Number)
  const [ty, tm, td] = todayKey.split('-').map(Number)
  const e = Date.UTC(ey, em - 1, ed)
  const t = Date.UTC(ty, tm - 1, td)
  return Math.round((e - t) / (24 * 60 * 60 * 1000))
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
    <h2>依推し</h2>

    <p v-if="idolsStore.idols.length === 0" class="empty">
      還沒有推し。<router-link to="/idols">先去新增</router-link>。
    </p>

    <EventDetailModal :event="liveSelected" @close="selected = null" />

    <div v-for="g in groups" :key="g.idol.id" class="group">
      <header class="g-head" :style="{ background: g.idol.color, color: readableTextOn(g.idol.color) }">
        <span class="dot" :style="{ background: g.idol.color }" />
        <span class="name">{{ g.idol.name }}</span>
        <span class="count">{{ g.all.length }} 場</span>
        <span class="next" v-if="g.next">下次：{{ countdownLabel(g.next) }}</span>
        <span class="next muted" v-else>無未來活動</span>
      </header>

      <ul v-if="g.future.length || (showPast[g.idol.id] && g.past.length)" class="list">
        <li
          v-for="ev in g.future"
          :key="ev.id"
          class="card"
          @click="selected = ev"
        >
          <div class="line1">
            <span class="time">{{ formatJst(ev.startAt) }}</span>
            <strong class="title">{{ ev.title }}</strong>
          </div>
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
            class="card past"
            @click="selected = ev"
          >
            <div class="line1">
              <span class="time">{{ formatJst(ev.startAt) }}</span>
              <strong class="title">{{ ev.title }}</strong>
              <span class="past-tag">已過</span>
            </div>
            <div class="meta">
              <span v-if="ev.venue">📍 {{ ev.venue }}</span>
            </div>
          </li>
        </template>
      </ul>
      <p v-else class="g-empty muted">沒有未來活動。</p>

      <button
        v-if="g.past.length"
        class="toggle"
        @click="toggle(g.idol.id)"
      >
        {{ showPast[g.idol.id] ? '隱藏' : '顯示' }}過去 {{ g.past.length }} 場
      </button>
    </div>
  </section>
</template>

<style scoped>
.page { padding: 1rem; }
.empty { text-align: center; color: #888; padding: 2rem 0; }

.group {
  margin-bottom: 1.25rem;
  border-radius: 8px; overflow: hidden;
  border: 1px solid #e5e7eb; background: #fff;
}
.g-head {
  display: flex; align-items: center; gap: .6rem;
  padding: .6rem .8rem;
  font-size: .95rem; font-weight: 500;
}
.g-head .dot { display: none; }
.g-head .name { flex: 1; }
.g-head .count { font-size: .8rem; opacity: .85; }
.g-head .next { font-size: .8rem; opacity: .85; }
.g-head .muted { opacity: .65; }

.list { list-style: none; padding: 0; margin: 0; }
.card {
  padding: .55rem .8rem; border-top: 1px solid #f3f4f6;
  cursor: pointer;
}
.card:hover { background: #fafafa; }
.card.past { opacity: .65; }
.line1 { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; }
.time { font-family: monospace; font-size: .8rem; color: #666; }
.title { flex: 1; font-size: .9rem; }
.past-tag { font-size: .7rem; padding: .1rem .4rem; border-radius: 999px; background: #f3f4f6; color: #888; }
.meta { display: flex; gap: .5rem; flex-wrap: wrap; font-size: .75rem; color: #666; margin-top: .15rem; }
.multi { display: flex; gap: .25rem; flex-wrap: wrap; }

.g-empty { padding: .75rem .8rem; font-size: .85rem; }
.toggle {
  width: 100%; padding: .5rem; border: none; border-top: 1px solid #f3f4f6;
  background: #fafafa; color: #555; cursor: pointer; font-size: .8rem;
}
.toggle:hover { background: #f3f4f6; }
.muted { color: #888; }
</style>
