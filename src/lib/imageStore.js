// IndexedDB store for event cover images.
// Each entry: { key: string (uuid), blob: Blob }

const DB_NAME = 'oshi-cal-images'
const STORE = 'covers'
const VERSION = 1

let dbPromise = null
const urlCache = new Map() // key → object URL (lives until explicitly revoked)

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx(mode = 'readonly') {
  return openDB().then(db => db.transaction(STORE, mode).objectStore(STORE))
}

export async function putImage(key, blob) {
  const store = await tx('readwrite')
  return new Promise((resolve, reject) => {
    const r = store.put(blob, key)
    r.onsuccess = () => resolve(key)
    r.onerror = () => reject(r.error)
  })
}

export async function getImage(key) {
  if (!key) return null
  const store = await tx('readonly')
  return new Promise((resolve) => {
    const r = store.get(key)
    r.onsuccess = () => resolve(r.result || null)
    r.onerror = () => resolve(null)
  })
}

export async function getObjectUrl(key) {
  if (!key) return null
  if (urlCache.has(key)) return urlCache.get(key)
  const blob = await getImage(key)
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  urlCache.set(key, url)
  return url
}

export async function deleteImage(key) {
  if (!key) return
  if (urlCache.has(key)) {
    URL.revokeObjectURL(urlCache.get(key))
    urlCache.delete(key)
  }
  const store = await tx('readwrite')
  return new Promise((resolve) => {
    const r = store.delete(key)
    r.onsuccess = () => resolve()
    r.onerror = () => resolve()
  })
}

export function invalidateUrl(key) {
  if (urlCache.has(key)) {
    URL.revokeObjectURL(urlCache.get(key))
    urlCache.delete(key)
  }
}
