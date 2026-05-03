<script setup>
import { ref } from 'vue'
import { loadAll, replaceAll, markBackup, CURRENT_VERSION } from '../lib/storage.js'
import { useIdolsStore } from '../stores/idols.js'
import { useEventsStore } from '../stores/events.js'
import { useMetaStore } from '../stores/meta.js'
import { serializeIcs, downloadIcs } from '../lib/icalSerializer.js'

const idolsStore = useIdolsStore()
const eventsStore = useEventsStore()
const metaStore = useMetaStore()

const fileInput = ref(null)
const preview = ref(null) // { idolCount, eventCount, version, data, warning }
const message = ref('')

function exportJson() {
  const data = loadAll()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const ts = stamp(new Date())
  const a = document.createElement('a')
  a.href = url
  a.download = `oshi-cal-backup-${ts}.json`
  a.click()
  URL.revokeObjectURL(url)
  markBackup()
  metaStore.refresh()
  message.value = `已匯出（${data.idols.length} 推し / ${data.events.length} 活動）`
}

function exportIcsAll() {
  const events = eventsStore.events
  if (!events.length) {
    message.value = '沒有活動可匯出'
    return
  }
  const result = serializeIcs(events)
  if (!result.ok) {
    message.value = `iCal 匯出失敗：${result.reason}`
    return
  }
  downloadIcs(`oshi-cal-events-${stamp(new Date())}.ics`, result.ics)
  message.value = `已匯出 ${events.length} 場活動為 iCal`
}

function pickFile() {
  fileInput.value?.click()
}

async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.idols) || !Array.isArray(parsed.events)) {
      throw new Error('檔案格式不正確（缺少 idols / events 陣列）')
    }
    const v = parsed.version
    let warning = null
    if (v !== CURRENT_VERSION) {
      warning = `備份檔版本 ${v ?? '未指定'}，目前版本 ${CURRENT_VERSION}。匯入仍可繼續，但欄位可能不相容。`
    }
    preview.value = {
      idolCount: parsed.idols.length,
      eventCount: parsed.events.length,
      version: v,
      data: parsed,
      warning,
    }
    message.value = ''
  } catch (err) {
    preview.value = null
    message.value = `匯入失敗：${err.message}`
  } finally {
    e.target.value = ''
  }
}

function confirmImport() {
  if (!preview.value) return
  replaceAll(preview.value.data)
  idolsStore.reload()
  eventsStore.reload()
  metaStore.refresh()
  message.value = `已匯入（${preview.value.idolCount} 推し / ${preview.value.eventCount} 活動）`
  preview.value = null
}

function cancelImport() {
  preview.value = null
}

function stamp(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}
</script>

<template>
  <section class="view-settings">
    <header class="page-head">
      <div class="brand-mark">— Settings —</div>
      <h2 class="t-h2">設定</h2>
    </header>

    <div class="stage">
      <h3 class="stage-title">備份</h3>
      <p class="muted">
        所有資料只存在這個瀏覽器的 localStorage。換裝置或清掉瀏覽器資料前，請先匯出備份。
      </p>
      <div class="row">
        <button class="btn-solid" @click="exportJson">匯出 JSON</button>
        <button class="btn-ghost" @click="pickFile">匯入 JSON</button>
        <input
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          style="display:none"
          @change="onFile"
        />
      </div>
    </div>

    <div class="stage">
      <h3 class="stage-title">匯出至系統行事曆</h3>
      <p class="muted">
        產出 .ics 檔，雙擊匯入 macOS / iOS 系統行事曆，可獲得活動提醒。
      </p>
      <div class="row">
        <button class="btn-solid" @click="exportIcsAll">匯出全部活動 (.ics)</button>
      </div>
      <p v-if="message" class="msg">{{ message }}</p>
    </div>

    <div v-if="preview" class="stage preview-stage">
      <h3 class="stage-title">確認匯入</h3>
      <ul class="preview-list">
        <li>推し：<span class="num">{{ preview.idolCount }}</span> 筆</li>
        <li>活動：<span class="num">{{ preview.eventCount }}</span> 筆</li>
        <li>備份版本：{{ preview.version ?? '未指定' }}</li>
      </ul>
      <p v-if="preview.warning" class="warn">⚠️ {{ preview.warning }}</p>
      <p class="danger">匯入會<strong>覆蓋</strong>目前所有資料。</p>
      <div class="row">
        <button class="btn-solid" @click="confirmImport">確認匯入</button>
        <button class="btn-ghost" @click="cancelImport">取消</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page-head {
  text-align: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--line);
}
.brand-mark {
  font-family: var(--font-nav);
  font-size: .7rem; letter-spacing: .35em;
  text-transform: uppercase;
  color: var(--berry); font-weight: 500;
  margin-bottom: .5rem;
}
.t-h2 {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 900;
  letter-spacing: .15em;
  text-transform: uppercase;
  color: var(--ink);
  margin: 0;
}

.stage {
  background: var(--paper);
  border: 2px solid var(--ink);
  border-radius: 4px;
  padding: 1.5rem;
  box-shadow: 0 2px 0 var(--ink), 0 12px 24px rgba(59, 31, 43, 0.08);
  margin-bottom: 1.5rem;
}
.stage-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--ink);
  margin: 0 0 .75rem;
}
.muted {
  color: var(--ink-soft);
  font-size: .9rem;
  margin: 0 0 1rem;
  font-family: var(--font-jp);
}
.row { display: flex; gap: .5rem; flex-wrap: wrap; }
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
.btn-ghost {
  background: transparent; color: var(--ink-soft);
  border: 1px solid var(--line);
  padding: .55rem 1.2rem;
  font-family: var(--font-body); font-size: .9rem;
  cursor: pointer; border-radius: 6px;
  white-space: nowrap;
}
.btn-ghost:hover { color: var(--ink); border-color: var(--ink); }

.msg {
  font-size: .85rem;
  color: var(--ink-soft);
  margin: .75rem 0 0;
  font-family: var(--font-jp);
}
.warn { color: #b45309; font-size: .9rem; font-family: var(--font-jp); }
.danger { color: #b91c1c; font-size: .9rem; font-family: var(--font-jp); }
.preview-stage { background: #fef0c7; border-color: var(--gold); }
.preview-list {
  margin: .5rem 0;
  padding-left: 1.25rem;
  font-family: var(--font-jp);
  font-size: .9rem;
}
.preview-list .num {
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
</style>
