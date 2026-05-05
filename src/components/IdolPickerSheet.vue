<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useEventsStore } from '../stores/events.js'
import { recentIdolIds } from '../lib/stats.js'
import { readableTextOn } from '../lib/colors.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  modelValue: { type: Array, required: true },   // selected idol ids
  idols: { type: Array, required: true },        // all idols (already in user-defined order)
})
const emit = defineEmits(['update:modelValue', 'update:open'])

const eventsStore = useEventsStore()

const draft = ref(new Set(props.modelValue))
const search = ref('')
const sheetEl = ref(null)
const dragY = ref(0)
const dragStart = ref(null)

watch(() => props.open, (v) => {
  if (v) {
    draft.value = new Set(props.modelValue)
    search.value = ''
    dragY.value = 0
  }
})

// Idols come pre-sorted from store (user's drag order). Don't re-sort.
const recentIds = computed(() =>
  recentIdolIds(eventsStore.events, 5).filter(id =>
    props.idols.some(i => i.id === id)
  )
)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.idols
  return props.idols.filter(i => i.name.toLowerCase().includes(q))
})

const recentIdols = computed(() =>
  recentIds.value
    .map(id => props.idols.find(i => i.id === id))
    .filter(Boolean)
)

function toggle(id) {
  const next = new Set(draft.value)
  if (next.has(id)) next.delete(id); else next.add(id)
  draft.value = next
}
function isOn(id) { return draft.value.has(id) }

function confirm() {
  emit('update:modelValue', [...draft.value])
  emit('update:open', false)
}
function cancel() {
  emit('update:open', false)
}

// Drag-to-dismiss on the handle
function onDown(e) {
  const y = e.touches ? e.touches[0].clientY : e.clientY
  dragStart.value = y
}
function onMove(e) {
  if (dragStart.value == null) return
  const y = e.touches ? e.touches[0].clientY : e.clientY
  dragY.value = Math.max(0, y - dragStart.value)
}
function onUp() {
  if (dragStart.value == null) return
  if (dragY.value > 120) {
    cancel()
  }
  dragY.value = 0
  dragStart.value = null
}

onMounted(() => {
  window.addEventListener('mousemove', onMove)
  window.addEventListener('touchmove', onMove, { passive: true })
  window.addEventListener('mouseup', onUp)
  window.addEventListener('touchend', onUp)
})
onUnmounted(() => {
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('touchmove', onMove)
  window.removeEventListener('mouseup', onUp)
  window.removeEventListener('touchend', onUp)
})

const sheetStyle = computed(() => ({
  transform: dragY.value > 0 ? `translateY(${dragY.value}px)` : '',
  transition: dragStart.value != null ? 'none' : '',
}))
</script>

<template>
  <teleport to="body">
    <div class="scrim" :class="{ on: open }" @click="cancel"></div>
    <div ref="sheetEl" class="sheet" :class="{ on: open }" :style="sheetStyle" role="dialog" aria-modal="true">
      <div
        class="handle"
        @mousedown="onDown"
        @touchstart="onDown"
      ></div>
      <div class="head">
        <h3 class="title">選擇推し</h3>
        <input
          v-model="search"
          class="search"
          type="text"
          placeholder="搜尋推し..."
          autocomplete="off"
          enterkeyhint="search"
        />
      </div>

      <div class="body">
        <template v-if="filtered.length === 0">
          <div class="empty">找不到符合的推し</div>
        </template>

        <template v-else>
          <template v-if="!search.trim() && recentIdols.length">
            <div class="section-title">最近用過</div>
            <button
              v-for="i in recentIdols"
              :key="`recent-${i.id}`"
              type="button"
              class="row"
              :class="{ on: isOn(i.id) }"
              @click="toggle(i.id)"
            >
              <span class="check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
              <span class="dot" :style="{ background: i.color }"></span>
              <span class="name">{{ i.name }}</span>
            </button>
            <div class="section-title">全部推し</div>
          </template>

          <button
            v-for="i in filtered"
            :key="i.id"
            type="button"
            class="row"
            :class="{ on: isOn(i.id) }"
            @click="toggle(i.id)"
          >
            <span class="check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </span>
            <span class="dot" :style="{ background: i.color }"></span>
            <span class="name">{{ i.name }}</span>
          </button>
        </template>
      </div>

      <div class="foot">
        <span class="count">已選 <strong>{{ draft.size }}</strong> 位</span>
        <button class="btn-ghost" type="button" @click="cancel">取消</button>
        <button class="btn-solid" type="button" @click="confirm">完成</button>
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
  height: 85vh; max-height: 760px;
}
.sheet.on { transform: translateY(0); }

