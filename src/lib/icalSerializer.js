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

function eventToIcs(ev) {
  if (!ev.startAt) return null
  const start = new Date(ev.startAt)
  if (isNaN(start)) return null
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
