<script setup>
import { ref, computed, watch } from 'vue'
import { parseEventernoteEvent, parseEventernoteActorList } from '../lib/eventernoteParser.js'
import { classifyEventernoteUrl } from '../lib/eventernoteUrl.js'
import { useIdolsStore } from '../stores/idols.js'
import { useEventsStore } from '../stores/events.js'
import { recommendNext } from '../lib/colors.js'
import { formatInTz } from '../lib/time.js'
import { tzCodeOf } from '../lib/timezones.js'
import { deleteImage } from '../lib/imageStore.js'
import CoverThumb from './CoverThumb.vue'
import CoverPicker from './CoverPicker.vue'

const PROXY = import.meta.env.VITE_PROXY_URL || ''

const props = defineProps({
  initialUrl: { type: String, default: '' },
})
const emit = defineEmits(['done', 'cancel', 'fallback'])

const idolsStore = useIdolsStore()
const eventsStore = useEventsStore()

const url = ref(props.initialUrl || '')
watch(() => props.initialUrl, (v) => {
  if (v && !url.value) url.value = v
})
const status = ref('idle') // idle | loading | preview | error
const mode = ref('single') // single | batch
const errorMsg = ref('')
const parsed = ref(null) // single mode
const selections = ref([]) // single mode: [{ name, existing, selected }]
const batchItems = ref([]) // batch mode: [{ event, selected, alreadyImported, idolSelections }]
const coverId = ref(null) // single mode: optional cover image id (set via CoverPicker)
const coverPickerOpen = ref(false)

const previewEventForThumb = computed(() => ({
  id: '_import_preview',
  title: parsed.value?.title || '',
  idolIds: [],
  coverId: coverId.value,
}))

function onCoverChange(newId) {
  coverId.value = newId
}

function onCancel() {
  if (coverId.value) deleteImage(coverId.value).catch(() => {})
  coverId.value = null
  emit('cancel')
}

function buildSelections(idolNames) {
  return idolNames.map(name => {
    const existing = idolsStore.idols.find(i => i.name === name)
    return { name, existing: existing ?? null, selected: !!existing }
  })
}

const noneSelected = computed(() => selections.value.every(s => !s.selected))

const duplicate = computed(() => {
  if (!parsed.value?.sourceUrl) return null
  return eventsStore.events.find(e => e.sourceUrl === parsed.value.sourceUrl)
})

async function go() {
  errorMsg.value = ''
  parsed.value = null
  batchItems.value = []
  // discard any cover the user may have set in a previous parse session
  if (coverId.value) deleteImage(coverId.value).catch(() => {})
  coverId.value = null
  const target = url.value.trim()
  const cls = classifyEventernoteUrl(target)
  if (cls.kind === 'invalid') return setError('請貼 Eventernote 網址')
  if (cls.kind === 'unknown') return setError('無法判斷網址格式')
  if (!PROXY) return setError('Proxy 未設定（VITE_PROXY_URL）')

  status.value = 'loading'
  try {
    const r = await fetch(`${PROXY}/?url=${encodeURIComponent(target)}`)
    if (!r.ok) throw new Error(`Proxy 回應 ${r.status}`)
    const html = await r.text()

    if (cls.kind === 'event') {
      mode.value = 'single'
      const result = parseEventernoteEvent(html, target)
      if (!result.ok) {
        emit('fallback', { partial: result.partial, reason: result.reason })
        return
      }
      parsed.value = result.event
      selections.value = buildSelections(result.event.idolNames)
    } else if (cls.kind === 'actor') {
      mode.value = 'batch'
      const result = parseEventernoteActorList(html)
      if (!result.ok) return setError(`列表解析失敗：${result.reason}`)
      batchItems.value = result.events.map(ev => {
        const exists = eventsStore.events.some(e => e.sourceUrl === ev.sourceUrl)
        const isPast = ev.startAt && new Date(ev.startAt).getTime() < Date.now()
        return {
          event: ev,
          alreadyImported: exists,
          selected: !exists && !isPast,
          idolSelections: buildSelections(ev.idolNames),
        }
      })
    }
    status.value = 'preview'
  } catch (e) {
    setError(`抓取失敗：${e.message}`)
  }
}

const batchSelectedCount = computed(
  () => batchItems.value.filter(x => x.selected && !x.alreadyImported).length
)
function batchSelectAll() { batchItems.value.forEach(x => { if (!x.alreadyImported) x.selected = true }) }
function batchSelectNone() { batchItems.value.forEach(x => x.selected = false) }

function setError(msg) {
  status.value = 'error'
  errorMsg.value = msg
}

