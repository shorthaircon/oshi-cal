<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useIdolsStore } from '../stores/idols.js'
import { getObjectUrl } from '../lib/imageStore.js'

const props = defineProps({
  event: { type: Object, required: true },
  size: { type: String, default: 'sm' }, // 'sm' | 'lg'
  clickable: { type: Boolean, default: false },
})
const emit = defineEmits(['pick'])

const idolsStore = useIdolsStore()

const url = ref(null)

async function load() {
  if (!props.event?.coverId) {
    url.value = null
    return
  }
  url.value = await getObjectUrl(props.event.coverId)
}

watch(() => props.event?.coverId, load)
onMounted(load)

const firstIdol = computed(() => {
  const id = props.event?.idolIds?.[0]
  return id ? idolsStore.byId(id) : null
})

const fallbackBg = computed(() => firstIdol.value?.color || '#a89684')

function onClick(e) {
  if (!props.clickable) return
  e.stopPropagation()
  emit('pick')
}
</script>

<template>
  <div
    class="cover-thumb"
    :class="[size, { clickable, has: !!url }]"
    :style="!url ? { background: fallbackBg } : null"
    @click="onClick"
  >
    <img v-if="url" :src="url" alt="" loading="lazy" />
  </div>
</template>

<style scoped>
.cover-thumb {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 6px;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, .08);
  user-select: none;
}
.cover-thumb.sm {
  width: 60px;
  height: 60px;
}
.cover-thumb.lg {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
}
.cover-thumb img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}
.cover-thumb.clickable {
  cursor: pointer;
  transition: transform .15s, box-shadow .15s;
}
.cover-thumb.clickable:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(31, 32, 36, .15);
}
</style>
