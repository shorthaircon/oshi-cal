export const PALETTE = [
  { hex: '#ec4899', name: '粉' },
  { hex: '#ef4444', name: '紅' },
  { hex: '#f97316', name: '橘' },
  { hex: '#f59e0b', name: '琥珀' },
  { hex: '#eab308', name: '黃' },
  { hex: '#84cc16', name: '黃綠' },
  { hex: '#22c55e', name: '綠' },
  { hex: '#14b8a6', name: '青綠' },
  { hex: '#06b6d4', name: '青' },
  { hex: '#3b82f6', name: '藍' },
  { hex: '#6366f1', name: '靛' },
  { hex: '#a855f7', name: '紫' },
]

export function isValidHex(s) {
  return typeof s === 'string' && /^#([0-9a-f]{6})$/i.test(s)
}

export function recommendNext(usedHexes) {
  const used = new Set((usedHexes ?? []).map(h => h.toLowerCase()))
  const available = PALETTE.filter(c => !used.has(c.hex.toLowerCase()))
  return (available[0] ?? PALETTE[0]).hex
}

// Pick black or white text for best contrast against given hex bg.
// Uses YIQ luminance — fast and good enough for UI.
export function readableTextOn(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex ?? '')
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 160 ? '#111' : '#fff'
}

export function isClash(hex, otherHexes) {
  const target = hex?.toLowerCase()
  return (otherHexes ?? []).some(h => h?.toLowerCase() === target)
}
