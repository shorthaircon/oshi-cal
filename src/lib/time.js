// Time formatting & input parsing for arbitrary timezones.
// Storage convention: ISO 8601 with proper offset for the event's local timezone.

import { offsetMinOf, DEFAULT_TZ } from './timezones.js'

function pad(n) { return String(n).padStart(2, '0') }

function toLocalParts(iso, tz) {
  const d = new Date(iso)
  if (isNaN(d)) return null
  const offsetMs = offsetMinOf(tz) * 60 * 1000
  const local = new Date(d.getTime() + offsetMs)
  return {
    y: local.getUTCFullYear(),
    mo: local.getUTCMonth() + 1,
    da: local.getUTCDate(),
    h: local.getUTCHours(),
    mi: local.getUTCMinutes(),
  }
}

// 'YYYY/MM/DD HH:MM' in the event's tz.
export function formatInTz(iso, tz = DEFAULT_TZ) {
  const p = toLocalParts(iso, tz)
  if (!p) return ''
  return `${p.y}/${pad(p.mo)}/${pad(p.da)} ${pad(p.h)}:${pad(p.mi)}`
}

export function formatTimeInTz(iso, tz = DEFAULT_TZ) {
  const p = toLocalParts(iso, tz)
  if (!p) return ''
  return `${pad(p.h)}:${pad(p.mi)}`
}

const WEEK_ZH = ['日', '一', '二', '三', '四', '五', '六']
export function formatDateInTz(iso, tz = DEFAULT_TZ) {
  const p = toLocalParts(iso, tz)
  if (!p) return ''
  const dow = new Date(Date.UTC(p.y, p.mo - 1, p.da)).getUTCDay()
  return `${p.y}/${pad(p.mo)}/${pad(p.da)} (${WEEK_ZH[dow]})`
}

// Date key 'YYYY-MM-DD' in tz, used for grouping events by day.
export function dateKeyInTz(iso, tz = DEFAULT_TZ) {
  const p = toLocalParts(iso, tz)
  if (!p) return null
  return `${p.y}-${pad(p.mo)}-${pad(p.da)}`
}

// Today's date key in the user's device timezone (for "today" highlight).
export function deviceTodayKey(now = Date.now()) {
  const d = new Date(now)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// '<input type="datetime-local">' value 'YYYY-MM-DDTHH:mm' interpreted in tz.
export function isoToLocalInputInTz(iso, tz = DEFAULT_TZ) {
  const p = toLocalParts(iso, tz)
  if (!p) return ''
  return `${p.y}-${pad(p.mo)}-${pad(p.da)}T${pad(p.h)}:${pad(p.mi)}`
}

// User typed '2026-05-01T18:30' — treat as wall time in tz, produce ISO with that tz's offset.
export function localInputToIsoInTz(local, tz = DEFAULT_TZ) {
  if (!local) return null
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return null
  const [, y, mo, da, h, mi] = m
  return `${y}-${mo}-${da}T${h}:${mi}:00${offsetString(tz)}`
}

// Build ISO from separate date 'YYYY-MM-DD' + time 'HH:mm' + tz.
export function combineWithTz(date, time, tz = DEFAULT_TZ) {
  if (!date) return null
  const t = time ?? '00:00'
  return `${date}T${t}:00${offsetString(tz)}`
}

function offsetString(tz) {
  const m = offsetMinOf(tz)
  const sign = m >= 0 ? '+' : '-'
  const a = Math.abs(m)
  return `${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`
}

// ---- Backward-compat shortcuts (JST defaults) ----
export const formatJst = (iso) => formatInTz(iso, 'Asia/Tokyo')
export const formatJstTime = (iso) => formatTimeInTz(iso, 'Asia/Tokyo')
export const formatJstDate = (iso) => formatDateInTz(iso, 'Asia/Tokyo')
export const jstDateKey = (iso) => dateKeyInTz(iso, 'Asia/Tokyo')
export const jstTodayKey = (now) => deviceTodayKey(now)
export const isoToJstLocalInput = (iso) => isoToLocalInputInTz(iso, 'Asia/Tokyo')
export const jstLocalInputToIso = (local) => localInputToIsoInTz(local, 'Asia/Tokyo')
