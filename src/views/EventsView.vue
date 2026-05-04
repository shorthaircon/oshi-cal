<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventsStore, STATUSES } from '../stores/events.js'
import { useIdolsStore } from '../stores/idols.js'
import EventForm from '../components/EventForm.vue'
import ImportEventPanel from '../components/ImportEventPanel.vue'
import EventDetailModal from '../components/EventDetailModal.vue'
import IdolChip from '../components/IdolChip.vue'
import EmptyState from '../components/EmptyState.vue'
import { formatInTz } from '../lib/time.js'
import { tzCodeOf } from '../lib/timezones.js'

const route = useRoute()
const router = useRouter()
const eventsStore = useEventsStore()
const idolsStore = useIdolsStore()
const mode = ref('list')
const fallbackInitial = ref(null)
const selected = ref(null)
const liveSelected = computed(() =>
  selected.value ? eventsStore.byId(selected.value.id) : null
)

const sorted = computed(() => {
  const all = eventsStore.events.filter(ev => ev.startAt)
  const now = Date.now()
  const future = all
    .filter(ev => new Date(ev.startAt).getTime() >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
  const past = all
    .filter(ev => new Date(ev.startAt).getTime() < now)
    .sort((a, b) => b.startAt.localeCompare(a.startAt))
  return [...future, ...past]
})

function startAdd() { fallbackInitial.value = null; mode.value = 'add' }
function startImport() { mode.value = 'import' }
function cancel() { mode.value = 'list'; fallbackInitial.value = null }
function onImportFallback({ partial, reason }) {
  alert(`自動解析失敗：${reason}\n已開啟手動表單，部分欄位已預填。`)
  fallbackInitial.value = {
    title: partial.title ?? '',
    startAt: partial.startAt ?? null,
    endAt: partial.endAt ?? null,
    venue: partial.venue ?? '',
    sourceUrl: partial.sourceUrl ?? null,
    timezone: partial.timezone ?? 'Asia/Tokyo',
    idolIds: [],
    status: 'going',
  }
  mode.value = 'add'
}
function onSubmit(payload) {
  if (mode.value === 'add') eventsStore.add(payload)
  cancel()
}
function statusLabel(v) {
  return STATUSES.find(s => s.value === v)?.label ?? v
}
function idolsOf(ev) {
  return ev.idolIds.map(id => idolsStore.byId(id)).filter(Boolean)
}
function isPast(ev) {
  if (!ev.startAt) return false
  return new Date(ev.startAt).getTime() < Date.now()
}

function checkImportQuery() {
  if (route.query.import === '1') {
    mode.value = 'import'
    router.replace({ path: '/events', query: {} })
  }
}
onMounted(checkImportQuery)
watch(() => route.query.import, checkImportQuery)
</script>

<template>
  <section class="view-events">
    <header class="page-head">
      <div class="brand-mark">— Events —</div>
      <h2 class="t-h2">活動</h2>
      <div v-if="mode === 'list'" class="head-actions">
        <button class="btn-solid" @click="startImport">
          貼 URL 匯入<span class="btn-sub">・Eventernote</span>
        </button>
        <button class="btn-ghost" @click="startAdd">+ 新增</button>
      </div>
    </header>

    <ImportEventPanel
      v-if="mode === 'import'"
      @done="cancel"
      @cancel="cancel"
      @fallback="onImportFallback"
    />

    <div v-if="mode === 'list'">
      <EmptyState v-if="sorted.length === 0" />
      <ul v-else class="agenda-list">
        <li v-for="ev in sorted" :key="ev.id" class="agenda-row" :class="{ past: isPast(ev) }" @click="selected = ev">
          <span class="status-pill abs-tr" :class="`s-${ev.status}`">{{ statusLabel(ev.status) }}</span>
          <div class="title-row">
            <strong class="title">{{ ev.title }}</strong>
            <span v-if="ev.notes" class="notes-inline">・ {{ ev.notes }}</span>
          </div>
          <div class="info-row">
            <span v-if="ev.timeUnknown" class="time">{{ formatInTz(ev.startAt, ev.timezone).split(' ')[0] }} ・ 時間待確認</span>
            <span v-else class="time">{{ formatInTz(ev.startAt, ev.timezone) }}</span>
            <span class="tz">{{ tzCodeOf(ev.timezone) }}</span>
          </div>
          <div v-if="ev.venue || ev.ticketPrice != null" class="meta-row">
            <span v-if="ev.venue" class="venue">📍 {{ ev.venue }}</span>
            <span v-if="ev.ticketPrice != null" class="price">¥{{ ev.ticketPrice.toLocaleString() }}</span>
          </div>
          <div v-if="idolsOf(ev).length" class="chips">
            <IdolChip v-for="i in idolsOf(ev)" :key="i.id" :idol="i" size="sm" />
          </div>
        </li>
      </ul>
    </div>

    <div v-else-if="mode === 'add'" class="form-stage">
      <div class="form-eyebrow">— New Event —</div>
      <h3 class="form-title">新增活動</h3>
      <EventForm
        :initial="fallbackInitial"
        @submit="onSubmit"
        @cancel="cancel"
      />
    </div>

    <EventDetailModal :event="liveSelected" @close="selected = null" @select="selected = $event" />
  </section>
</template>

<style scoped>
.page-head {
  text-align: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--line);
  position: relative;
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
  margin: 0 0 1rem;
}
.head-actions {
  display: flex; gap: .5rem;
  justify-content: center;
  flex-wrap: wrap;
}
.btn-solid {
  background: var(--ink); color: #fff;
  border: 2px solid var(--ink);
  padding: .75rem 1.2rem;
  min-height: 44px;
  font-family: var(--font-body);
  font-size: .9rem; font-weight: 500;
  cursor: pointer; border-radius: 6px;
  transition: all .2s; white-space: nowrap;
}
.btn-solid:hover { background: var(--berry); border-color: var(--berry); }
.btn-sub {
  font-size: .72rem;
  font-weight: 400;
  opacity: .8;
  margin-left: .15rem;
  letter-spacing: .02em;
}
.btn-ghost {
  background: transparent; color: var(--ink-soft);
  border: 1px solid var(--line);
  padding: .75rem 1.2rem;
  min-height: 44px;
  font-family: var(--font-body); font-size: .9rem;
  cursor: pointer; border-radius: 6px;
  white-space: nowrap;
}
.btn-ghost:hover { color: var(--ink); border-color: var(--ink); }

