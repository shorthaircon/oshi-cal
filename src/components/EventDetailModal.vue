<script setup>
import { ref, computed, watch } from 'vue'
import { useEventsStore, STATUSES } from '../stores/events.js'
import { useIdolsStore } from '../stores/idols.js'
import { formatInTz, formatDateInTz, formatTimeInTz } from '../lib/time.js'
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
  emit('close')
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
function onDelete() {
  if (!props.event) return
  if (confirm(`確定刪除「${props.event.title}」？`)) {
    eventsStore.remove(props.event.id)
    emit('close')
  }
}
function exportIcs() {
  if (!props.event) return
  const result = serializeIcs([props.event])
  if (!result.ok) return alert(`匯出失敗：${result.reason}`)
  const safeTitle = props.event.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60)
  downloadIcs(`oshi-cal-${safeTitle}.ics`, result.ics)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="event" class="modal-bg" @click.self="close">
      <div class="modal" role="dialog" aria-modal="true">
        <button class="modal-close" @click="close" aria-label="關閉">×</button>

        <div v-if="!editing" class="detail">
          <div class="modal-eyebrow">— Event Detail —</div>
          <h3 class="modal-title">
            {{ event.title }}
            <span v-if="isPast" class="past-tag">已結束</span>
          </h3>

          <div v-if="conflicts.length" class="conflict-box">
            <strong>⚠ 時間衝突 · {{ conflicts.length }} 場</strong>
            <ul>
              <li v-for="c in conflicts" :key="c.id">
                <button type="button" class="link" @click="jumpTo(c)">
                  {{ formatInTz(c.startAt, c.timezone) }} {{ tzCodeOf(c.timezone) }} · {{ c.title }}
                </button>
              </li>
            </ul>
          </div>

          <dl class="modal-dl">
            <dt>日期</dt>
            <dd>
              <span class="dl-num">{{ formatDateInTz(event.startAt, event.timezone) }}</span>
              <span class="muted">{{ tzCodeOf(event.timezone) }}</span>
            </dd>
            <template v-if="event.timeUnknown">
              <dt>時間</dt>
              <dd>
                <span class="time-tbd">時間待確認</span>
                <a v-if="event.sourceUrl" :href="event.sourceUrl" target="_blank" rel="noopener" class="modal-link sm">至 Eventernote 確認 →</a>
              </dd>
            </template>
            <template v-else>
              <dt>開演</dt>
              <dd>
                <span class="dl-num">{{ formatTimeInTz(event.startAt, event.timezone) }}</span>
              </dd>
              <template v-if="event.endAt">
                <dt>終演</dt>
                <dd>
                  <span class="dl-num">{{ formatTimeInTz(event.endAt, event.timezone) }}</span>
                </dd>
              </template>
            </template>
            <dt>地點</dt>
            <dd>{{ event.venue || '—' }}</dd>
            <dt>狀態</dt>
            <dd><span class="status-pill" :class="`s-${event.status}`">{{ statusLabel }}</span></dd>
            <dt>推し</dt>
            <dd class="dd-chips">
              <span v-if="!idols.length" class="muted">—</span>
              <IdolChip v-for="i in idols" :key="i.id" :idol="i" size="md" />
            </dd>
            <template v-if="event.ticketPrice != null">
              <dt>票價</dt>
              <dd class="dl-num">¥{{ event.ticketPrice.toLocaleString() }}</dd>
            </template>
            <template v-if="event.ticketUrl">
              <dt>購票</dt>
              <dd><a :href="event.ticketUrl" target="_blank" rel="noopener" class="modal-link">{{ event.ticketUrl }}</a></dd>
            </template>
            <template v-if="event.sourceUrl">
              <dt>來源</dt>
              <dd><a :href="event.sourceUrl" target="_blank" rel="noopener" class="modal-link">Eventernote</a></dd>
            </template>
            <template v-if="event.notes">
              <dt>筆記</dt>
              <dd class="modal-notes">{{ event.notes }}</dd>
            </template>
          </dl>

          <div class="modal-actions">
            <button class="btn-solid" @click="startEdit">編輯</button>
            <button class="btn-ghost" @click="exportIcs">匯出 iCal</button>
            <button class="btn-ghost danger" @click="onDelete">刪除</button>
            <button class="btn-ghost" @click="close">關閉</button>
          </div>
        </div>

        <div v-else class="edit">
          <div class="modal-eyebrow">— Edit Event —</div>
          <h3 class="modal-title">編輯活動</h3>
          <EventForm :initial="event" @submit="onSubmit" @cancel="editing = false" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-bg {
  position: fixed; inset: 0;
  background: rgba(59, 31, 43, 0.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; padding: 1rem;
}
.modal {
  background: var(--paper);
  border: 2px solid var(--ink);
  border-radius: 4px;
  box-shadow: 0 16px 48px rgba(59, 31, 43, 0.25);
  max-width: 540px; width: 100%;
  max-height: 90vh; overflow-y: auto;
  padding: 2rem 1.75rem 1.5rem;
  position: relative;
  text-align: left;
}
.modal-close {
  position: absolute; top: .5rem; right: .8rem;
  width: 2rem; height: 2rem;
  border: none; background: transparent;
  font-size: 1.6rem; cursor: pointer;
  color: var(--ink-soft);
}
.modal-eyebrow {
  font-family: var(--font-nav);
  font-size: .7rem; letter-spacing: .25em;
  color: var(--berry); text-transform: uppercase;
  font-weight: 500; text-align: center;
  margin-bottom: .5rem;
}
.modal-title {
  font-family: var(--font-jp);
  font-size: 1.2rem; font-weight: 700;
  margin: 0 0 1rem; color: var(--ink);
  text-align: center; padding: 0 1rem .75rem;
  border-bottom: 1px solid var(--line);
}
.past-tag {
  font-size: .7rem; padding: .15rem .5rem;
  border-radius: 999px;
  background: var(--gold); color: #fff;
  margin-left: .5rem; vertical-align: middle;
  font-family: var(--font-nav); letter-spacing: .1em;
  font-weight: 500;
}
.conflict-box {
  background: #fef0c7; border: 1px solid var(--gold);
  border-radius: 6px; padding: .6rem .75rem;
  margin-bottom: 1rem;
  display: flex; flex-direction: column; gap: .25rem;
  font-size: .85rem; color: #78350f;
}
.conflict-box ul { margin: .25rem 0 0; padding-left: 1rem; }
.conflict-box .link {
  background: none; border: none; padding: 0;
  color: var(--berry); cursor: pointer;
  text-align: left; font: inherit;
}
.conflict-box .link:hover { text-decoration: underline; }

.modal-dl {
  display: grid; grid-template-columns: 3.5rem 1fr;
  gap: .65rem .75rem;
  margin: 0 0 1.25rem;
  font-family: var(--font-body);
  align-items: center;
}
.modal-dl dt {
  font-family: var(--font-jp);
  color: var(--ink-soft);
  font-size: .85rem; letter-spacing: .05em;
  font-weight: 500;
}
.modal-dl dd {
  margin: 0; font-size: .9rem;
  color: var(--ink); line-height: 1.4;
}
.modal-dl .dl-num {
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
}
.modal-dl .muted { color: var(--ink-faint); margin-left: .35rem; font-size: .8rem; }
.dd-chips { display: flex; flex-wrap: wrap; gap: .35rem; }
.modal-link { color: var(--berry); word-break: break-all; }
.modal-link.sm { display: block; margin-top: .25rem; font-size: .8rem; }
.time-tbd {
  font-family: var(--font-jp); font-weight: 500;
  color: var(--berry);
  background: #fef0c7;
  padding: .15rem .55rem;
  border-radius: 4px;
  font-size: .85rem;
}
.modal-notes {
  background: var(--bg); border: 1px solid var(--line-soft);
  border-radius: 6px; padding: .5rem .75rem;
  white-space: pre-wrap; font-size: .85rem;
}

.status-pill {
  display: inline-flex; align-items: center;
  padding: .2rem .75rem; min-height: 1.6rem;
  box-sizing: border-box; border-radius: 999px;
  font-family: var(--font-jp); font-size: .85rem;
  font-weight: 500; line-height: 1;
  border: 1px solid rgba(0,0,0,0.12);
}
.s-going    { background: var(--status-going);    color: var(--status-going-fg);}
.s-waitlist { background: var(--status-waitlist); color: var(--status-waitlist-fg);}
.s-ticketed { background: var(--status-ticketed); color: var(--status-ticketed-fg);}
.s-attended { background: var(--status-attended); color: var(--status-attended-fg);}
.s-cancelled{ background: var(--status-cancelled);color: var(--status-cancelled-fg);}

.modal-actions {
  display: flex; gap: .5rem; justify-content: flex-end;
  flex-wrap: wrap;
  border-top: 1px solid var(--line);
  padding-top: 1rem;
}
.btn-solid {
  background: var(--ink); color: #fff;
  border: 2px solid var(--ink);
  padding: .55rem 1.2rem;
  font-family: var(--font-body);
  font-size: .9rem; font-weight: 500;
  cursor: pointer; border-radius: 6px;
  transition: all .2s; white-space: nowrap;
}
.btn-solid:hover { background: var(--berry); border-color: var(--berry); }
.btn-ghost {
  background: transparent; color: var(--ink-soft);
  border: 1px solid var(--line);
  padding: .55rem 1.2rem;
  font-family: var(--font-body); font-size: .9rem;
  cursor: pointer; border-radius: 6px;
  white-space: nowrap;
}
.btn-ghost:hover { color: var(--ink); border-color: var(--ink); }
.btn-ghost.danger { color: #ef4444; border-color: #fca5a5; }
.btn-ghost.danger:hover { color: #ef4444; border-color: #ef4444; background: #fff5f5; }
</style>
