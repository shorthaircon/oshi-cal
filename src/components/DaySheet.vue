<script setup>
import { ref, computed, watch } from 'vue'
import { useIdolsStore } from '../stores/idols.js'
import { formatTimeInTz, formatDateInTz } from '../lib/time.js'
import { tzCodeOf } from '../lib/timezones.js'
import { getObjectUrl } from '../lib/imageStore.js'
import IdolChip from './IdolChip.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  events: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:open', 'select'])

const idolsStore = useIdolsStore()

const dateLabel = computed(() => {
  const ev = props.events[0]
  if (!ev?.startAt) return ''
  return formatDateInTz(ev.startAt, ev.timezone)
})

function close() { emit('update:open', false) }
function pick(ev) {
  emit('select', ev)
  emit('update:open', false)
}

function idolsOf(ev) {
  return ev.idolIds.map(id => idolsStore.byId(id)).filter(Boolean)
}

function timeText(ev) {
  if (ev.timeUnknown) return '時間待確認'
  return formatTimeInTz(ev.startAt, ev.timezone)
}

// Cover URLs cache: load lazily per event
const coverUrls = ref(new Map())

watch(
  () => [props.open, props.events.map(e => e.coverId).join(',')],
  async ([isOpen]) => {
    if (!isOpen) return
    const map = new Map()
    for (const ev of props.events) {
      if (ev.coverId) {
        map.set(ev.id, await getObjectUrl(ev.coverId))
      }
    }
    coverUrls.value = map
  },
  { immediate: true }
)

function thumbStyle(ev) {
  const u = coverUrls.value.get(ev.id)
  if (u) return { backgroundImage: `url(${u})` }
  const idolId = ev.idolIds?.[0]
  const idol = idolId ? idolsStore.byId(idolId) : null
  return { backgroundColor: idol?.color || '#a89684' }
}
function hasCover(ev) {
  return !!coverUrls.value.get(ev.id)
}

// Drag-to-dismiss
const dragStart = ref(null)
const dragY = ref(0)
function onDown(e) { dragStart.value = e.touches ? e.touches[0].clientY : e.clientY }
function onMove(e) {
  if (dragStart.value == null) return
  const y = e.touches ? e.touches[0].clientY : e.clientY
  dragY.value = Math.max(0, y - dragStart.value)
}
function onUp() {
  if (dragStart.value == null) return
  if (dragY.value > 120) close()
  dragY.value = 0
  dragStart.value = null
}
</script>

<template>
  <teleport to="body">
    <div class="scrim" :class="{ on: open }" @click="close"></div>
    <div
      class="sheet"
      :class="{ on: open }"
      :style="dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: 'none' } : null"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="handle"
        @mousedown="onDown"
        @touchstart="onDown"
        @mousemove="onMove"
        @touchmove="onMove"
        @mouseup="onUp"
        @touchend="onUp"
        @mouseleave="onUp"
      ></div>
      <div class="head">
        <h3 class="title">{{ dateLabel }}</h3>
        <p class="sub">{{ events.length }} 場活動</p>
      </div>
      <div class="body">
        <button
          v-for="ev in events"
          :key="ev.id"
          type="button"
          class="row"
          @click="pick(ev)"
        >
          <div class="thumb" :class="{ has: hasCover(ev) }" :style="thumbStyle(ev)"></div>
          <div class="info">
            <div class="row-title">{{ ev.title }}</div>
            <div class="meta">
              <span class="time">{{ timeText(ev) }}</span>
              <span class="tz">{{ tzCodeOf(ev.timezone) }}</span>
              <span v-if="ev.venue" class="venue">📍 {{ ev.venue }}</span>
            </div>
            <div v-if="idolsOf(ev).length" class="chips">
              <IdolChip v-for="i in idolsOf(ev)" :key="i.id" :idol="i" size="sm" />
            </div>
          </div>
        </button>
      </div>
      <div class="foot">
        <button class="btn-ghost" type="button" @click="close">關閉</button>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.scrim {
  position: fixed; inset: 0;
  background: rgba(31, 32, 36, .45);
  opacity: 0; pointer-events: none;
  transition: opacity .25s ease;
  z-index: 200;
}
.scrim.on { opacity: 1; pointer-events: auto; }

.sheet {
  position: fixed; left: 0; right: 0; bottom: 0;
  background: var(--paper);
  border-top-left-radius: 18px; border-top-right-radius: 18px;
  box-shadow: 0 -8px 32px rgba(31, 32, 36, .18);
  transform: translateY(100%);
  transition: transform .3s cubic-bezier(.32, .72, 0, 1);
  z-index: 210;
  display: flex; flex-direction: column;
  max-height: 80vh;
}
.sheet.on { transform: translateY(0); }

.handle {
  align-self: center; width: 40px; height: 18px;
  margin: 8px 0 4px;
  display: flex; align-items: center; justify-content: center;
  cursor: grab; touch-action: none; user-select: none;
}
.handle::before {
  content: ''; width: 36px; height: 4px;
  border-radius: 2px; background: var(--line);
}
.handle:active::before { background: var(--ink-soft); }

.head {
  padding: 4px 18px 12px;
  border-bottom: 1px solid var(--line);
  text-align: center;
}
.title {
  font-family: var(--font-display);
  font-size: 1.2rem; font-weight: 400;
  margin: 0; color: var(--ink);
}
.sub {
  font-family: var(--font-nav);
  font-size: .7rem; letter-spacing: .15em;
  color: var(--berry);
  margin: .25rem 0 0;
}

.body {
  flex: 1; overflow-y: auto; padding: 8px 12px;
  display: flex; flex-direction: column; gap: .55rem;
  -webkit-overflow-scrolling: touch;
}

.row {
  display: flex; align-items: flex-start; gap: .75rem;
  padding: .65rem .75rem;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  cursor: pointer; text-align: left;
  width: 100%;
  font: inherit;
  transition: all .15s;
}
.row:hover {
  border-color: var(--ink);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, .06);
}

.thumb {
  width: 56px; height: 56px;
  border-radius: 6px;
  flex-shrink: 0;
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(0, 0, 0, .1);
  position: relative;
  overflow: hidden;
}
.thumb:not(.has)::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, .45) 100%);
  pointer-events: none;
}

.info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .25rem; }
.row-title {
  font-family: var(--font-jp);
  font-size: .92rem; font-weight: 600;
  color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.meta {
  display: flex; flex-wrap: wrap; gap: .35rem .55rem;
  font-size: .78rem; color: var(--ink-soft);
  font-family: var(--font-jp);
}
.time {
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
}
.tz {
  font-family: var(--font-nav);
  font-size: .7rem; letter-spacing: .05em;
  color: var(--ink-faint);
}
.venue { color: var(--ink-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.chips {
  display: flex; flex-wrap: wrap; gap: .25rem;
  margin-top: .15rem;
}

.foot {
  border-top: 1px solid var(--line);
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0));
  display: flex; justify-content: center;
  background: var(--paper);
}
.btn-ghost {
  background: transparent; color: var(--ink-soft);
  border: 1px solid var(--line);
  padding: .55rem 1.4rem; border-radius: 6px;
  font-family: var(--font-body); font-size: .9rem;
  cursor: pointer;
}
.btn-ghost:hover { color: var(--ink); border-color: var(--ink); }
</style>
