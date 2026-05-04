// Days until event (in device-local calendar terms).
// Returns null for past or invalid events.
// Otherwise: { label: '今天'|'明天'|'N 天後', urgent: boolean (true for today/tomorrow), days: N }
export function countdownInfo(event, now = new Date()) {
  if (!event?.startAt) return null
  const start = new Date(event.startAt)
  if (isNaN(start) || start.getTime() < now.getTime()) return null

  // Device-local calendar day comparison (ignore hours so "today" means same date)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const diffDays = Math.round((startDay - todayDay) / 86400000)

  if (diffDays < 0) return null
  if (diffDays === 0) return { label: '今天', urgent: true, days: 0 }
  if (diffDays === 1) return { label: '明天', urgent: true, days: 1 }
  return { label: `${diffDays} 天後`, urgent: false, days: diffDays }
}
