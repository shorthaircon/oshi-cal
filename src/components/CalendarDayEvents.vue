<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useIdolsStore } from '../stores/idols.js'
import { getObjectUrl } from '../lib/imageStore.js'

const props = defineProps({
  events: { type: Array, required: true },
})
const emit = defineEmits(['open-day'])

const idolsStore = useIdolsStore()

const primary = computed(() => props.events[0] || null)
const moreCount = computed(() => Math.max(0, props.events.length - 1))

const url = ref(null)

async function loadCover() {
  if (!primary.value?.coverId) {
    url.value = null
    return
  }
  url.value = await getObjectUrl(primary.value.coverId)
}

watch(() => primary.value?.coverId, loadCover)
onMounted(loadCover)

const fallbackBg = computed(() => {
  const idolId = primary.value?.idolIds?.[0]
  const idol = idolId ? idolsStore.byId(idolId) : null
  return idol?.color || '#a89684'
})

function onClick() {
  if (props.events.length) emit('open-day', props.events)
}
</script>

<template>
  <div v-if="primary" class="cal-day" @click.stop="onClick">
    <div
      class="thumb"
      :class="{ has: !!url }"
      :style="!url ? { backgroundColor: fallbackBg } : null"
    >
      <img v-if="url" :src="url" alt="" loading="lazy" />
    </div>
    <span v-if="moreCount > 0" class="more">+{{ moreCount }}</span>
  </div>
</template>

<style scoped>
.cal-day {
  position: relative;
  display: inline-flex;
  cursor: pointer;
  transition: transform .15s;
  align-self: center;
  margin-top: 2px;
}
.cal-day:hover { transform: scale(1.04); }

.thumb {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, .1);
}
.thumb img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
}
.thumb:not(.has)::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, .45) 100%);
  pointer-events: none;
}

.more {
  position: absolute;
  bottom: -4px; right: -6px;
  background: var(--berry); color: #fff;
  font-family: var(--font-mono, ui-monospace), monospace;
  font-size: .55rem; font-weight: 600;
  padding: 1px 5px;
  border-radius: 999px;
  line-height: 1;
  border: 1.5px solid var(--paper);
  letter-spacing: 0;
}
</style>