async function pasteFromClipboard() {
  errorMsg.value = ''
  if (!navigator.clipboard?.readText) {
    return setError('此瀏覽器不支援讀取剪貼簿，請手動貼上')
  }
  try {
    const text = (await navigator.clipboard.readText()).trim()
    if (!text) return setError('剪貼簿是空的')
    url.value = text
    status.value = 'idle'
  } catch (e) {
    setError(`無法讀取剪貼簿：${e.message || '已被拒絕'}`)
  }
}

function resolveIdolIds(idolSelections) {
  const idolIds = []
  for (const s of idolSelections) {
    if (!s.selected) continue
    if (s.existing) {
      idolIds.push(s.existing.id)
    } else {
      const usedColors = idolsStore.idols.map(i => i.color)
      const idol = idolsStore.add({ name: s.name, color: recommendNext(usedColors) })
      idolIds.push(idol.id)
    }
  }
  return idolIds
}

function confirmImport() {
  if (!parsed.value) return
  eventsStore.add({
    title: parsed.value.title,
    startAt: parsed.value.startAt,
    endAt: parsed.value.endAt,
    venue: parsed.value.venue ?? '',
    sourceUrl: parsed.value.sourceUrl,
    timezone: parsed.value.timezone,
    timeUnknown: !!parsed.value.timeUnknown,
    idolIds: resolveIdolIds(selections.value),
    status: 'going',
    type: 'concert',
    coverId: coverId.value,
  })
  coverId.value = null
  emit('done')
}

function confirmBatchImport() {
  for (const item of batchItems.value) {
    if (!item.selected || item.alreadyImported) continue
    eventsStore.add({
      title: item.event.title,
      startAt: item.event.startAt,
      endAt: item.event.endAt,
      venue: item.event.venue ?? '',
      sourceUrl: item.event.sourceUrl,
      timezone: item.event.timezone,
      timeUnknown: !!item.event.timeUnknown,
      idolIds: resolveIdolIds(item.idolSelections),
      status: 'going',
    type: 'concert',
    })
  }
  emit('done')
}

function fmt(iso, tz) {
  return iso ? formatInTz(iso, tz) : '—'
}

</script>

