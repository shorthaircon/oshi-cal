<script setup>
import { ref, computed } from 'vue'
import { parseEventernoteEvent, parseEventernoteActorList } from '../lib/eventernoteParser.js'
import { classifyEventernoteUrl } from '../lib/eventernoteUrl.js'
import { useIdolsStore } from '../stores/idols.js'
import { useEventsStore } from '../stores/events.js'
import { recommendNext } from '../lib/colors.js'
import { formatJst } from '../lib/time.js'

const PROXY = import.meta.env.VITE_PROXY_URL || ''

const emit = defineEmits(['done', 'cancel', 'fallback'])

const idolsStore = useIdolsStore()
const eventsStore = useEventsStore()

const url = ref('')
const status = ref('idle') // idle | loading | preview | error
const mode = ref('single') // single | batch
const errorMsg = ref('')
const parsed = ref(null) // single mode
const selections = ref([]) // single mode: [{ name, existing, selected }]
const batchItems = ref([]) // batch mode: [{ event, selected, alreadyImported, idolSelections }]

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
    idolIds: resolveIdolIds(selections.value),
    status: 'going',
  })
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
      idolIds: resolveIdolIds(item.idolSelections),
      status: 'going',
    })
  }
  emit('done')
}

function fmt(iso) {
  return iso ? formatJst(iso) : '—'
}
</script>

