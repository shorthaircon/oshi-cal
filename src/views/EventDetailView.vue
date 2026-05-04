<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventsStore, STATUSES } from '../stores/events.js'
import { useIdolsStore } from '../stores/idols.js'
import { formatInTz, formatDateInTz, formatTimeInTz } from '../lib/time.js'
import { tzCodeOf } from '../lib/timezones.js'
import EventForm from '../components/EventForm.vue'
import IdolChip from '../components/IdolChip.vue'
import { serializeIcs, downloadIcs } from '../lib/icalSerializer.js'
import { countdownInfo } from '../lib/countdown.js'

const route = useRoute()
const router = useRouter()
const eventsStore = useEventsStore()
const idolsStore = useIdolsStore()

const event = computed(() => eventsStore.byId(route.params.id))

const editing = ref(false)
watch(() => route.params.id, () => { editing.value = false })

const conflicts = computed(() =>
  event.value ? eventsStore.conflictsOf(event.value.id) : []
)
const idols = computed(() =>
  event.value?.idolIds.map(id => idolsStore.byId(id)).filter(Boolean) ?? []
)
const statusLabel = computed(() =>
  STATUSES.find(s => s.value === event.value?.status)?.label ?? event.value?.status
)
const isPast = computed(() => {
  if (!event.value?.startAt) return false
  return new Date(event.value.startAt).getTime() < Date.now()
})
const countdown = computed(() => countdownInfo(event.value))

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/events')
}

function jumpTo(ev) {
  router.push({ name: 'event-detail', params: { id: ev.id } })
}

function startEdit() { editing.value = true }
function onSubmit(payload) {
  if (!event.value) return
  eventsStore.update(event.value.id, payload)
  editing.value = false
}
function onDelete() {
  if (!event.value) return
  if (confirm(`確定刪除「${event.value.title}」？`)) {
    eventsStore.remove(event.value.id)
    goBack()
  }
}
function exportIcs() {
  if (!event.value) return
  const result = serializeIcs([event.value])
  if (!result.ok) return alert(`匯出失敗：${result.reason}`)
  const safeTitle = event.value.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60)
  downloadIcs(`oshi-cal-${safeTitle}.ics`, result.ics)
}
</script>

<template>
  <section v-if="event" class="event-detail">
    <header class="detail-toolbar">
      <button class="back-btn" type="button" @click="goBack">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        返回
      </button>
      <div v-if="!editing" class="actions">
        <button class="action-btn primary" type="button" @click="startEdit" aria-label="編輯">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
          </svg>
        </button>
        <button class="action-btn" type="button" @click="exportIcs" aria-label="匯出 iCal">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
          iCal
        </button>
        <button class="action-btn danger" type="button" @click="onDelete" aria-label="刪除">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 6h18"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" x2="10" y1="11" y2="17"/>
            <line x1="14" x2="14" y1="11" y2="17"/>
          </svg>
        </button>
      </div>
    </header>

    <div class="detail-body">
      <div v-if="!editing">
        <div class="eyebrow">— Event Detail —</div>
        <h1 class="title">
          {{ event.title }}
          <span v-if="isPast" class="past-tag">已結束</span>
        </h1>
        <div v-if="countdown" class="countdown-wrap">
          <span class="countdown-big" :class="{ urgent: countdown.urgent }">
            <template v-if="countdown.urgent">{{ countdown.label }}</template>
            <template v-else><span class="num">{{ countdown.days }}</span> 天後</template>
          </span>
        </div>

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

        <dl class="detail-dl">
          <dt>日期</dt>
          <dd>
            <span class="dl-num">{{ formatDateInTz(event.startAt, event.timezone) }}</span>
            <span class="muted">{{ tzCodeOf(event.timezone) }}</span>
          </dd>
          <template v-if="event.timeUnknown">
            <dt>時間</dt>
            <dd>
              <span class="time-tbd">時間待確認</span>
              <a v-if="event.sourceUrl" :href="event.sourceUrl" target="_blank" rel="noopener" class="ext-link sm">至 Eventernote 確認 →</a>
            </dd>
          </template>
          <template v-else>
            <dt>開演</dt>
            <dd><span class="dl-num">{{ formatTimeInTz(event.startAt, event.timezone) }}</span></dd>
            <template v-if="event.endAt">
              <dt>終演</dt>
              <dd><span class="dl-num">{{ formatTimeInTz(event.endAt, event.timezone) }}</span></dd>
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
            <dd><a :href="event.ticketUrl" target="_blank" rel="noopener" class="ext-link">{{ event.ticketUrl }}</a></dd>
          </template>
          <template v-if="event.sourceUrl">
            <dt>來源</dt>
            <dd><a :href="event.sourceUrl" target="_blank" rel="noopener" class="ext-link">Eventernote</a></dd>
          </template>
          <template v-if="event.notes">
            <dt>筆記</dt>
            <dd class="detail-notes">{{ event.notes }}</dd>
          </template>
        </dl>
      </div>

      <div v-else>
        <div class="eyebrow">— Edit Event —</div>
        <h1 class="title">編輯活動</h1>
        <EventForm :initial="event" @submit="onSubmit" @cancel="editing = false" />
      </div>
    </div>
  </section>

  <section v-else class="not-found">
    <p>找不到這場活動</p>
    <button class="back-btn" @click="goBack">回列表</button>
  </section>
