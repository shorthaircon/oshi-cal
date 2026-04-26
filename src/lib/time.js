// 時間統一以日本時間（JST, UTC+9）顯示與輸入。
// 資料層儲存 ISO8601 with +09:00 offset。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

function toJstParts(iso) {
  const d = new Date(iso)
  if (isNaN(d)) return null
  const j = new Date(d.getTime() + JST_OFFSET_MS)
  return {
    y: j.getUTCFullYear(),
    mo: j.getUTCMonth() + 1,
    da: j.getUTCDate(),
    h: j.getUTCHours(),
    mi: j.getUTCMinutes(),
  }
}

function pad(n) { return String(n).padStart(2, '0') }

// '2026/05/01 18:30'
export function formatJst(iso) {
  const p = toJstParts(iso)
  if (!p) return ''
  return `${p.y}/${pad(p.mo)}/${pad(p.da)} ${pad(p.h)}:${pad(p.mi)}`
}

// '18:30'
export function formatJstTime(iso) {
  const p = toJstParts(iso)
  if (!p) return ''
  return `${pad(p.h)}:${pad(p.mi)}`
}

// '2026/05/01 (五)'
const WEEK_ZH = ['日', '一', '二', '三', '四', '五', '六']
export function formatJstDate(iso) {
  const p = toJstParts(iso)
  if (!p) return ''
  // weekday in JST
  const utcDate = Date.UTC(p.y, p.mo - 1, p.da)
  const dow = new Date(utcDate).getUTCDay()
  return `${p.y}/${pad(p.mo)}/${pad(p.da)} (${WEEK_ZH[dow]})`
}

// For <input type="datetime-local"> — value format 'YYYY-MM-DDTHH:mm' interpreted as JST.
export function isoToJstLocalInput(iso) {
  const p = toJstParts(iso)
  if (!p) return ''
  return `${p.y}-${pad(p.mo)}-${pad(p.da)}T${pad(p.h)}:${pad(p.mi)}`
}

// User typed '2026-05-01T18:30' — treat as JST and produce ISO with +09:00.
export function jstLocalInputToIso(local) {
  if (!local) return null
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return null
  const [, y, mo, da, h, mi] = m
  return `${y}-${mo}-${da}T${h}:${mi}:00+09:00`
}
