<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '00:00' }, // 'HH:mm' (24h)
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'close'])

const stage = ref('hour') // 'hour' | 'minute'
const h12 = ref(12)        // 1-12
const m = ref(0)           // 0-59
const ampm = ref('AM')

watch(() => [props.open, props.modelValue], ([open]) => {
  if (!open) return
  const [h24, mi] = (props.modelValue || '00:00').split(':').map(Number)
  ampm.value = h24 >= 12 ? 'PM' : 'AM'
  let h = h24 % 12
  if (h === 0) h = 12
  h12.value = h
  m.value = mi || 0
  stage.value = 'hour'
}, { immediate: true })

const to24h = computed(() => {
  let h = h12.value % 12
  if (ampm.value === 'PM') h += 12
  return `${pad(h)}:${pad(m.value)}`
})

function pad(n) { return String(n).padStart(2, '0') }

// SVG geometry
const SIZE = 260
const CENTER = SIZE / 2
const RADIUS_NUMBERS = 102
const RADIUS_HAND = 92
const RADIUS_END = 18

const numbers = computed(() => {
  // 12 positions around the dial
  const items = []
  for (let i = 1; i <= 12; i++) {
    const angle = (i / 12) * Math.PI * 2 // radians, clockwise from 12
    const x = CENTER + RADIUS_NUMBERS * Math.sin(angle)
    const y = CENTER - RADIUS_NUMBERS * Math.cos(angle)
    const label = stage.value === 'hour' ? String(i) : pad((i % 12) * 5)
    const value = stage.value === 'hour' ? i : (i % 12) * 5
    items.push({ x, y, label, value, angle })
  }
  return items
})

const handAngle = computed(() => {
  if (stage.value === 'hour') {
    return (h12.value / 12) * Math.PI * 2
  }
  return (m.value / 60) * Math.PI * 2
})

const handEnd = computed(() => ({
  x: CENTER + RADIUS_HAND * Math.sin(handAngle.value),
  y: CENTER - RADIUS_HAND * Math.cos(handAngle.value),
}))

const isSelected = (item) => {
  if (stage.value === 'hour') return item.value === h12.value
  return item.value === m.value
}

let dragging = false
function onPointer(e, isStart) {
  if (isStart) dragging = true
  if (!dragging && !isStart) return
  const svg = e.currentTarget
  const rect = svg.getBoundingClientRect()
  const px = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left
  const py = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top
  const scale = SIZE / rect.width
  const x = px * scale - CENTER
  const y = py * scale - CENTER
  let a = Math.atan2(x, -y) // 0 at 12, clockwise
  if (a < 0) a += Math.PI * 2

  if (stage.value === 'hour') {
    let h = Math.round(a / (Math.PI * 2 / 12))
    if (h === 0) h = 12
    h12.value = h
  } else {
    m.value = Math.round(a / (Math.PI * 2 / 60)) % 60
  }
}
function onPointerEnd(_e, didTap) {
  if (!dragging && !didTap) return
  dragging = false
  if (stage.value === 'hour') stage.value = 'minute'
}

function setAmPm(v) { ampm.value = v }

function confirm() {
  emit('update:modelValue', to24h.value)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="bg" @click.self="emit('close')">
      <div class="dialog" role="dialog" aria-modal="true">
        <p class="caption">選取時間</p>
        <div class="display">
          <button
            type="button" class="big-num"
            :class="{ active: stage === 'hour' }"
            @click="stage = 'hour'"
          >{{ pad(h12) }}</button>
          <span class="colon">:</span>
          <button
            type="button" class="big-num"
            :class="{ active: stage === 'minute' }"
            @click="stage = 'minute'"
          >{{ pad(m) }}</button>
          <div class="ampm">
            <button
              type="button"
              :class="{ active: ampm === 'AM' }"
              @click="setAmPm('AM')"
            >AM</button>
            <button
              type="button"
              :class="{ active: ampm === 'PM' }"
              @click="setAmPm('PM')"
            >PM</button>
          </div>
        </div>

        <svg
          :viewBox="`0 0 ${SIZE} ${SIZE}`"
          class="face"
          @mousedown="onPointer($event, true)"
          @mousemove="onPointer($event, false)"
          @mouseup="onPointerEnd($event, false)"
          @mouseleave="onPointerEnd($event, false)"
          @touchstart.prevent="onPointer($event, true)"
          @touchmove.prevent="onPointer($event, false)"
          @touchend.prevent="onPointerEnd($event, true)"
        >
          <circle :cx="CENTER" :cy="CENTER" :r="CENTER - 8" class="dial" />
          <line :x1="CENTER" :y1="CENTER" :x2="handEnd.x" :y2="handEnd.y" class="hand" />
          <circle :cx="CENTER" :cy="CENTER" r="4" class="hub" />
          <circle :cx="handEnd.x" :cy="handEnd.y" :r="RADIUS_END" class="hand-end" />
          <g v-for="n in numbers" :key="`${stage}-${n.value}`">
            <text
              :x="n.x" :y="n.y"
              text-anchor="middle"
              dy=".35em"
              :class="['num', { selected: isSelected(n) }]"
            >{{ n.label }}</text>
          </g>
        </svg>

        <div class="actions">
          <button class="ghost" type="button" @click="emit('close')">取消</button>
          <button type="button" @click="confirm">確定</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.bg {
  position: fixed; inset: 0; background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 1rem;
}
.dialog {
  background: #1f1b1f; color: #f5e8e8;
  border-radius: 16px; padding: 1.25rem;
  max-width: 360px; width: 100%;
}
.caption { margin: 0 0 1rem; font-size: .85rem; color: #c9b8b8; }
.display { display: flex; align-items: center; justify-content: center; gap: .5rem; margin-bottom: 1rem; }
.big-num {
  font-size: 2.6rem; font-weight: 600; line-height: 1;
  background: #3a2a2a; color: #d6c0c0;
  border: none; border-radius: 8px; padding: .35rem .6rem;
  cursor: pointer; min-width: 5rem; font-variant-numeric: tabular-nums;
}
.big-num.active { background: #6b1f1f; color: #fde2e2; }
.colon { font-size: 2.2rem; color: #d6c0c0; }
.ampm { display: flex; flex-direction: column; gap: .35rem; margin-left: .5rem; }
.ampm button {
  background: transparent; color: #c9b8b8;
  border: 1px solid #5a4a4a; border-radius: 999px;
  padding: .25rem .65rem; cursor: pointer; font-size: .85rem; min-width: 2.8rem;
}
.ampm button.active { background: #b86b6b; color: #2a1414; border-color: #b86b6b; }

.face {
  width: 100%; aspect-ratio: 1;
  display: block; user-select: none; touch-action: none;
}
.dial { fill: #2a2024; }
.hand { stroke: #f4b6b6; stroke-width: 2; stroke-linecap: round; }
.hand-end { fill: #f4b6b6; opacity: .85; }
.hub { fill: #f4b6b6; }
.num { fill: #f5e8e8; font-size: 16px; pointer-events: none; }
.num.selected { fill: #2a1414; font-weight: 600; }

.actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1rem; }
.actions button {
  background: transparent; color: #f4b6b6;
  border: none; padding: .5rem 1rem; border-radius: 6px;
  font-size: .95rem; cursor: pointer;
}
.actions button.ghost { color: #c9b8b8; }
.actions button:hover { background: rgba(244,182,182,0.1); }
</style>
