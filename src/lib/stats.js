import { dateKeyInTz } from './time.js'
import { currencyOf } from './currency.js'

const isAttended = (e) => e.status === 'attended'

export function attendedCount(events) {
  return events.filter(isAttended).length
}

export function attendedThisYear(events, now = new Date()) {
  const year = now.getFullYear()
  return events.filter(e => {
    if (!isAttended(e)) return false
    const key = dateKeyInTz(e.startAt, e.timezone)
    return key && Number(key.slice(0, 4)) === year
  }).length
}

// Returns [{ idol, count }] sorted by count desc.
// Idols with 0 attended events are excluded.
export function attendedByIdol(events, idols) {
  const counts = new Map()
  for (const e of events) {
    if (!isAttended(e)) continue
    for (const id of (e.idolIds || [])) {
      counts.set(id, (counts.get(id) || 0) + 1)
    }
  }
  return idols
    .map(idol => ({ idol, count: counts.get(idol.id) || 0 }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
}

// Returns { JPY: 150000, TWD: 8800, ... } summing attended events with prices.
export function spendingByCurrency(events) {
  const totals = {}
  for (const e of events) {
    if (!isAttended(e)) continue
    if (e.ticketPrice == null) continue
    const { code } = currencyOf(e.timezone)
    totals[code] = (totals[code] || 0) + e.ticketPrice
  }
  return totals
}
