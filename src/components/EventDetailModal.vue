<script setup>
import { ref, computed, watch } from 'vue'
import { useEventsStore, STATUSES } from '../stores/events.js'
import { useIdolsStore } from '../stores/idols.js'
import { formatInTz } from '../lib/time.js'
import { tzCodeOf } from '../lib/timezones.js'
import EventForm from './EventForm.vue'
import IdolChip from './IdolChip.vue'
import { serializeIcs, downloadIcs } from '../lib/icalSerializer.js'

const props = defineProps({
  event: { type: Object, default: null },
})
const emit = defineEmits(['close', 'select'])

const eventsStore = useEventsStore()
const idolsStore = useIdolsStore()

const conflicts = computed(() =>
  props.event ? eventsStore.conflictsOf(props.event.id) : []
)
function jumpTo(ev) {
  // re-emit close so parent can re-open with new event; simplest: have parent handle via watch
  emit('close')
  // small timeout: parent should receive close, then we set selected via emit('select')
  setTimeout(() => emit('select', ev), 0)
}

const editing = ref(false)
watch(() => props.event, () => { editing.value = false })

const idols = computed(() =>
  props.event?.idolIds.map(id => idolsStore.byId(id)).filter(Boolean) ?? []
)
const statusLabel = computed(() =>
  STATUSES.find(s => s.value === props.event?.status)?.label ?? props.event?.status
)
const isPast = computed(() => {
  if (!props.event?.startAt) return false
  return new Date(props.event.startAt).getTime() < Date.now()
})

function close() { emit('close') }
function startEdit() { editing.value = true }
function onSubmit(payload) {
  if (!props.event) return
  eventsStore.update(props.event.id, payload)
  editing.value = false
  emit('close')
}
function exportIcs() {
  if (!props.event) return
  const result = serializeIcs([props.event])
  if (!result.ok) return alert(`匯出失敗：${result.reason}`)
  const safeTitle = props.event.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60)
  downloadIcs(`oshi-cal-${safeTitle}.ics`, result.ics)
}
function onDelete() {
  if (!props.event) return
  if (confirm(`確定刪除「${props.event.title}」？`)) {
    eventsStore.remove(props.event.id)
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="event" class="backdrop" @click.self="close">
      <div class="dialog" role="dialog" aria-modal="true">
        <button class="close" @click="close" aria-label="關閉">×</button>

        <div v-if="!editing" class="detail">
          <h3>
            {{ event.title }}
            <span v-if="isPast" class="past-tag">已過</span>
            <span v-if="conflicts.length" class="conflict-tag" title="時間衝突">⚠️ {{ conflicts.length }} 場衝突</span>
          </h3>

          <div v-if="conflicts.length" class="conflict-box">
            <p>時間衝突的活動：</p>
            <ul>
              <li v-for="c in conflicts" :key="c.id">
                <button type="button" class="link" @click="jumpTo(c)">
                  {{ formatInTz(c.startAt, c.timezone) }} {{ tzCodeOf(c.timezone) }} · {{ c.title }}
                </button>
              </li>
            </ul>
          </div>

          <dl>
            <dt>開始</dt><dd>{{ formatInTz(event.startAt, event.timezone) }} <span class="muted">{{ tzCodeOf(event.timezone) }}</span></dd>
            <dt v-if="event.endAt">結束</dt><dd v-if="event.endAt">{{ formatInTz(event.endAt, event.timezone) }} <span class="muted">{{ tzCodeOf(event.timezone) }}</span></dd>
            <dt>地點</dt><dd>{{ event.venue || '—' }}</dd>
            <dt>狀態</dt><dd>{{ statusLabel }}</dd>
            <dt>推し</dt>
            <dd>
              <span v-if="!idols.length" class="muted">—</span>
              <IdolChip v-for="i in idols" :key="i.id" :idol="i" size="md" />
            </dd>
            <dt v-if="event.ticketPrice != null">票價</dt>
            <dd v-if="event.ticketPrice != null">¥{{ event.ticketPrice.toLocaleString() }}</dd>
            <dt v-if="event.ticketUrl">購票</dt>
            <dd v-if="event.ticketUrl">
              <a :href="event.ticketUrl" target="_blank" rel="noopener">{{ event.ticketUrl }}</a>
            </dd>
            <dt v-if="event.sourceUrl">來源</dt>
            <dd v-if="event.sourceUrl">
              <a :href="event.sourceUrl" target="_blank" rel="noopener">Eventernote</a>
            </dd>
            <dt v-if="event.notes">筆記</dt>
            <dd v-if="event.notes" class="notes">{{ event.notes }}</dd>
          </dl>
          <div class="actions">
            <button @click="startEdit">編輯</button>
            <button class="ghost" @click="exportIcs">匯出 iCal</button>
            <button class="danger" @click="onDelete">刪除</button>
            <button class="ghost" @click="close">關閉</button>
          </div>
        </div>

        <div v-else class="edit">
          <h3>編輯活動</h3>
          <EventForm :initial="event" @submit="onSubmit" @cancel="editing = false" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; z-index: 100;
  padding: 1rem;
}
.dialog {
  background: #fff; border-radius: 12px; max-width: 540px; width: 100%;
  max-height: 90vh; overflow-y: auto;
  padding: 1.25rem; position: relative;
}
.close {
  position: absolute; top: .5rem; right: .75rem;
  width: 2rem; height: 2rem; border: none; background: transparent;
  font-size: 1.5rem; cursor: pointer; color: #666;
}
.detail h3, .edit h3 { margin: 0 0 1rem; padding-right: 2rem; }
.past-tag {
  font-size: .7rem; padding: .15rem .5rem; border-radius: 999px;
  background: #f3f4f6; color: #888; margin-left: .5rem; vertical-align: middle;
}
.conflict-tag {
  font-size: .7rem; padding: .15rem .5rem; border-radius: 999px;
  background: #fef3c7; color: #92400e; margin-left: .5rem; vertical-align: middle;
}
.conflict-box {
  background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px;
  padding: .5rem .75rem; margin-bottom: 1rem; font-size: .9rem;
}
.conflict-box p { margin: 0 0 .35rem; color: #92400e; }
.conflict-box ul { margin: 0; padding-left: 1.2rem; }
.conflict-box .link {
  background: none; border: none; padding: 0; color: #2563eb;
  cursor: pointer; text-align: left; font: inherit;
}
.conflict-box .link:hover { text-decoration: underline; }
dl { display: grid; grid-template-columns: 4rem 1fr; gap: .35rem .75rem; margin: 0 0 1rem; }
dt { color: #555; font-size: .9rem; }
dd { margin: 0; }
.muted { color: #888; font-size: .85rem; }
.chip {
  display: inline-block; margin: .1rem .25rem .1rem 0;
  padding: .15rem .5rem; border-radius: 999px;
  font-size: .8rem; color: #fff; font-weight: 500;
}
.notes { white-space: pre-wrap; font-size: .9rem; color: #333; }
dd a { color: #2563eb; word-break: break-all; }
.actions { display: flex; gap: .5rem; justify-content: flex-end; flex-wrap: wrap; }
.actions button {
  padding: .5rem 1rem; border-radius: 6px; border: 1px solid #ccc;
  background: #111; color: #fff; cursor: pointer;
}
.actions button.ghost { background: #fff; color: #333; }
.actions button.danger { background: #fff; color: #ef4444; border-color: #ef4444; }
</style>
