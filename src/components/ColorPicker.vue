<script setup>
import { computed } from 'vue'
import { PALETTE, isValidHex, isClash } from '../lib/colors.js'

const props = defineProps({
  modelValue: { type: String, required: true },
  otherHexes: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

const clash = computed(() => isClash(props.modelValue, props.otherHexes))
const customValid = computed(() => isValidHex(props.modelValue))

function pick(hex) {
  emit('update:modelValue', hex)
}
function onCustom(e) {
  let v = e.target.value.trim()
  if (!v.startsWith('#')) v = '#' + v
  emit('update:modelValue', v)
}
</script>

<template>
  <div class="picker">
    <div class="palette">
      <button
        v-for="c in PALETTE"
        :key="c.hex"
        type="button"
        class="swatch"
        :class="{ active: c.hex.toLowerCase() === modelValue.toLowerCase() }"
        :style="{ background: c.hex }"
        :title="c.name"
        @click="pick(c.hex)"
      />
    </div>
    <label class="custom">
      自訂 hex：
      <input
        type="text"
        :value="modelValue"
        @input="onCustom"
        placeholder="#abcdef"
        :class="{ invalid: !customValid }"
        maxlength="7"
      />
      <span class="preview" :style="{ background: customValid ? modelValue : 'transparent' }" />
    </label>
    <p v-if="clash" class="warn">⚠️ 與其他偶像撞色，仍可儲存</p>
    <p v-if="!customValid" class="err">hex 格式不正確（需 #RRGGBB）</p>
  </div>
</template>

<style scoped>
.picker { display: flex; flex-direction: column; gap: .5rem; }
.palette { display: grid; grid-template-columns: repeat(6, 1fr); gap: .4rem; }
.swatch {
  width: 100%; aspect-ratio: 1; border-radius: 50%;
  border: 2px solid transparent; cursor: pointer; padding: 0;
}
.swatch.active { border-color: #000; outline: 2px solid #fff; outline-offset: -4px; }
.custom { display: flex; align-items: center; gap: .5rem; font-size: .9rem; }
.custom input {
  font-family: monospace; padding: .3rem .5rem; width: 9ch;
  border: 1px solid #ccc; border-radius: 4px;
}
.custom input.invalid { border-color: #ef4444; }
.preview { width: 1.4rem; height: 1.4rem; border-radius: 4px; border: 1px solid #ccc; }
.warn { color: #b45309; font-size: .85rem; margin: 0; }
.err { color: #ef4444; font-size: .85rem; margin: 0; }
</style>
