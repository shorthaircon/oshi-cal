// Detects time conflicts between events.
// Returns Map<eventId, eventId[]> — the set of OTHER events each event conflicts with.

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000

function rangeOf(ev) {
  if (!ev.startAt) return null
  const start = new Date(ev.startAt).getTime()
  if (isNaN(start)) return null
  const end = ev.endAt
    ? new Date(ev.endAt).getTime()
    : start + DEFAULT_DURATION_MS
  return [start, isNaN(end) ? start + DEFAULT_DURATION_MS : end]
}

export function findConflicts(events) {
  const ranges = events
    .map(ev => ({ ev, range: rangeOf(ev) }))
    .filter(x => x.range)
    .sort((a, b) => a.range[0] - b.range[0])

  const out = new Map()
  for (let i = 0; i < ranges.length; i++) {
    const a = ranges[i]
    for (let j = i + 1; j < ranges.length; j++) {
      const b = ranges[j]
      if (b.range[0] >= a.range[1]) break // sorted: no further overlap possible
      // overlap if [aStart, aEnd) ∩ [bStart, bEnd) non-empty
      if (b.range[0] < a.range[1] && a.range[0] < b.range[1]) {
        push(out, a.ev.id, b.ev.id)
        push(out, b.ev.id, a.ev.id)
      }
    }
  }
  return out
}

function push(map, key, val) {
  if (!map.has(key)) map.set(key, [])
  map.get(key).push(val)
}
