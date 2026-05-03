<script setup>
import { computed } from 'vue'
import { readableTextOn } from '../lib/colors.js'

const props = defineProps({
  idol: { type: Object, required: true },
  size: { type: String, default: 'md' }, // 'sm' | 'md'
})

const style = computed(() => ({
  background: props.idol.color,
  color: readableTextOn(props.idol.color),
}))
</script>

<template>
  <span class="idol-chip" :class="size" :style="style">{{ idol.name }}</span>
</template>

<style scoped>
.idol-chip {
  display: inline-block;
  padding: .15rem .55rem;
  border-radius: 999px;
  font-family: var(--font-jp);
  font-weight: 500;
  border: 1px solid rgba(0,0,0,0.12);
  line-height: 1.4;
}
.idol-chip.sm { font-size: .7rem; padding: .1rem .45rem; }
.idol-chip.md { font-size: .85rem; }
</style>
