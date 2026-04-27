<script setup>
import { computed } from 'vue'
import { useIdolsStore } from '../stores/idols.js'
import { formatJstTime } from '../lib/time.js'

const props = defineProps({
  event: { type: Object, required: true },
  compact: { type: Boolean, default: false },
})

const idolsStore = useIdolsStore()

const idols = computed(() =>
  props.event.idolIds
    .map(id => idolsStore.byId(id))
    .filter(Boolean)
)

// Multi-idol → zebra stripes; single → solid; none → neutral.
const bgStyle = computed(() => {
  const colors = idols.value.map(i => i.color)
  if (colors.length === 0) return { background: '#9ca3af' }
  if (colors.length === 1) return { background: colors[0] }
  const step = 100 / colors.length
  const stops = colors.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(', ')
  return { background: `linear-gradient(135deg, ${stops})` }
})

const isPast = computed(() => {
  if (!props.event.startAt) return false
  return new Date(props.event.startAt).getTime() < Date.now()
})
</script>

<template>
  <div class="card" :class="{ past: isPast, compact }" :style="bgStyle">
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
  border-radius: 4px; color: #fff;
  font-size: .75rem; line-height: 1.3;
  overflow: hidden; cursor: default;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
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