<template>
  <div class="panel">
    <h3>貼 Eventernote URL 匯入</h3>

    <div v-if="status !== 'preview'" class="input-row">
      <input
        v-model="url"
        type="url"
        placeholder="貼上 Eventernote 活動頁網址"
        :disabled="status === 'loading'"
        @keyup.enter="go"
      />
      <button
        type="button"
        class="ghost paste-btn"
        @click="pasteFromClipboard"
        :disabled="status === 'loading'"
        title="從剪貼簿貼上"
      >📋 貼上</button>
      <button @click="go" :disabled="status === 'loading' || !url.trim()">
        {{ status === 'loading' ? '抓取中…' : '解析' }}
      </button>
      <button class="ghost" @click="onCancel">取消</button>
    </div>

    <p v-if="errorMsg" class="err">{{ errorMsg }}</p>

    <div v-if="status === 'preview' && mode === 'batch' && batchItems.length" class="preview">
      <div class="batch-head">
        <strong>從推し列表頁解析到 {{ batchItems.length }} 筆活動</strong>
        <span class="muted">（已勾選 {{ batchSelectedCount }} 筆要匯入）</span>
        <button class="ghost small" @click="batchSelectAll">全選</button>
        <button class="ghost small" @click="batchSelectNone">全不選</button>
      </div>
      <p class="hint">已匯入的會跳過。過去日期預設不勾。每筆可單獨展開調整推し勾選。</p>
      <ul class="batch-list">
        <li v-for="item in batchItems" :key="item.event.sourceUrl" class="batch-item" :class="{ disabled: item.alreadyImported }">
          <label class="batch-row">
            <input type="checkbox" v-model="item.selected" :disabled="item.alreadyImported" />
            <div class="batch-meta">
              <div class="batch-title">{{ item.event.title }}</div>
              <div class="batch-sub">
                <template v-if="item.event.timeUnknown">
                  {{ fmt(item.event.startAt, item.event.timezone).split(' ')[0] }} ・ 時間待確認 {{ tzCodeOf(item.event.timezone) }}
                </template>
                <template v-else>
                  {{ fmt(item.event.startAt, item.event.timezone) }} {{ tzCodeOf(item.event.timezone) }}
                </template>
                <span v-if="item.event.venue"> · {{ item.event.venue }}</span>
              </div>
            </div>
            <span v-if="item.alreadyImported" class="tag">已匯入</span>
          </label>
          <details v-if="item.selected && !item.alreadyImported && item.idolSelections.length" class="batch-idols">
            <summary>推し ({{ item.idolSelections.filter(s => s.selected).length }} / {{ item.idolSelections.length }})</summary>
            <ul class="sel-list">
              <li v-for="s in item.idolSelections" :key="s.name" class="sel">
                <label>
                  <input type="checkbox" v-model="s.selected" />
                  <span class="dot" v-if="s.existing" :style="{ background: s.existing.color }" />
                  <span class="dot placeholder" v-else />
                  <span class="name">{{ s.name }}</span>
                  <span class="tag" :class="{ new: !s.existing }">{{ s.existing ? '已存在' : '不存在' }}</span>
                </label>
              </li>
            </ul>
          </details>
        </li>
      </ul>
      <div class="actions">
        <button @click="confirmBatchImport" :disabled="batchSelectedCount === 0">
          匯入 {{ batchSelectedCount }} 筆
        </button>
        <button class="ghost" @click="onCancel">取消</button>
      </div>
    </div>

    <div v-if="status === 'preview' && mode === 'single' && parsed" class="preview">
      <p v-if="duplicate" class="warn">
        ⚠️ 已有相同 sourceUrl 的活動「{{ duplicate.title }}」，匯入會建立第二筆。
      </p>
      <dl>
        <dt>標題</dt><dd>{{ parsed.title }}</dd>
        <template v-if="parsed.timeUnknown">
          <dt>日期</dt><dd>{{ fmt(parsed.startAt, parsed.timezone).split(' ')[0] }} <span class="muted">{{ tzCodeOf(parsed.timezone) }}</span></dd>
          <dt>時間</dt><dd><span class="time-tbd">時間待確認</span> <span class="muted">（Eventernote 頁面未公布）</span></dd>
        </template>
        <template v-else>
          <dt>開始</dt><dd>{{ fmt(parsed.startAt, parsed.timezone) }} <span class="muted">{{ tzCodeOf(parsed.timezone) }}</span></dd>
          <dt>結束</dt><dd>{{ parsed.endAt ? fmt(parsed.endAt, parsed.timezone) : '（未提供）' }}</dd>
        </template>
        <dt>地點</dt><dd>{{ parsed.venue || '（未提供）' }}</dd>
        <dt>封面</dt>
        <dd>
          <div class="cover-pick">
            <CoverThumb :event="previewEventForThumb" size="sm" clickable @pick="coverPickerOpen = true" />
            <button type="button" class="ghost cover-btn" @click="coverPickerOpen = true">
              {{ coverId ? '更換 / 移除' : '+ 設定封面（選填）' }}
            </button>
          </div>
        </dd>
        <dt>推し</dt>
        <dd>
          <p v-if="selections.length === 0" class="muted">（未偵測到）</p>
          <p v-else class="hint">勾選要綁定的推し。「不存在」勾起來會自動建立並推薦顏色。</p>
          <ul v-if="selections.length" class="sel-list">
            <li v-for="s in selections" :key="s.name" class="sel">
              <label>
                <input type="checkbox" v-model="s.selected" />
                <span class="dot" v-if="s.existing" :style="{ background: s.existing.color }" />
                <span class="dot placeholder" v-else />
                <span class="name">{{ s.name }}</span>
                <span class="tag" :class="{ new: !s.existing }">{{ s.existing ? '已存在' : '不存在' }}</span>
              </label>
            </li>
          </ul>
          <p v-if="selections.length && noneSelected" class="hint warn">
            未勾任何推し，活動仍可匯入，僅記錄時間與地點。可之後在編輯活動時再加。
          </p>
        </dd>
      </dl>
      <div class="actions">
        <button @click="confirmImport">確認匯入</button>
        <button class="ghost" @click="onCancel">取消</button>
      </div>
    </div>

    <CoverPicker
      v-model:open="coverPickerOpen"
      :current-cover-id="coverId"
      @change="onCoverChange"
    />
  </div>
</template>