.empty {
  text-align: center;
  color: var(--ink-faint);
  padding: 2rem 0;
  font-family: var(--font-jp);
}
.agenda-list {
  list-style: none;
  padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: .6rem;
}
.agenda-row {
  position: relative;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: .65rem .85rem;
  padding-right: 5.5rem; /* room for absolute status pill */
  cursor: pointer;
  display: flex; flex-direction: column; gap: .3rem;
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
.title-row {
  display: flex;
  align-items: baseline;
  gap: .25rem;
  min-width: 0;
}
.title {
  font-family: var(--font-jp);
  font-size: .95rem;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 0;
}
.notes-inline {
  font-family: var(--font-jp);
  font-size: .78rem;
  color: var(--ink-faint);
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  max-width: 45%;
}
.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: .55rem;
  font-size: .78rem;
  color: var(--ink-soft);
  align-items: baseline;
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
}
.info-row .time { font-weight: 500; }
.info-row .tz {
  font-family: var(--font-nav);
  font-size: .65rem;
  letter-spacing: .1em;
  color: var(--ink-faint);
}
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: .55rem;
  font-size: .78rem;
  color: var(--ink-soft);
  align-items: baseline;
}
.meta-row .venue { font-family: var(--font-jp); }
.meta-row .price {
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  font-weight: 500;
}
.meta-row .venue + .price::before {
  content: '・';
  margin-right: .35rem;
  color: var(--ink-faint);
}
.status-pill {
  display: inline-flex;
  align-items: center;
  padding: .15rem .55rem;
  border-radius: 999px;
  font-family: var(--font-jp);
  font-size: .72rem;
  font-weight: 500;
  border: 1px solid rgba(0,0,0,0.12);
  white-space: nowrap;
}
.status-pill.abs-tr {
  position: absolute;
  top: .55rem;
  right: .65rem;
}
.s-going    { background: var(--status-going);    color: var(--status-going-fg); }
.s-waitlist { background: var(--status-waitlist); color: var(--status-waitlist-fg); }
.s-ticketed { background: var(--status-ticketed); color: var(--status-ticketed-fg); }
.s-attended { background: var(--status-attended); color: var(--status-attended-fg); }
.s-cancelled{ background: var(--status-cancelled);color: var(--status-cancelled-fg); }
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: .3rem;
}

.form-stage {
  background: var(--paper);
  border: 2px solid var(--ink);
  border-radius: 4px;
  padding: 2rem 1.5rem 1.5rem;
  box-shadow: 0 2px 0 var(--ink), 0 12px 24px rgba(59, 31, 43, 0.08);
  max-width: 540px;
  margin: 0 auto;
}
.form-eyebrow {
  font-family: var(--font-nav);
  font-size: .7rem; letter-spacing: .25em;
  color: var(--berry);
  text-transform: uppercase;
  font-weight: 500;
  text-align: center;
}
.form-title {
  font-family: var(--font-display);
  text-align: center;
  margin: .25rem 0 1.5rem;
  font-size: 1.5rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--ink);
}
</style>
