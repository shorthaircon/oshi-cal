<script setup>
import { ref, watch } from 'vue'
import { useIdolsStore } from '../stores/idols.js'
import { STATUSES } from '../stores/events.js'

const props = defineProps({
  initial: { type: Object, default: null },
})
const emit = defineEmits(['submit', 'cancel'])

const idolsStore = useIdolsStore()

const title = ref('')
const idolIds = ref([])
const startAt = ref('')
const venue = ref('')
const status = ref('going')
const ticketPrice = ref('')
const ticketUrl = ref('')
const notes = ref('')

function loadFromInitial(v) {
  title.value = v?.title ?? ''
  idolIds.value = [...(v?.idolIds ?? [])]
  startAt.value = v?.startAt ? toLocal(v.startAt) : ''
  venue.value = v?.venue ?? ''
  status.value = v?.status ?? 'going'
  ticketPrice.value = v?.ticketPrice != null ? String(v.ticketPrice) : ''
  ticketUrl.value = v?.ticketUrl ?? ''
  notes.value = v?.notes ?? ''
}
loadFromInitial(props.initial)
watch(() => props.initial, loadFromInitial)

// datetime-local 用 'YYYY-MM-DDTHH:mm' 無時區。存 ISO 時當作裝置本地時間。
function toLocal(iso) {
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fromLocal(local) {
  if (!local) return null
  const d = new Date(local)
  return isNaN(d) ? null : d.toISOString()
}

function submit() {
  if (!title.value.trim() || !startAt.value) return
  emit('submit', {
    title: title.value.trim(),
    idolIds: idolIds.value,
    startAt: fromLocal(startAt.value),
    endAt: null,
    venue: venue.value.trim(),
    status: status.value,
    ticketPrice: ticketPrice.value === '' ? null : Number(ticketPrice.value),
    ticketUrl: ticketUrl.value.trim(),
    notes: notes.value,
  })
}
</script>

<template>
  <form class="form" @submit.prevent="submit">
    <label class="row">
      <span>標題 <em>*</em></span>
      <input v-model="title" type="text" required maxlength="200" />
    </label>

    <div class="row">
      <span>偶像（可多選）</span>
      <div v-if="idolsStore.idols.length === 0" class="hint">
        還沒有偶像。<router-link to="/idols">去新增</router-link>
      </div>
      <div v-else class="idol-checks">
        <label v-for="i in idolsStore.idols" :key="i.id" class="chk">
          <input type="checkbox" :value="i.id" v-model="idolIds" />
          <span class="dot" :style="{ background: i.color }" />
          {{ i.name }}
        </label>
      </div>
    </div>

    <label class="row">
      <span>開始時間 <em>*</em></span>
      <input v-model="startAt" type="datetime-local" required />
    </label>

    <label class="row">
      <span>地點</span>
      <input v-model="venue" type="text" maxlength="200" />
    </label>

    <label class="row">
      <span>我的狀態</span>
      <select v-model="status">
        <option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
    </label>

    <div class="grid2">
      <label class="row">
        <span>票價（JPY）</span>
        <input v-model="ticketPrice" type="number" min="0" step="100" />
      </label>
      <label class="row">
        <span>購票連結</span>
        <input v-model="ticketUrl" type="url" placeholder="https://" />
      </label>
    </div>

    <label class="row">
      <span>個人筆記 / 備忘</span>
      <textarea v-model="notes" rows="3" />
    </label>

    <div class="actions">
      <button type="button" class="ghost" @click="emit('cancel')">取消</button>
      <button type="submit" :disabled="!title.trim() || !startAt">
        {{ initial ? '儲存' : '新增' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 1rem; }
.row { display: flex; flex-direction: column; gap: .35rem; }
.row > span { font-size: .85rem; color: #555; }
.row em { color: #ef4444; font-style: normal; }
.row input, .row select, .row textarea {
  padding: .5rem .6rem; border: 1px solid #ccc; border-radius: 6px;
  font-size: 1rem; font-family: inherit;
}
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 480px) { .grid2 { grid-template-columns: 1fr; } }
.idol-checks { display: flex; flex-wrap: wrap; gap: .5rem; }
.chk {
  display: inline-flex; align-items: center; gap: .35rem;
  padding: .35rem .6rem; border: 1px solid #ddd; border-radius: 999px;
  cursor: pointer; font-size: .9rem;
}
.chk input { margin: 0; }
.dot { width: .9rem; height: .9rem; border-radius: 50%; }
.hint { font-size: .9rem; color: #888; }
.actions { display: flex; gap: .5rem; justify-content: flex-end; }
.actions button {
  padding: .5rem 1rem; border-radius: 6px; border: 1px solid #ccc;
  background: #111; color: #fff; cursor: pointer;
}
.actions button:disabled { opacity: .5; cursor: not-allowed; }
.actions .ghost { background: transparent; color: #333; }
</style>