</template>

<style scoped>
.event-detail { text-align: left; }

.detail-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
  padding: .55rem .25rem;
  border-bottom: 2px solid var(--ink);
  background: var(--paper);
  position: sticky;
  top: 0;
  z-index: 50;
  margin: -.5rem 0 1rem;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: .15rem;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: .55rem .85rem .55rem .55rem;
  min-height: 44px;
  font-family: var(--font-body);
  font-size: .9rem;
  color: var(--ink);
  cursor: pointer;
  font-weight: 500;
  transition: all .15s;
}
.back-btn:hover { background: var(--bg); border-color: var(--ink); }
.actions { display: flex; gap: .35rem; }
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .35rem;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: .5rem .65rem;
  min-height: 44px;
  min-width: 44px;
  font-family: var(--font-body);
  font-size: .85rem;
  color: var(--ink-soft);
  cursor: pointer;
  font-weight: 500;
  transition: all .15s;
}
.action-btn:hover { color: var(--ink); border-color: var(--ink); background: #fff; }
.action-btn.primary {
  background: var(--ink); color: #fff; border-color: var(--ink);
}
.action-btn.primary:hover { background: var(--berry); border-color: var(--berry); }
.action-btn.danger {
  color: #A04545;
  border-color: rgba(160, 69, 69, .35);
}
.action-btn.danger:hover {
  background: #A04545; color: #fff; border-color: #A04545;
}
.action-btn svg { display: block; }

.detail-body { padding: 0 .25rem; }

.eyebrow {
  font-family: var(--font-nav);
  font-size: .7rem;
  letter-spacing: .25em;
  text-transform: uppercase;
  color: var(--berry);
  font-weight: 500;
  text-align: center;
  margin-bottom: .35rem;
}
.title {
  font-family: var(--font-jp);
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 .65rem;
  color: var(--ink);
  text-align: center;
  padding: 0 .5rem;
  line-height: 1.4;
}
.title:last-child {
  margin-bottom: 1rem;
  padding-bottom: .85rem;
  border-bottom: 1px solid var(--line);
}
.countdown-wrap {
  text-align: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--line);
  margin-bottom: 1rem;
}
.past-tag {
  font-size: .65rem; padding: .15rem .55rem;
  border-radius: 999px;
  background: var(--gold); color: #fff;
  margin-left: .5rem; vertical-align: middle;
  font-family: var(--font-nav); letter-spacing: .15em;
  font-weight: 500;
}

.conflict-box {
  background: #fef0c7; border: 1px solid var(--gold);
  border-radius: 6px; padding: .65rem .8rem;
  margin-bottom: 1rem;
  display: flex; flex-direction: column; gap: .25rem;
  font-size: .85rem; color: #78350f;
  font-family: var(--font-jp);
}
.conflict-box ul { margin: .25rem 0 0; padding-left: 1rem; }
.conflict-box .link {
  background: none; border: none; padding: 0;
  color: var(--berry); cursor: pointer;
  text-align: left; font: inherit;
}
.conflict-box .link:hover { text-decoration: underline; }

.detail-dl {
  display: grid;
  grid-template-columns: 4rem 1fr;
  gap: .75rem .85rem;
  margin: 0 0 1.5rem;
  align-items: baseline;
}
.detail-dl dt {
  font-family: var(--font-jp);
  color: var(--ink-soft);
  font-size: .85rem;
  font-weight: 500;
}
.detail-dl dd {
  margin: 0;
  font-size: .92rem;
  color: var(--ink);
  line-height: 1.5;
}
.detail-dl .dl-num {
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
}
.detail-dl .muted { color: var(--ink-faint); margin-left: .35rem; font-size: .8rem; }
.dd-chips { display: flex; flex-wrap: wrap; gap: .35rem; }
.ext-link { color: var(--berry); word-break: break-all; }
.ext-link.sm { display: inline-block; margin-top: .35rem; font-size: .8rem; }
.detail-notes {
  background: var(--bg); border: 1px solid var(--line-soft);
  border-radius: 6px; padding: .55rem .75rem;
  white-space: pre-wrap;
  font-size: .87rem;
  line-height: 1.5;
}
.time-tbd {
  font-family: var(--font-jp); font-weight: 500;
  color: var(--berry);
  background: #fef0c7;
  padding: .15rem .55rem;
  border-radius: 4px;
  font-size: .85rem;
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

.not-found {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--ink-soft);
  font-family: var(--font-jp);
}
.not-found .back-btn { margin-top: 1rem; }
</style>
