<script setup>
import { computed } from 'vue'
import { useIdolsStore } from '../stores/idols.js'
import { useEventsStore } from '../stores/events.js'
import { formatTimeInTz } from '../lib/time.js'
import { readableTextOn } from '../lib/colors.js'

const props = defineProps({
  event: { type: Object, required: true },
  compact: { type: Boolean, default: false },
})
const emit = defineEmits(['select'])

const idolsStore = useIdolsStore()
const eventsStore = useEventsStore()
const hasConflict = computed(() => (eventsStore.conflictMap.get(props.event.id)?.length ?? 0) > 0)

const idols = computed(() =>
  props.event.idolIds
    .map(id => idolsStore.byId(id))
    .filter(Boolean)
)

const bgStyle = computed(() => {
  const colors = idols.value.map(i => i.color)
  if (colors.length === 0) return { background: '#9ca3af', color: '#fff' }
  if (colors.length === 1) {
    return { background: colors[0], color: readableTextOn(colors[0]) }
  }
  const step = 100 / colors.length
  const stops = colors.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(', ')
  const avgYiq = colors.reduce((sum, c) => {
    const n = parseInt(c.slice(1), 16)
    return sum + (((n >> 16) & 0xff) * 299 + ((n >> 8) & 0xff) * 587 + (n & 0xff) * 114) / 1000
  }, 0) / colors.length
  return {
    background: `linear-gradient(135deg, ${stops})`,
    color: avgYiq >= 160 ? '#1a0f15' : '#fff',
  }
})

const isPast = computed(() => {
  if (!props.event.startAt) return false
  return new Date(props.event.startAt).getTime() < Date.now()
})

const shortTitle = computed(() => {
  const t = props.event.title || ''
  // strip after「 mark, take first whitespace-delimited token; append "聯演" if multi
  const head = t.split('「')[0].split(/\s+/)[0]
  return idols.value.length > 1 ? `${head} 聯演` : head
})
</script>

<template>
  <div class="ev" :class="{ past: isPast }" :style="bgStyle" @click="emit('select', event)" :title="event.title">
    <span class="t">{{ formatTimeInTz(event.startAt, event.timezone) }}</span>
    <span class="ev-title">{{ compact ? shortTitle : event.title }}</span>
    <span v-if="hasConflict" class="conflict" title="時間衝突">⚠</span>
  </div>
</template>

<style scoped>
.ev {
  font-size: .65rem;
  line-height: 1.25;
  cursor: pointer;
  padding: .12rem .35rem;
  border-radius: 999px;
  font-weight: 500;
  border: 1px solid rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: .15rem;
  white-space: nowrap;
  overflow: hidden;
  transition: filter .15s;
}
.ev:hover { filter: brightness(1.05); }
.ev.past { opacity: .55; }
.t {
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
  font-size: .55rem;
  font-weight: 600;
  opacity: .75;
}
.ev-title {
  text-overflow: ellipsis;
  overflow: hidden;
  font-family: var(--font-jp);
}
.conflict {
  color: #c2410c;
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .ev-title { display: none; }
}
</style>
