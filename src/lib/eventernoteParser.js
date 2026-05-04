// Parses an Eventernote single event page HTML into a structured event.
// Returns { ok: true, event: {...} } or { ok: false, reason, partial }.

import { detectTimezone, offsetString } from './timezones.js'

const ROW_KEYS = {
  '開催日時': 'date',
  '時間': 'time',
  '開催場所': 'venue',
  '出演者': 'actors',
}

export function parseEventernoteEvent(html, sourceUrl = null) {
  let doc
  try {
    doc = new DOMParser().parseFromString(html, 'text/html')
  } catch (e) {
    return { ok: false, reason: `HTML 解析失敗: ${e.message}`, partial: {} }
  }

  const title = meta(doc, 'og:title')
  const ogDesc = meta(doc, 'og:description')

  const rows = extractRows(doc)
  const dateStr = rows.date ? extractDate(rows.date) : extractDateFromOg(ogDesc)
  const times = rows.time ? extractTimes(rows.time) : { start: null, end: null }
  const venue = rows.venue
    ? rows.venue.querySelector('a')?.textContent?.trim() || rows.venue.textContent.trim()
    : extractVenueFromOg(ogDesc)
  const idolNames = rows.actors
    ? extractActorsFromRow(rows.actors)
    : extractActorsFromOg(ogDesc)

  const tz = detectTimezone(venue)
  const startAt = combineWithTz(dateStr, times.start, tz)
  const endAt = combineWithTz(dateStr, times.end, tz)

  const partial = {
    title: (title ?? '').trim() || null,
    startAt,
    endAt,
    venue: venue || null,
    sourceUrl,
    timezone: tz,
    timeUnknown: !times.start,
    idolNames: idolNames.filter(Boolean),
  }

  if (!partial.title || !startAt) {
    return {
      ok: false,
      reason: !partial.title ? '抓不到標題' : '抓不到日期/開始時間',
      partial,
    }
  }
  return { ok: true, event: partial }
}

function meta(doc, prop) {
  return doc.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') ?? null
}

function extractRows(doc) {
  const out = {}
  const trs = doc.querySelectorAll('table tr')
  for (const tr of trs) {
    const tds = tr.querySelectorAll('td')
    if (tds.length < 2) continue
    const label = tds[0].textContent.trim()
    const key = ROW_KEYS[label]
    if (key) out[key] = tds[1]
  }
  return out
}

function extractDate(td) {
  // td contains text like "2026-05-01 (金)" possibly inside <a>
  const text = td.textContent.replace(/\s+/g, ' ').trim()
  const m = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (!m) return null
  return `${m[1]}-${pad(m[2])}-${pad(m[3])}`
}

function extractTimes(td) {
  const text = td.textContent.replace(/\s+/g, ' ')
  const start = matchTime(text, /開演\s*(\d{1,2}:\d{2})/)
    ?? matchTime(text, /開場\s*(\d{1,2}:\d{2})/)
  const end = matchTime(text, /終演\s*(\d{1,2}:\d{2})/)
  return { start, end }
}

function matchTime(text, regex) {
  const m = text.match(regex)
  return m ? normalizeTime(m[1]) : null
}

function normalizeTime(s) {
  const [h, m] = s.split(':')
  return `${pad(h)}:${pad(m)}`
}

function pad(n) { return String(n).padStart(2, '0') }

function combineWithTz(date, time, tz) {
  if (!date) return null
  const t = time ?? '00:00'
  return `${date}T${t}:00${offsetString(tz)}`
}

function extractDateFromOg(desc) {
  if (!desc) return null
  const m = desc.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  return m ? `${m[1]}-${pad(m[2])}-${pad(m[3])}` : null
}

function extractVenueFromOg(desc) {
  if (!desc) return null
  // og:description format: "YYYY-MM-DD (曜)／venue／actor1[, actor2]"
  const parts = desc.split('／')
  return parts[1]?.trim() || null
}

function extractActorsFromRow(td) {
  const items = td.querySelectorAll('ul.actors li')
  const names = []
  for (const li of items) {
    const a = li.querySelector('a')
    const name = (a?.textContent ?? li.textContent).trim()
    if (name) names.push(name)
  }
  return Array.from(new Set(names))
}

function extractActorsFromOg(desc) {
  if (!desc) return []
  const parts = desc.split('／')
  if (parts.length < 3) return []
  return parts[2].split(/[,、]/).map(s => s.trim()).filter(Boolean)
}

// Parse an Eventernote actor list page into multiple events.
// Returns { ok: true, events: [...] } or { ok: false, reason }.
export function parseEventernoteActorList(html) {
  let doc
  try {
    doc = new DOMParser().parseFromString(html, 'text/html')
  } catch (e) {
    return { ok: false, reason: `HTML 解析失敗: ${e.message}`, events: [] }
  }

  const items = doc.querySelectorAll('.gb_event_list li.clearfix')
  if (!items.length) return { ok: false, reason: '找不到活動列表（.gb_event_list li）', events: [] }

  const events = []
  for (const li of items) {
    const a = li.querySelector('.event h4 a, h4 a')
    const href = a?.getAttribute('href') ?? ''
    const idMatch = href.match(/^\/events\/(\d+)/)
    if (!idMatch) continue

    const sourceUrl = `https://www.eventernote.com${href}`
    const title = (a?.textContent ?? '').trim()

    const dateText = li.querySelector('.date p')?.textContent.trim() ?? ''
    const dateStr = (dateText.match(/(\d{4})-(\d{1,2})-(\d{1,2})/) ?? [])
      .slice(1).map(s => s ? pad(s) : s)
    const date = dateStr.length === 3 ? `${dateStr[0]}-${dateStr[1]}-${dateStr[2]}` : null

    const placeBlocks = li.querySelectorAll('.event .place')
    let venue = null
    let times = { start: null, end: null }
    for (const p of placeBlocks) {
      const text = p.textContent.replace(/\s+/g, ' ').trim()
      if (text.startsWith('会場:')) {
        venue = p.querySelector('a')?.textContent.trim()
          ?? text.replace(/^会場:\s*/, '').trim()
      } else if (/開[場演]/.test(text)) {
        times = extractTimesFromText(text)
      }
    }

    const actorLinks = li.querySelectorAll('.actor ul li a')
    const idolNames = Array.from(new Set(
      Array.from(actorLinks).map(el => el.textContent.trim()).filter(Boolean)
    ))

    if (!title || !date) continue

    const tz = detectTimezone(venue)
    events.push({
      title,
      startAt: combineWithTz(date, times.start, tz),
      endAt: combineWithTz(date, times.end, tz),
      venue: venue || null,
      sourceUrl,
      timezone: tz,
      timeUnknown: !times.start,
      idolNames,
    })
  }

  return events.length ? { ok: true, events } : { ok: false, reason: '解析後沒有有效活動', events: [] }
}

function extractTimesFromText(text) {
  const start = (text.match(/開演\s*(\d{1,2}:\d{2})/) ?? text.match(/開場\s*(\d{1,2}:\d{2})/))?.[1]
  const end = text.match(/終演\s*(\d{1,2}:\d{2})/)?.[1]
  return {
    start: start ? normalizeTime(start) : null,
    end: end ? normalizeTime(end) : null,
  }
}
