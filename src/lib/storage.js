const KEY = 'oshi-cal:data'
const CURRENT_VERSION = 3

const EMPTY = {
  version: CURRENT_VERSION,
  lastBackupAt: null,
  lastBackupCount: { idols: 0, events: 0 },
  idols: [],
  events: [],
}

export function loadAll() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw)
    return migrate(parsed)
  } catch (e) {
    console.warn('[storage] load failed, returning empty', e)
    return { ...EMPTY }
  }
}

export function saveAll(data) {
  const payload = { ...data, version: CURRENT_VERSION }
  try {
    localStorage.setItem(KEY, JSON.stringify(payload))
  } catch (e) {
    console.error('[storage] save failed (private mode? quota?)', e)
    throw e
  }
}

export function markBackup() {
  const data = loadAll()
  saveAll({
    ...data,
    lastBackupAt: new Date().toISOString(),
    lastBackupCount: { idols: data.idols.length, events: data.events.length },
  })
}

export function replaceAll(incoming) {
  saveAll(normalize(incoming))
}

export { CURRENT_VERSION }

function migrate(data) {
  if (!data || typeof data !== 'object') return { ...EMPTY }
  let v = data.version ?? 0
  if (v < 2) {
    data = migrateTo2(data)
    v = 2
  }
  if (v < 3) {
    data = migrateTo3(data)
    v = 3
  }
  return normalize({ ...data, version: CURRENT_VERSION })
}

// v1 → v2: every event gets timezone (default Asia/Tokyo).
function migrateTo2(data) {
  return {
    ...data,
    events: (data.events ?? []).map(ev => ({
      ...ev,
      timezone: ev.timezone ?? 'Asia/Tokyo',
    })),
  }
}

// v2 → v3: events with startAt at 00:00 local time AND endAt equal to startAt
// are flagged timeUnknown — these were Eventernote parse failures that fell back to 0:00.
function migrateTo3(data) {
  return {
    ...data,
    events: (data.events ?? []).map(ev => {
      if (ev.timeUnknown !== undefined) return ev
      const looksMidnight = typeof ev.startAt === 'string' && /T00:00:00/.test(ev.startAt)
      const sameStartEnd = ev.endAt === ev.startAt
      if (looksMidnight && sameStartEnd) {
        return { ...ev, timeUnknown: true }
      }
      return { ...ev, timeUnknown: false }
    }),
  }
}

function normalize(data) {
  return {
    version: CURRENT_VERSION,
    lastBackupAt: data.lastBackupAt ?? null,
    lastBackupCount: data.lastBackupCount ?? { idols: 0, events: 0 },
    idols: Array.isArray(data.idols) ? data.idols : [],
    events: Array.isArray(data.events) ? data.events : [],
  }
}