<style scoped>
.panel {
  background: var(--paper);
  border: 2px solid var(--ink);
  border-radius: 4px;
  padding: 1.25rem;
  box-shadow: 0 2px 0 var(--ink), 0 12px 24px rgba(59, 31, 43, 0.08);
  margin-bottom: 1.25rem;
}
.panel h3 {
  margin: 0 0 .75rem;
  font-family: var(--font-display);
  font-size: 1.15rem; font-weight: 900;
  letter-spacing: .1em; text-transform: uppercase;
  color: var(--ink);
}
.input-row { display: flex; gap: .5rem; flex-wrap: wrap; }
.input-row input {
  flex: 1; min-width: 240px;
  padding: .55rem .7rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-family: var(--font-body);
  font-size: .95rem; color: var(--ink);
  background: #fff;
}
.input-row input:focus {
  outline: none;
  border-color: var(--berry);
  box-shadow: 0 0 0 3px rgba(231, 86, 143, 0.18);
}
button {
  padding: .55rem 1.2rem;
  border: 2px solid var(--ink);
  border-radius: 6px;
  background: var(--ink); color: #fff;
  font-family: var(--font-body);
  font-size: .9rem; font-weight: 500;
  cursor: pointer;
  transition: all .2s;
}
button:hover { background: var(--berry); border-color: var(--berry); }
button.ghost {
  background: transparent;
  border: 1px solid var(--line);
  color: var(--ink-soft);
}
button.ghost:hover { color: var(--ink); border-color: var(--ink); background: transparent; }
button:disabled { opacity: .5; cursor: not-allowed; }

.err {
  color: #b91c1c;
  font-size: .85rem;
  margin: .5rem 0 0;
  font-family: var(--font-jp);
}
.warn { color: #b45309; font-size: .85rem; font-family: var(--font-jp); }
.time-tbd {
  font-family: var(--font-jp); font-weight: 500;
  color: var(--berry);
  background: #fef0c7;
  padding: .1rem .5rem;
  border-radius: 4px;
  font-size: .85rem;
}
.preview { margin-top: 1rem; }

dl {
  display: grid;
  grid-template-columns: 4rem 1fr;
  gap: .5rem .75rem;
  margin: 0 0 1rem;
}
dt {
  font-family: var(--font-jp);
  color: var(--ink-soft);
  font-size: .85rem;
  font-weight: 500;
}
dd {
  margin: 0;
  font-family: var(--font-jp);
  font-size: .9rem;
  color: var(--ink);
}
.muted { color: var(--ink-faint); font-size: .8rem; }
.hint {
  font-family: var(--font-jp);
  font-size: .8rem;
  color: var(--ink-soft);
  margin: 0 0 .5rem;
}
.hint.warn { color: #b45309; }

.sel-list {
  list-style: none; padding: 0; margin: 0;
  max-height: 14rem; overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
}
.sel { border-bottom: 1px solid var(--line-soft); }
.sel:last-child { border-bottom: 0; }
.sel label {
  display: flex; align-items: center;
  gap: .5rem;
  padding: .45rem .6rem;
  cursor: pointer;
  font-size: .85rem;
  font-family: var(--font-jp);
}
.sel label:hover { background: var(--bg); }
.dot {
  width: 1rem; height: 1rem;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.15);
}
.dot.placeholder {
  background: repeating-linear-gradient(45deg, var(--line) 0 4px, var(--line-soft) 4px 8px);
}
.name { flex: 1; }
.tag {
  font-family: var(--font-nav);
  font-size: .65rem;
  letter-spacing: .1em;
  padding: .1rem .5rem;
  border-radius: 999px;
  background: var(--line-soft);
  color: var(--ink-soft);
}
.tag.new { background: var(--washi); color: var(--gold); }

.batch-head {
  display: flex;
  align-items: center;
  gap: .5rem;
  flex-wrap: wrap;
  margin-bottom: .5rem;
}
.batch-head .muted {
  color: var(--ink-soft);
  font-size: .85rem;
  font-family: var(--font-jp);
}
.small {
  font-size: .75rem;
  padding: .3rem .65rem;
  font-family: var(--font-nav);
  letter-spacing: .1em;
}
.batch-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
  display: flex; flex-direction: column;
  gap: .5rem;
  max-height: 26rem;
  overflow-y: auto;
}
.batch-item {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: .55rem .75rem;
}
.batch-item.disabled { opacity: .55; }
.batch-row {
  display: flex;
  gap: .6rem;
  align-items: flex-start;
  cursor: pointer;
}
.batch-meta { flex: 1; }
.batch-title {
  font-family: var(--font-jp);
  font-weight: 500;
  font-size: .9rem;
  color: var(--ink);
}
.batch-sub {
  font-family: var(--font-body);
  font-size: .78rem;
  color: var(--ink-faint);
}
.batch-idols { margin-top: .5rem; padding-left: 1.5rem; }
.batch-idols summary {
  font-family: var(--font-jp);
  font-size: .78rem;
  color: var(--ink-soft);
  cursor: pointer;
}
.actions { display: flex; gap: .5rem; }
.cover-pick {
  display: flex; align-items: center; gap: .65rem;
}
.cover-btn {
  padding: .45rem .85rem !important;
  font-size: .8rem !important;
}
</style>
