<script setup>
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useIdolsStore } from '../stores/idols.js'
import { STATUSES } from '../stores/events.js'
import { isoToLocalInputInTz, localInputToIsoInTz } from '../lib/time.js'
import { TZ_OPTIONS, DEFAULT_TZ, detectTimezone } from '../lib/timezones.js'
import { currencyOf } from '../lib/currency.js'
import { readableTextOn } from '../lib/colors.js'
import TimePickerClock from './TimePickerClock.vue'
import IdolPickerSheet from './IdolPickerSheet.vue'
import CoverThumb from './CoverThumb.vue'
import CoverPicker from './CoverPicker.vue'

const router = useRouter()

const props = defineProps({
  initial: { type: Object, default: null },
})
const emit = defineEmits(['submit', 'cancel'])

const idolsStore = useIdolsStore()

const title = ref('')
const idolIds = ref([])
const startDate = ref('') // 'YYYY-MM-DD' (JST)
const startTime = ref('') // 'HH:mm' (24h JST)
const venue = ref('')
const timezone = ref(DEFAULT_TZ)
const clockOpen = ref(false)
const timeUnknown = ref(false)
const status = ref('going')
const ticketPrice = ref('')
const ticketUrl = ref('')
const notes = ref('')
const coverId = ref(null)
const coverPickerOpen = ref(false)

const currencyCode = computed(() => currencyOf(timezone.value).code)
const pickerOpen = ref(false)
const selectedIdols = computed(() =>
  idolIds.value.map(id => idolsStore.byId(id)).filter(Boolean)
)
function removeIdol(id) {
  idolIds.value = idolIds.value.filter(x => x !== id)
}
function onPriceInput(e) {
  const raw = e.target.value.replace(/[^0-9]/g, '')
  ticketPrice.value = raw ? Number(raw).toLocaleString() : ''
}

function loadFromInitial(v) {
  title.value = v?.title ?? ''
  idolIds.value = [...(v?.idolIds ?? [])]
  timezone.value = v?.timezone ?? DEFAULT_TZ
  if (v?.startAt) {
    const local = isoToLocalInputInTz(v.startAt, timezone.value)
    const [d, t] = local.split('T')
    startDate.value = d
    startTime.value = t || '19:00'
  } else {
    startDate.value = ''
    startTime.value = '19:00'
  }
  venue.value = v?.venue ?? ''
  status.value = v?.status ?? 'going'
  ticketPrice.value = v?.ticketPrice != null ? Number(v.ticketPrice).toLocaleString() : ''
  ticketUrl.value = v?.ticketUrl ?? ''
  notes.value = v?.notes ?? ''
  timeUnknown.value = !!v?.timeUnknown
  coverId.value = v?.coverId ?? null
}

// Auto-suggest timezone when venue changes (only on add, not edit)
watch(venue, (v) => {
  if (props.initial?.timezone) return // user already had a tz; don't override
  const detected = detectTimezone(v)
  if (detected !== timezone.value) timezone.value = detected
})

const ampmDisplay = computed(() => {
  if (!startTime.value) return ''
  const [h, m] = startTime.value.split(':').map(Number)
  const ampm = h >= 12 ? '下午' : '上午'
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  return `${ampm} ${h12}:${String(m).padStart(2, '0')}`
})
loadFromInitial(props.initial)
watch(() => props.initial, loadFromInitial)

const isDirty = computed(() =>
  !!title.value.trim() ||
  idolIds.value.length > 0 ||
  !!startDate.value ||
  !!venue.value.trim() ||
  String(ticketPrice.value).trim() !== '' ||
  !!ticketUrl.value.trim() ||
  !!notes.value.trim()
)

function goAddIdol() {
  if (isDirty.value && !confirm('離開將會清空已填入的欄位，確定要去新增推し嗎？')) return
  router.push('/idols')
}

