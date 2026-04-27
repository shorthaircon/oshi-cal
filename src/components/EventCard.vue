<script setup>
import { computed } from 'vue'
import { useIdolsStore } from '../stores/idols.js'
import { formatJstTime } from '../lib/time.js'
import { readableTextOn } from '../lib/colors.js'

const props = defineProps({
  event: { type: Object, required: true },
  compact: { type: Boolean, default: false },
})
const emit = defineEmits(['select'])

const idolsStore = useIdolsStore()

const idols = computed(() =>
  props.event.idolIds
    .map(id => idolsStore.byId(id))
    .filter(Boolean)
)

// Multi-idol → zebra stripes; single → solid; none → neutral.
const bgStyle = computed(() => {
  const colors = idols.value.map(i => i.color)
  if (colors.length === 0) return { background: '#9ca3af', color: '#fff' }
  if (colors.length === 1) {
    return { background: colors[0], color: readableTextOn(colors[0]) }
  }
  const step = 100 / colors.length
  const stops = colors.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(', ')
  // For multi-idol: pick text color based on average luminance
  const avgYiq = colors.reduce((sum, c) => {
    const n = parseInt(c.slice(1), 16)
    return sum + (((n >> 16) & 0xff) * 299 + ((n >> 8) & 0xff) * 587 + (n & 0xff) * 114) / 1000
  }, 0) / colors.length
  return {
    background: `linear-gradient(135deg, ${stops})`,
    color: avgYiq >= 160 ? '#111' : '#fff',
  }
})

const isPast = computed(() => {
  if (!props.event.startAt) return false
  return new Date(props.event.startAt).getTime() < Date.now()
})
</script>

<template>
  <div class="card" :class="{ past: isPast, compact }" :style="bgStyle" @click="emit('select', event)">
    <div class="card-inner">
      <span v-if="!compact" class="time">{{ formatJstTime(event.startAt) }}</span>
      <span class="title">{{ event.title }}</span>
      <span v-if="idols.length > 1" class="idol-chips">
        <span v-for="i in idols" :key="i.id" class="chip">{{ i.name }}</span>
      </span>
      <span v-if="isPast" class="past-tag">已過</span>
    </div>
  </div>
</template>

<style scoped>
.card {
  border-radius: 4px;
  font-size: .75rem; line-height: 1.3;
  overflow: hidden; cursor: pointer;
  border: 1px solid rgba(0,0,0,0.08);
}
.card.past { opacity: .55; }
.card-inner {
  padding: .25rem .4rem;
  display: flex; flex-wrap: wrap; gap: .25rem; align-items: center;
}
.compact .card-inner { padding: .15rem .35rem; }
.time { font-weight: 600; opacity: .9; }
.title {
  flex: 1; min-width: 0; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.idol-chips { display: flex; gap: .15rem; flex-wrap: wrap; }
.chip {
  background: rgba(255,255,255,0.25); padding: 0 .3rem; border-radius: 3px;
  font-size: .65rem;
}
.past-tag {
  background: rgba(0,0,0,0.4); padding: 0 .3rem; border-radius: 3px;
  font-size: .65rem;
}
</style>
