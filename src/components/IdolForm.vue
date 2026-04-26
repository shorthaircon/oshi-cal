<script setup>
import { ref, watch } from 'vue'
import ColorPicker from './ColorPicker.vue'
import { recommendNext, isValidHex } from '../lib/colors.js'

const props = defineProps({
  initial: { type: Object, default: null },
  otherHexes: { type: Array, default: () => [] },
})
const emit = defineEmits(['submit', 'cancel'])

const name = ref(props.initial?.name ?? '')
const color = ref(props.initial?.color ?? recommendNext(props.otherHexes))

watch(() => props.initial, (v) => {
  name.value = v?.name ?? ''
  color.value = v?.color ?? recommendNext(props.otherHexes)
})

function submit() {
  const trimmed = name.value.trim()
  if (!trimmed) return
  if (!isValidHex(color.value)) return
  emit('submit', { name: trimmed, color: color.value })
}
</script>

<template>
  <form class="form" @submit.prevent="submit">
    <label class="row">
      <span>名稱</span>
      <input v-model="name" type="text" required maxlength="60" />
    </label>
    <div class="row">
      <span>顏色</span>
      <ColorPicker v-model="color" :other-hexes="otherHexes" />
    </div>
    <div class="actions">
      <button type="button" class="ghost" @click="emit('cancel')">取消</button>
      <button type="submit" :disabled="!name.trim() || !isValidHex(color)">
        {{ initial ? '儲存' : '新增' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 1rem; }
.row { display: flex; flex-direction: column; gap: .35rem; }
.row > span { font-size: .85rem; color: #555; }
.row input[type="text"] {
  padding: .5rem .6rem; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem;
}
.actions { display: flex; gap: .5rem; justify-content: flex-end; }
.actions button {
  padding: .5rem 1rem; border-radius: 6px; border: 1px solid #ccc;
  background: #111; color: #fff; cursor: pointer;
}
.actions button:disabled { opacity: .5; cursor: not-allowed; }
.actions .ghost { background: transparent; color: #333; }
</style>
