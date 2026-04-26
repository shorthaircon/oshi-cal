<script setup>
import { ref, computed } from 'vue'
import { parseEventernoteEvent } from '../lib/eventernoteParser.js'
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
const errorMsg = ref('')
const parsed = ref(null) // { title, startAt, endAt, venue, sourceUrl, idolNames }
const selections = ref([]) // [{ name, existing, selected }]

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
  const cls = classifyEventernoteUrl(url.value.trim())
  if (cls.kind === 'invalid') return setError('請貼 Eventernote 網址')
  if (cls.kind === 'actor') return setError('這是偶像列表頁，批次匯入功能尚未開放（US-009）')
  if (cls.kind !== 'event') return setError('無法判斷網址格式')
  if (!PROXY) return setError('Proxy 未設定（VITE_PROXY_URL）')

  status.value = 'loading'
  try {
    const r = await fetch(`${PROXY}/?url=${encodeURIComponent(url.value.trim())}`)
    if (!r.ok) throw new Error(`Proxy 回應 ${r.status}`)
    const html = await r.text()
    const result = parseEventernoteEvent(html, url.value.trim())
    if (!result.ok) {
      // fallback to manual form with partial fields
      emit('fallback', { partial: result.partial, reason: result.reason })
      return
    }
    parsed.value = result.event
    selections.value = buildSelections(result.event.idolNames)
    status.value = 'preview'
  } catch (e) {
    setError(`抓取失敗：${e.message}`)
  }
}

function setError(msg) {
  status.value = 'error'
  errorMsg.value = msg
}

function confirmImport() {
  if (!parsed.value) return

  // Only process selected idols
  const idolIds = []
  for (const s of selections.value) {
    if (!s.selected) continue
    if (s.existing) {
      idolIds.push(s.existing.id)
    } else {
      const usedColors = idolsStore.idols.map(i => i.color)
      const idol = idolsStore.add({ name: s.name, color: recommendNext(usedColors) })
      idolIds.push(idol.id)
    }
  }

  eventsStore.add({
    title: parsed.value.title,
    startAt: parsed.value.startAt,
    endAt: parsed.value.endAt,
    venue: parsed.value.venue ?? '',
    sourceUrl: parsed.value.sourceUrl,
    idolIds,
    status: 'going',
  })
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

    <div v-if="parsed" class="preview">
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
.actions { display: flex; gap: .5rem; }
</style>
