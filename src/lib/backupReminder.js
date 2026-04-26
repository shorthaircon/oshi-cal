const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

export function needsBackup(data, now = Date.now()) {
  if (!data) return false
  const totalCount = (data.idols?.length ?? 0) + (data.events?.length ?? 0)
  if (totalCount === 0) return false

  const last = data.lastBackupCount ?? { idols: 0, events: 0 }
  const lastTotal = (last.idols ?? 0) + (last.events ?? 0)
  if (totalCount <= lastTotal) return false

  if (!data.lastBackupAt) return true
  const lastTime = new Date(data.lastBackupAt).getTime()
  if (isNaN(lastTime)) return true
  return now - lastTime >= FOURTEEN_DAYS_MS
}
