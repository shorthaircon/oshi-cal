import { createEvents } from 'ics'

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000

function toUtcArray(iso) {
  const d = new Date(iso)
  if (isNaN(d)) return null
  return [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  ]
}

function toLocalDateArray(iso, tz) {
  const d = new Date(iso)
  if (isNaN(d)) return null
  // Convert to the event's local date (so all-day events land on the right calendar day)
  const offsetMs = (tz ? tzOffsetMin(tz) : 0) * 60 * 1000
  const local = new Date(d.getTime() + offsetMs)
  return [local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate()]
}

function tzOffsetMin(tz) {
  // lazy-compute offset; mirrors timezones.js logic
  try {
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
    const parts = dtf.formatToParts(new Date())
    const off = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+0'
    const m = off.match(/GMT([+-]\d+)(?::(\d+))?/)
    if (!m) return 0
    return Number(m[1]) * 60 + (Number(m[2]) || 0)
  } catch { return 0 }
}

function eventToIcs(ev) {
  if (!ev.startAt) return null
  const start = new Date(ev.startAt)
  if (isNaN(start)) return null

  if (ev.timeUnknown) {
    // All-day event: 3-element date array → ics emits VALUE=DATE
    return {
      uid: `${ev.id}@oshi-cal`,
      title: ev.title,
      start: toLocalDateArray(ev.startAt, ev.timezone),
      location: ev.venue || undefined,
      url: ev.sourceUrl || undefined,
      description: ev.notes || undefined,
      productId: 'oshi-cal',
    }
  }

  const endIso = ev.endAt || new Date(start.getTime() + DEFAULT_DURATION_MS).toISOString()

  return {
    uid: `${ev.id}@oshi-cal`,
    title: ev.title,
    start: toUtcArray(ev.startAt),
    startInputType: 'utc',
    end: toUtcArray(endIso),
    endInputType: 'utc',
    location: ev.venue || undefined,
    url: ev.sourceUrl || undefined,
    description: ev.notes || undefined,
    productId: 'oshi-cal',
  }
}

export function serializeIcs(events) {
  const items = events.map(eventToIcs).filter(Boolean)
  if (!items.length) return { ok: false, reason: '沒有可匯出的活動' }
  const { error, value } = createEvents(items)
  if (error) return { ok: false, reason: error.message ?? String(error) }
  return { ok: true, ics: value }
}

export function downloadIcs(filename, ics) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