function submit() {
  if (!title.value.trim() || !startDate.value) return
  if (!timeUnknown.value && !startTime.value) return
  const effectiveTime = timeUnknown.value ? '00:00' : startTime.value
  emit('submit', {
    title: title.value.trim(),
    idolIds: idolIds.value,
    timezone: timezone.value,
    startAt: localInputToIsoInTz(`${startDate.value}T${effectiveTime}`, timezone.value),
    endAt: null,
    venue: venue.value.trim(),
    status: status.value,
    timeUnknown: timeUnknown.value,
    ticketPrice: ticketPrice.value === '' ? null : Number(String(ticketPrice.value).replace(/,/g, '')),
    ticketUrl: ticketUrl.value.trim(),
    notes: notes.value,
    coverId: coverId.value,
  })
}

function onCoverChange(newId) {
  coverId.value = newId
}

const formEvent = computed(() => ({
  id: props.initial?.id,
  title: title.value,
  idolIds: idolIds.value,
  coverId: coverId.value,
}))
</script>

<template>
  <form class="event-form" @submit.prevent="submit">
    <label class="field">
      <span>標題 <em>*</em></span>
      <input v-model="title" type="text" required maxlength="200" />
    </label>

    <div class="field">
      <span>推し（可多選）</span>
      <div v-if="idolsStore.idols.length === 0" class="hint">
        還沒有推し。<button type="button" class="hint-link" @click="goAddIdol">去新增</button>
      </div>
      <div v-else class="picker-trigger">
        <span
          v-for="i in selectedIdols"
          :key="i.id"
          class="selected-chip"
          :style="{ background: i.color, color: readableTextOn(i.color) }"
        >
          <span>{{ i.name }}</span>
          <button type="button" class="x" @click="removeIdol(i.id)" aria-label="移除推し">×</button>
        </span>
        <button type="button" class="add-btn" @click="pickerOpen = true">
          {{ selectedIdols.length === 0 ? '+ 選擇推し' : '+ 添加' }}
        </button>
      </div>
    </div>

    <IdolPickerSheet
      v-model="idolIds"
      v-model:open="pickerOpen"
      :idols="idolsStore.idols"
    />

    <div class="field">
      <span>封面圖</span>
      <div class="cover-field">
        <CoverThumb :event="formEvent" size="sm" clickable @pick="coverPickerOpen = true" />
        <button type="button" class="cover-btn" @click="coverPickerOpen = true">
          {{ coverId ? '更換 / 移除' : '+ 設定封面' }}
        </button>
      </div>
    </div>

    <CoverPicker
      v-model:open="coverPickerOpen"
      :current-cover-id="coverId"
      @change="onCoverChange"
    />

    <label class="field">
      <span>時區</span>
      <select v-model="timezone">
        <option v-for="tz in TZ_OPTIONS" :key="tz.id" :value="tz.id">
          {{ tz.label }}（{{ tz.code }}）
        </option>
      </select>
    </label>

    <div class="grid-2">
      <label class="field">
        <span>日期 <em>*</em></span>
        <input v-model="startDate" type="date" required />
      </label>
      <div class="field">
        <span>時間 <em v-if="!timeUnknown">*</em></span>
        <button
          type="button"
          class="time-btn"
          :disabled="timeUnknown"
          @click="clockOpen = true"
        >
          {{ timeUnknown ? '時間待確認' : (ampmDisplay || '選擇時間') }}
        </button>
        <label class="time-unknown-toggle">
          <input type="checkbox" v-model="timeUnknown" />
          時間待確認（未公布或未抓到）
        </label>
      </div>
    </div>

    <label class="field">
      <span>地點</span>
      <input v-model="venue" type="text" maxlength="200" />
    </label>

    <label class="field">
      <span>我的狀態</span>
      <select v-model="status">
        <option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
    </label>

    <div class="grid-2">
      <label class="field">
        <span>票價（{{ currencyCode }}）</span>
        <input
          v-model="ticketPrice"
          type="text"
          inputmode="numeric"
          pattern="[0-9,]*"
          placeholder="0"
          @input="onPriceInput"
        />
      </label>
      <label class="field">
        <span>購票連結</span>
        <input v-model="ticketUrl" type="url" placeholder="https://" />
      </label>
    </div>

    <label class="field">
      <span>個人筆記 / 備忘</span>
      <textarea v-model="notes" rows="3" />
    </label>

    <div class="form-actions">
      <button type="button" class="btn-ghost" @click="emit('cancel')">取消</button>
      <button type="submit" class="btn-solid" :disabled="!title.trim() || !startDate || !startTime">
        {{ initial ? '儲存' : '新增' }}
      </button>
    </div>

    <TimePickerClock
      v-model="startTime"
      :open="clockOpen"
      @close="clockOpen = false"
    />
  </form>
