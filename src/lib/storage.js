const KEY = 'oshi-cal:data'
const CURRENT_VERSION = 1

const EMPTY = {
  version: CURRENT_VERSION,
  lastBackupAt: null,
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

function migrate(data) {
  if (!data || typeof data !== 'object') return { ...EMPTY }
  const v = data.version ?? 0
  if (v === CURRENT_VERSION) return normalize(data)
  // future migrations: if (v < 2) data = migrateTo2(data)
  return normalize({ ...data, version: CURRENT_VERSION })
}

function normalize(data) {
  return {
    version: CURRENT_VERSION,
    lastBackupAt: data.lastBackupAt ?? null,
    idols: Array.isArray(data.idols) ? data.idols : [],
    events: Array.isArray(data.events) ? data.events : [],
  }
}