<template>
  <div class="panel">
    <h3>貼 Eventernote URL 匯入</h3>

    <div v-if="status !== 'preview'" class="input-row">
      <input
        v-model="url"
        type="url"
        placeholder="https://www.eventernote.com/events/123456"
        :disabled="status === 'loading'"
        @keyup.enter="go"
      />
      <button @click="go" :disabled="status === 'loading' || !url.trim()">
        {{ status === 'loading' ? '抓取中…' : '解析' }}
      </button>
      <button class="ghost" @click="emit('cancel')">取消</button>
    </div>

    <p v-if="errorMsg" class="err">{{ errorMsg }}</p>

    <div v-if="status === 'preview' && mode === 'batch' && batchItems.length" class="preview">
      <div class="batch-head">
        <strong>從偶像列表頁解析到 {{ batchItems.length }} 筆活動</strong>
        <span class="muted">（已勾選 {{ batchSelectedCount }} 筆要匯入）</span>
        <button class="ghost small" @click="batchSelectAll">全選</button>
        <button class="ghost small" @click="batchSelectNone">全不選</button>
      </div>
      <p class="hint">已匯入的會跳過。過去日期預設不勾。每筆可單獨展開調整偶像勾選。</p>
      <ul class="batch-list">
        <li v-for="item in batchItems" :key="item.event.sourceUrl" class="batch-item" :class="{ disabled: item.alreadyImported }">
          <label class="batch-row">
            <input type="checkbox" v-model="item.selected" :disabled="item.alreadyImported" />
            <div class="batch-meta">
              <div class="batch-title">{{ item.event.title }}</div>
              <div class="batch-sub">
                {{ fmt(item.event.startAt) }} JST
                <span v-if="item.event.venue"> · {{ item.event.venue }}</span>
              </div>
            </div>
            <span v-if="item.alreadyImported" class="tag">已匯入</span>
          </label>
          <details v-if="item.selected && !item.alreadyImported && item.idolSelections.length" class="batch-idols">
            <summary>偶像 ({{ item.idolSelections.filter(s => s.selected).length }} / {{ item.idolSelections.length }})</summary>
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
        <button class="ghost" @click="emit('cancel')">取消</button>
      </div>
    </div>

    <div v-if="status === 'preview' && mode === 'single' && parsed" class="preview">
      <p v-if="duplicate" class="warn">
        ⚠️ 已有相同 sourceUrl 的活動「{{ duplicate.title }}」，匯入會建立第二筆。
      </p>
      <dl>
        <dt>標題</dt><dd>{{ parsed.title }}</dd>
        <dt>開始</dt><dd>{{ fmt(parsed.startAt) }} <span class="muted">JST</span></dd>
        <dt>結束</dt><dd>{{ parsed.endAt ? fmt(parsed.endAt) : '（未提供）' }}</dd>
        <dt>地點</dt><dd>{{ parsed.venue || '（未提供）' }}</dd>
        <dt>偶像</dt>
        <dd>
          <p v-if="selections.length === 0" class="muted">（未偵測到）</p>
          <p v-else class="hint">勾選要綁定的偶像。「不存在」勾起來會自動建立並推薦顏色。</p>
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
            未勾任何偶像，活動仍可匯入，僅記錄時間與地點。可之後在編輯活動時再加。
          </p>
        </dd>
      </dl>
      <div class="actions">
        <button @click="confirmImport">確認匯入</button>
        <button class="ghost" @click="emit('cancel')">取消</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  padding: 1rem; background: #f5f9ff; border: 1px solid #c7d8f5; border-radius: 8px;
  margin-bottom: 1rem;
}
.panel h3 { margin: 0 0 .75rem; }
.input-row { display: flex; gap: .5rem; flex-wrap: wrap; }
.input-row input {
  flex: 1; min-width: 240px;
  padding: .5rem .6rem; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem;
}
button {
  padding: .5rem 1rem; border-radius: 6px; border: 1px solid #ccc;
  background: #111; color: #fff; cursor: pointer;
}
button.ghost { background: #fff; color: #333; }
button:disabled { opacity: .5; cursor: not-allowed; }
.err { color: #b91c1c; font-size: .9rem; margin: .5rem 0 0; }
.warn { color: #b45309; font-size: .9rem; }
.preview { margin-top: 1rem; }
dl { display: grid; grid-template-columns: 4rem 1fr; gap: .35rem .75rem; margin: 0 0 1rem; }
dt { color: #555; font-size: .9rem; }
dd { margin: 0; }
.muted { color: #888; font-size: .8rem; }
.hint { font-size: .8rem; color: #666; margin: 0 0 .5rem; }
.hint.warn { color: #b45309; }
.sel-list {
  list-style: none; padding: 0; margin: 0;
  max-height: 14rem; overflow-y: auto;
  border: 1px solid #e5e7eb; border-radius: 6px; background: #fff;
}
.sel { border-bottom: 1px solid #f3f4f6; }
.sel:last-child { border-bottom: 0; }
.sel label {
  display: flex; align-items: center; gap: .5rem;
  padding: .4rem .6rem; cursor: pointer; font-size: .9rem;
}
.sel label:hover { background: #f9fafb; }
.dot { width: 1rem; height: 1rem; border-radius: 50%; flex-shrink: 0; }
.dot.placeholder { background: repeating-linear-gradient(45deg, #e5e7eb 0 4px, #f3f4f6 4px 8px); }
.name { flex: 1; }
.tag { font-size: .7rem; padding: .1rem .4rem; border-radius: 999px; background: #e5e7eb; color: #374151; }
.tag.new { background: #fef3c7; color: #92400e; }

.batch-head { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; margin-bottom: .5rem; }
.batch-head .muted { color: #666; font-size: .85rem; }
.small { font-size: .8rem; padding: .25rem .5rem; }
.batch-list { list-style: none; padding: 0; margin: 0 0 1rem; display: flex; flex-direction: column; gap: .5rem; max-height: 26rem; overflow-y: auto; }
.batch-item { background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: .5rem .75rem; }
.batch-item.disabled { opacity: .55; }
.batch-row { display: flex; gap: .6rem; align-items: flex-start; cursor: pointer; }
.batch-meta { flex: 1; }
.batch-title { font-weight: 500; font-size: .95rem; }
.batch-sub { font-size: .8rem; color: #666; }
.batch-idols { margin-top: .5rem; padding-left: 1.5rem; }
.batch-idols summary { font-size: .8rem; color: #555; cursor: pointer; }
.actions { display: flex; gap: .5rem; }
</style>