</template>

<style scoped>
.event-form { display: flex; flex-direction: column; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: .4rem; }
.field > span {
  font-family: var(--font-jp);
  font-size: .9rem; color: var(--ink-soft);
  font-weight: 500;
}
.field em { color: #ef4444; font-style: normal; margin-left: .15rem; }
.field input, .field select, .field textarea {
  padding: .55rem .7rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-family: var(--font-body);
  font-size: .95rem;
  color: var(--ink);
  background: #fff;
}
.field input:focus, .field select:focus, .field textarea:focus {
  outline: none;
  border-color: var(--berry);
  box-shadow: 0 0 0 3px rgba(231, 86, 143, 0.18);
}
.time-btn {
  padding: .55rem .8rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
  font-size: .95rem;
  text-align: left;
  color: var(--ink);
  cursor: pointer;
}
.time-btn:hover:not(:disabled) { border-color: var(--ink); }
.time-btn:disabled { background: var(--bg); color: var(--ink-faint); cursor: not-allowed; }
.time-unknown-toggle {
  display: inline-flex; align-items: center; gap: .35rem;
  margin-top: .35rem;
  font-size: .8rem; color: var(--ink-soft);
  font-family: var(--font-jp);
  cursor: pointer;
}
.time-unknown-toggle input { margin: 0; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 600px) { .grid-2 { grid-template-columns: 1fr; } }

.picker-trigger {
  display: flex; flex-wrap: wrap; gap: .4rem;
  align-items: center;
  padding: .55rem;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  min-height: 50px;
}
.selected-chip {
  display: inline-flex; align-items: center; gap: .35rem;
  padding: .25rem .35rem .25rem .65rem;
  border-radius: 999px;
  font-family: var(--font-jp); font-size: .85rem; font-weight: 500;
  border: 1px solid rgba(0,0,0,.18);
}
.selected-chip .x {
  width: 18px; height: 18px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.18); color: #fff; border: none; cursor: pointer;
  font-size: .85rem; line-height: 1; padding: 0;
}
.selected-chip .x:hover { background: rgba(0,0,0,.4); }
.add-btn {
  display: inline-flex; align-items: center; gap: .35rem;
  padding: .4rem .85rem;
  background: transparent; color: var(--berry);
  border: 1px dashed var(--berry); border-radius: 999px;
  font-family: var(--font-body); font-size: .85rem; font-weight: 500;
  cursor: pointer; transition: all .15s;
}
.add-btn:hover { background: var(--berry); color: #fff; border-style: solid; }

.cover-field {
  display: flex; align-items: center; gap: .85rem;
}
.cover-btn {
  background: transparent; color: var(--ink-soft);
  border: 1px solid var(--line); border-radius: 6px;
  padding: .5rem 1rem;
  font-family: var(--font-body); font-size: .85rem;
  cursor: pointer;
}
.cover-btn:hover { color: var(--ink); border-color: var(--ink); }
.hint { font-size: .9rem; color: var(--ink-faint); }
.hint-link {
  background: none; border: 0; padding: 0;
  color: var(--berry); cursor: pointer;
  font: inherit; text-decoration: underline;
}
.hint-link:hover { color: var(--ink); }

.form-actions {
  display: flex; gap: .5rem; justify-content: flex-end;
  margin-top: .5rem;
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
  transition: all .2s; white-space: nowrap;
}
.btn-solid:hover { background: var(--berry); border-color: var(--berry); }
.btn-solid:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost {
  background: transparent; color: var(--ink-soft);
  border: 1px solid var(--line);
  padding: .55rem 1.2rem;
  font-family: var(--font-body); font-size: .9rem;
  cursor: pointer; border-radius: 6px;
  white-space: nowrap;
}
.btn-ghost:hover { color: var(--ink); border-color: var(--ink); }
</style>
