<script setup>
import { ref, computed } from 'vue'
import { useEventsStore, STATUSES } from '../stores/events.js'
import { useIdolsStore } from '../stores/idols.js'
import EventForm from '../components/EventForm.vue'
import ImportEventPanel from '../components/ImportEventPanel.vue'
import EventDetailModal from '../components/EventDetailModal.vue'
import IdolChip from '../components/IdolChip.vue'
import { formatInTz } from '../lib/time.js'
import { tzCodeOf } from '../lib/timezones.js'

const eventsStore = useEventsStore()
const idolsStore = useIdolsStore()
const mode = ref('list') // 'list' | 'add' | 'import'
const fallbackInitial = ref(null)
const selected = ref(null)
const liveSelected = computed(() =>
  selected.value ? eventsStore.byId(selected.value.id) : null
)

const sorted = computed(() =>
  [...eventsStore.events].sort((a, b) => {
    const ax = a.startAt ?? ''
    const bx = b.startAt ?? ''
    return bx.localeCompare(ax)
  })
)

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
    idolIds: [],
    status: 'going',
  }
  mode.value = 'add'
}
function onSubmit(payload) {
  if (mode.value === 'add') eventsStore.add(payload)
  cancel()
}
const fmt = formatInTz
function statusLabel(v) {
  return STATUSES.find(s => s.value === v)?.label ?? v
}
function idolsOf(ev) {
  return ev.idolIds
    .map(id => idolsStore.byId(id))
    .filter(Boolean)
}
</script>

<template>
  <section class="events">
    <header class="head">
      <h2>活動</h2>
      <div v-if="mode === 'list'" class="head-actions">
        <button class="ghost-btn" @click="startImport">貼 URL 匯入</button>
        <button class="add-btn" @click="startAdd">+ 新增</button>
      </div>
    </header>

    <ImportEventPanel
      v-if="mode === 'import'"
      @done="cancel"
      @cancel="cancel"
      @fallback="onImportFallback"
    />

    <div v-if="mode === 'list'">
      <p v-if="sorted.length === 0" class="empty">
        還沒有任何活動，按右上「+ 新增」開始。
      </p>
      <ul v-else class="list">
        <li v-for="ev in sorted" :key="ev.id" class="item" @click="selected = ev">
          <div class="line1">
            <strong>{{ ev.title }}</strong>
            <span class="status" :data-s="ev.status">{{ statusLabel(ev.status) }}</span>
          </div>
          <div class="line2">
            <span class="time">🕐 {{ fmt(ev.startAt, ev.timezone) }}{{ ev.endAt ? ` ~ ${fmt(ev.endAt, ev.timezone)}` : '' }} <span class="tz">{{ tzCodeOf(ev.timezone) }}</span></span>
            <span v-if="ev.venue" class="venue">📍 {{ ev.venue }}</span>
          </div>
          <div v-if="idolsOf(ev).length" class="chips">
            <IdolChip v-for="i in idolsOf(ev)" :key="i.id" :idol="i" size="sm" />
          </div>
          <div v-if="ev.ticketPrice != null || ev.ticketUrl" class="meta">
            <span v-if="ev.ticketPrice != null">¥{{ ev.ticketPrice.toLocaleString() }}</span>
            <a v-if="ev.ticketUrl" :href="ev.ticketUrl" target="_blank" rel="noopener">購票</a>
          </div>
          <p v-if="ev.notes" class="notes">{{ ev.notes }}</p>
        </li>
      </ul>
    </div>

    <div v-else-if="mode === 'add'" class="form-wrap">
      <h3>新增活動</h3>
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
.events { padding: 1rem; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.head h2 { margin: 0; }
.head-actions { display: flex; gap: .5rem; }
.add-btn {
  padding: .4rem .8rem; border: none; border-radius: 6px;
  background: #111; color: #fff; cursor: pointer; font-size: .9rem;
}
.ghost-btn {
  padding: .4rem .8rem; border: 1px solid #ccc; border-radius: 6px;
  background: #fff; color: #333; cursor: pointer; font-size: .9rem;
}
.empty { padding: 2rem 0; text-align: center; color: #888; }
.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .75rem; }
.item {
  padding: .75rem; background: #fafafa; border: 1px solid #eee; border-radius: 8px;
  display: flex; flex-direction: column; gap: .35rem;
  cursor: pointer;
}
.item:hover { background: #f3f4f6; }
.line1 { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
.line2 { display: flex; flex-wrap: wrap; gap: .75rem; font-size: .85rem; color: #555; }
.tz { font-size: .7rem; color: #999; }
.status {
  font-size: .75rem; padding: .15rem .5rem; border-radius: 999px;
  background: #e5e7eb; color: #374151;
}
.status[data-s="ticketed"] { background: #dbeafe; color: #1e40af; }
.status[data-s="attended"] { background: #d1fae5; color: #065f46; }
.status[data-s="cancelled"] { background: #fee2e2; color: #991b1b; }
.chips { display: flex; flex-wrap: wrap; gap: .35rem; }
.chip {
  font-size: .75rem; padding: .15rem .5rem; border-radius: 999px;
  color: #fff; font-weight: 500;
}
.meta { display: flex; gap: 1rem; font-size: .85rem; }
.notes { margin: .35rem 0 0; font-size: .85rem; color: #555; white-space: pre-wrap; }
.actions { display: flex; gap: .5rem; margin-top: .25rem; }
.actions button {
  padding: .3rem .6rem; border: 1px solid #ccc; border-radius: 4px;
  background: #fff; cursor: pointer; font-size: .8rem;
}
.actions button.danger { border-color: #ef4444; color: #ef4444; }
.form-wrap { max-width: 540px; }
.form-wrap h3 { margin-top: 0; }
</style>
