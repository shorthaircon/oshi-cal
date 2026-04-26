<script setup>
import { ref, computed } from 'vue'
import { useEventsStore, STATUSES } from '../stores/events.js'
import { useIdolsStore } from '../stores/idols.js'
import EventForm from '../components/EventForm.vue'

const eventsStore = useEventsStore()
const idolsStore = useIdolsStore()
const mode = ref('list')
const editingId = ref(null)

const editing = computed(() =>
  editingId.value ? eventsStore.byId(editingId.value) : null
)

const sorted = computed(() =>
  [...eventsStore.events].sort((a, b) => {
    const ax = a.startAt ?? ''
    const bx = b.startAt ?? ''
    return bx.localeCompare(ax)
  })
)

function startAdd() { editingId.value = null; mode.value = 'add' }
function startEdit(id) { editingId.value = id; mode.value = 'edit' }
function cancel() { mode.value = 'list'; editingId.value = null }
function onSubmit(payload) {
  if (mode.value === 'add') eventsStore.add(payload)
  else if (mode.value === 'edit' && editingId.value) eventsStore.update(editingId.value, payload)
  cancel()
}
function onDelete(ev) {
  if (confirm(`確定刪除「${ev.title}」？`)) eventsStore.remove(ev.id)
}
function fmt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
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
      <button v-if="mode === 'list'" class="add-btn" @click="startAdd">+ 新增</button>
    </header>

    <div v-if="mode === 'list'">
      <p v-if="sorted.length === 0" class="empty">
        還沒有任何活動，按右上「+ 新增」開始。
      </p>
      <ul v-else class="list">
        <li v-for="ev in sorted" :key="ev.id" class="item">
          <div class="line1">
            <strong>{{ ev.title }}</strong>
            <span class="status" :data-s="ev.status">{{ statusLabel(ev.status) }}</span>
          </div>
          <div class="line2">
            <span class="time">🕐 {{ fmt(ev.startAt) }}{{ ev.endAt ? ` ~ ${fmt(ev.endAt)}` : '' }}</span>
            <span v-if="ev.venue" class="venue">📍 {{ ev.venue }}</span>
          </div>
          <div v-if="idolsOf(ev).length" class="chips">
            <span v-for="i in idolsOf(ev)" :key="i.id" class="chip" :style="{ background: i.color }">
              {{ i.name }}
            </span>
          </div>
          <div v-if="ev.ticketPrice != null || ev.ticketUrl" class="meta">
            <span v-if="ev.ticketPrice != null">¥{{ ev.ticketPrice.toLocaleString() }}</span>
            <a v-if="ev.ticketUrl" :href="ev.ticketUrl" target="_blank" rel="noopener">購票</a>
          </div>
          <p v-if="ev.notes" class="notes">{{ ev.notes }}</p>
          <div class="actions">
            <button class="ghost" @click="startEdit(ev.id)">編輯</button>
            <button class="danger" @click="onDelete(ev)">刪除</button>
          </div>
        </li>
      </ul>
    </div>

    <div v-else class="form-wrap">
      <h3>{{ mode === 'add' ? '新增活動' : '編輯活動' }}</h3>
      <EventForm :initial="editing" @submit="onSubmit" @cancel="cancel" />
    </div>
  </section>
</template>

<style scoped>
.events { padding: 1rem; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.head h2 { margin: 0; }
.add-btn {
  padding: .4rem .8rem; border: none; border-radius: 6px;
  background: #111; color: #fff; cursor: pointer; font-size: .9rem;
}
.empty { padding: 2rem 0; text-align: center; color: #888; }
.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .75rem; }
.item {
  padding: .75rem; background: #fafafa; border: 1px solid #eee; border-radius: 8px;
  display: flex; flex-direction: column; gap: .35rem;
}
.line1 { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
.line2 { display: flex; flex-wrap: wrap; gap: .75rem; font-size: .85rem; color: #555; }
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
