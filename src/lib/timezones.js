// Static timezone table — chosen to cover idol overseas tour venues.
// offsetMin is the constant offset; all listed zones have no DST.

export const TZ_OPTIONS = [
  { id: 'Asia/Tokyo',         label: '日本 Tokyo',       offsetMin: 540, code: 'JST' },
  { id: 'Asia/Taipei',        label: '台灣 Taipei',      offsetMin: 480, code: 'TPE' },
  { id: 'Asia/Seoul',         label: '韓國 Seoul',       offsetMin: 540, code: 'KST' },
  { id: 'Asia/Hong_Kong',     label: '香港 Hong Kong',   offsetMin: 480, code: 'HKT' },
  { id: 'Asia/Singapore',     label: '新加坡 Singapore', offsetMin: 480, code: 'SGT' },
  { id: 'Asia/Bangkok',       label: '泰國 Bangkok',     offsetMin: 420, code: 'ICT' },
  { id: 'Asia/Kuala_Lumpur',  label: '吉隆坡',           offsetMin: 480, code: 'MYT' },
  { id: 'Asia/Shanghai',      label: '中國 Shanghai',    offsetMin: 480, code: 'CST' },
]

export const DEFAULT_TZ = 'Asia/Tokyo'

const VENUE_KEYWORDS = [
  { tz: 'Asia/Taipei',       kw: ['台北', 'taipei', '小巨蛋', '高雄', 'kaohsiung', '台中', 'taichung'] },
  { tz: 'Asia/Seoul',        kw: ['seoul', '首爾', 'korea'] },
  { tz: 'Asia/Hong_Kong',    kw: ['hong kong', '香港', 'asiaworld'] },
  { tz: 'Asia/Singapore',    kw: ['singapore', '新加坡'] },
  { tz: 'Asia/Bangkok',      kw: ['bangkok', '曼谷', 'thailand', '泰國'] },
  { tz: 'Asia/Kuala_Lumpur', kw: ['kuala lumpur', 'kl arena', 'malaysia', '馬來西亞'] },
  { tz: 'Asia/Shanghai',     kw: ['上海', 'shanghai', '北京', 'beijing', '广州', '廣州', 'guangzhou'] },
]

export function detectTimezone(venue) {
  if (!venue) return DEFAULT_TZ
  const v = venue.toLowerCase()
  for (const { tz, kw } of VENUE_KEYWORDS) {
    if (kw.some(k => v.includes(k.toLowerCase()))) return tz
  }
  return DEFAULT_TZ
}

export function offsetMinOf(tz) {
  return TZ_OPTIONS.find(t => t.id === tz)?.offsetMin ?? 540
}

export function tzCodeOf(tz) {
  return TZ_OPTIONS.find(t => t.id === tz)?.code ?? 'JST'
}

export function offsetString(tz) {
  const m = offsetMinOf(tz)
  const sign = m >= 0 ? '+' : '-'
  const a = Math.abs(m)
  return `${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`
}
