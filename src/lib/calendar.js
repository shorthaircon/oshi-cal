// Pure month-grid builder. Returns 42 cells (6 weeks × 7 days).
// year is 4-digit, month is 1-12. All dates treated as plain JST calendar dates.

function pad(n) { return String(n).padStart(2, '0') }

export function buildMonthGrid(year, month) {
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells = []

  // prev month padding
  for (let i = firstDow; i > 0; i--) {
    const d = new Date(Date.UTC(year, month - 1, 1 - i))
    cells.push(makeCell(d, false))
  }

  // current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(makeCell(new Date(Date.UTC(year, month - 1, d)), true))
  }

  // next month padding to 42 cells
  while (cells.length < 42) {
    const last = cells[cells.length - 1]
    const next = new Date(Date.UTC(last.year, last.month - 1, last.date + 1))
    cells.push(makeCell(next, false))
  }

  return cells
}

function makeCell(d, inMonth) {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + 1
  const da = d.getUTCDate()
  return {
    year: y,
    month: m,
    date: da,
    dow: d.getUTCDay(),
    inMonth,
    key: `${y}-${pad(m)}-${pad(da)}`,
  }
}

export function shiftMonth(year, month, delta) {
  const total = (year * 12 + (month - 1)) + delta
  return { year: Math.floor(total / 12), month: (total % 12) + 1 }
}

export const WEEK_LABELS_ZH = ['日', '一', '二', '三', '四', '五', '六']