.handle {
  align-self: center; width: 40px; height: 16px;
  margin: 8px 0 0;
  display: flex; align-items: center; justify-content: center;
  cursor: grab; touch-action: none; user-select: none;
}
.handle::before {
  content: ''; width: 36px; height: 4px;
  border-radius: 2px; background: var(--line);
}
.handle:active::before { background: var(--ink-soft); }

.head {
  padding: 6px 18px 12px;
  border-bottom: 1px solid var(--line);
}
.title {
  font-family: var(--font-display);
  font-size: 1.15rem; font-weight: 400;
  margin: 0 0 .55rem; text-align: center;
  color: var(--ink);
}
.search {
  width: 100%; padding: .55rem .85rem;
  border: 1px solid var(--line); border-radius: 999px;
  background: #fff; font-family: var(--font-body);
  font-size: .95rem; color: var(--ink); outline: none;
}
.search:focus { border-color: var(--berry); }

.body {
  flex: 1; overflow-y: auto; padding: 8px 0 12px;
  -webkit-overflow-scrolling: touch;
}
.section-title {
  font-family: var(--font-nav);
  font-size: .7rem; letter-spacing: .2em;
  text-transform: uppercase; color: var(--ink-soft);
  padding: 14px 18px 6px;
}
.row {
  display: flex; align-items: center; gap: .7rem;
  padding: .7rem 18px; cursor: pointer;
  transition: background .12s; border: none;
  background: transparent; width: 100%; text-align: left;
}
.row:hover { background: var(--bg); }
.row.on { background: var(--bg); }
.check {
  width: 22px; height: 22px; border-radius: 5px;
  border: 1.5px solid var(--line);
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0; background: #fff;
}
.row.on .check {
  background: var(--berry); border-color: var(--berry); color: #fff;
}
.check svg { display: none; width: 14px; height: 14px; }
.row.on .check svg { display: block; }
.dot {
  width: 14px; height: 14px; border-radius: 50%;
  flex-shrink: 0; border: 1px solid rgba(0, 0, 0, .12);
}
.name {
  font-family: var(--font-jp); font-size: .95rem; color: var(--ink);
  flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.row.on .name { font-weight: 600; }
.empty {
  padding: 30px 18px; text-align: center;
  color: var(--ink-faint); font-family: var(--font-jp);
  font-size: .9rem;
}

.foot {
  border-top: 1px solid var(--line);
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0));
  display: flex; align-items: center; gap: .5rem;
  background: var(--paper);
}
.count {
  flex: 1; font-family: var(--font-jp);
  font-size: .88rem; color: var(--ink-soft);
}
.count strong {
  color: var(--berry); font-family: var(--font-num);
  font-weight: 600; font-variant-numeric: tabular-nums;
}
.btn-ghost {
  background: transparent; color: var(--ink-soft);
  border: 1px solid var(--line);
  padding: .6rem 1.1rem; border-radius: 6px;
  font-family: var(--font-body); font-size: .9rem; cursor: pointer;
}
.btn-ghost:hover { color: var(--ink); border-color: var(--ink); }
.btn-solid {
  background: var(--ink); color: #fff;
  border: 1px solid var(--ink);
  padding: .6rem 1.4rem; border-radius: 6px;
  font-family: var(--font-body); font-size: .9rem;
  font-weight: 500; cursor: pointer;
}
.btn-solid:hover { background: var(--berry); border-color: var(--berry); }
</style>
