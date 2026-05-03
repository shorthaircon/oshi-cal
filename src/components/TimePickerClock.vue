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
const RADIUS_NUMBERS = 100
const RADIUS_HAND = 100
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
    <div v-if="open" class="clock-bg" @click.self="emit('close')">
      <div class="clock-dialog" role="dialog" aria-modal="true">
        <p class="clock-caption">— Pick a time —</p>
        <div class="clock-display">
          <button
            type="button" class="clock-bignum"
            :class="{ active: stage === 'hour' }"
            @click="stage = 'hour'"
          >{{ pad(h12) }}</button>
          <span class="clock-colon">:</span>
          <button
            type="button" class="clock-bignum"
            :class="{ active: stage === 'minute' }"
            @click="stage = 'minute'"
          >{{ pad(m) }}</button>
          <div class="clock-ampm">
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
          class="clock-face"
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

        <div class="clock-actions">
          <button type="button" class="btn-ghost" @click="emit('close')">取消</button>
          <button type="button" class="btn-solid" @click="confirm">確定</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.clock-bg {
  position: fixed; inset: 0;
  background: rgba(59, 31, 43, 0.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 1rem;
}
.clock-dialog {
  background: var(--paper); color: var(--ink);
  border: 2px solid var(--ink); border-radius: 4px;
  box-shadow: 0 16px 48px rgba(59,31,43,.25);
  padding: 1.25rem;
  max-width: 360px; width: 100%;
}
.clock-caption {
  margin: 0 0 1rem;
  font-family: var(--font-nav);
  font-size: .7rem;
  letter-spacing: .25em;
  color: var(--berry);
  text-transform: uppercase;
  font-weight: 500;
  text-align: center;
}
.clock-display {
  display: flex; align-items: center; justify-content: center;
  gap: .35rem; margin-bottom: 1rem;
}
.clock-bignum {
  font-family: var(--font-nav);
  font-size: 2.4rem; font-weight: 500; line-height: 1;
  font-variant-numeric: tabular-nums;
  background: var(--bg);
  color: var(--ink-soft);
  border: 2px solid var(--line);
  border-radius: 4px;
  padding: .5rem .9rem;
  cursor: pointer;
  min-width: 4.5rem;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all .2s;
}
.clock-bignum.active {
  background: var(--berry); color: #fff; border-color: var(--berry);
}
.clock-colon {
  font-family: var(--font-nav);
  font-size: 2.4rem; font-weight: 500;
  color: var(--ink-soft);
  line-height: 1;
}
.clock-ampm {
  display: flex; flex-direction: column;
  gap: .35rem; margin-left: .5rem;
}
.clock-ampm button {
  background: #fff; color: var(--ink-soft);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: .25rem .65rem;
  cursor: pointer;
  font-size: .75rem;
  min-width: 2.6rem;
  font-family: var(--font-nav);
  letter-spacing: .1em;
  font-weight: 500;
}
.clock-ampm button.active {
  background: var(--berry); color: #fff; border-color: var(--berry);
}

.clock-face {
  width: 100%; aspect-ratio: 1;
  display: block; user-select: none; touch-action: none;
}
.dial { fill: var(--bg); stroke: var(--ink); stroke-width: 1.5; }
.hand { stroke: var(--berry); stroke-width: 2; stroke-linecap: round; }
.hand-end { fill: var(--berry); opacity: .9; }
.hub { fill: var(--berry); }
.num {
  fill: var(--ink);
  font-family: var(--font-nav);
  font-size: 15px;
  font-weight: 500;
  pointer-events: none;
}
.num.selected { fill: #fff; }

.clock-actions {
  display: flex; justify-content: flex-end;
  gap: .5rem; margin-top: 1rem;
  border-top: 1px solid var(--line);
  padding-top: .75rem;
}
.btn-solid {
  background: var(--ink); color: #fff;
  border: 2px solid var(--ink);
  padding: .55rem 1.2rem;
  font-family: var(--font-body);
  font-size: .9rem; font-weight: 500;
  cursor: pointer; border-radius: 6px;
  transition: all .2s;
}
.btn-solid:hover { background: var(--berry); border-color: var(--berry); }
.btn-ghost {
  background: transparent; color: var(--ink-soft);
  border: 1px solid var(--line);
  padding: .55rem 1.2rem;
  font-family: var(--font-body); font-size: .9rem;
  cursor: pointer; border-radius: 6px;
}
.btn-ghost:hover { color: var(--ink); border-color: var(--ink); }
</style>
