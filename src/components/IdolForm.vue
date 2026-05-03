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
      <button type="button" class="btn-ghost" @click="emit('cancel')">取消</button>
      <button type="submit" class="btn-solid" :disabled="!name.trim() || !isValidHex(color)">
        {{ initial ? '儲存' : '新增' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 1rem; }
.row { display: flex; flex-direction: column; gap: .4rem; }
.row > span {
  font-family: var(--font-jp);
  font-size: .9rem;
  color: var(--ink-soft);
  font-weight: 500;
}
.row input[type="text"] {
  padding: .55rem .7rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-family: var(--font-jp);
  font-size: .95rem;
  color: var(--ink);
  background: #fff;
}
.row input[type="text"]:focus {
  outline: none;
  border-color: var(--berry);
  box-shadow: 0 0 0 3px rgba(231, 86, 143, 0.18);
}
.actions {
  display: flex; gap: .5rem; justify-content: flex-end;
  border-top: 1px solid var(--line);
  padding-top: 1rem;
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
.btn-solid:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost {
  background: transparent; color: var(--ink-soft);
  border: 1px solid var(--line);
  padding: .55rem 1.2rem;
  font-family: var(--font-body); font-size: .9rem;
  cursor: pointer; border-radius: 6px;
}
.btn-ghost:hover { color: var(--ink); border-color: var(--ink); }
</style>
