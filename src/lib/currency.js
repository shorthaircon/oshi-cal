// Maps event timezone → currency for ticket prices.
// Assumes prices are already entered in the venue's local currency.

const TZ_TO_CURRENCY = {
  'Asia/Tokyo':        { code: 'JPY', symbol: '¥' },
  'Asia/Taipei':       { code: 'TWD', symbol: 'NT$' },
  'Asia/Seoul':        { code: 'KRW', symbol: '₩' },
  'Asia/Hong_Kong':    { code: 'HKD', symbol: 'HK$' },
  'Asia/Singapore':    { code: 'SGD', symbol: 'S$' },
  'Asia/Bangkok':      { code: 'THB', symbol: '฿' },
  'Asia/Kuala_Lumpur': { code: 'MYR', symbol: 'RM' },
  'Asia/Shanghai':     { code: 'CNY', symbol: 'CN¥' },
}

const FALLBACK = { code: 'JPY', symbol: '¥' }

export function currencyOf(tz) {
  return TZ_TO_CURRENCY[tz] || FALLBACK
}

export function formatPrice(amount, tz) {
  if (amount == null) return ''
  const { symbol } = currencyOf(tz)
  return `${symbol}${amount.toLocaleString()}`
}

// byCurrency: { JPY: 150000, TWD: 8800, ... } → "¥150,000 / NT$8,800"
const ORDER = ['JPY', 'TWD', 'KRW', 'HKD', 'SGD', 'THB', 'MYR', 'CNY']
const SYMBOL_BY_CODE = Object.values(TZ_TO_CURRENCY)
  .reduce((m, { code, symbol }) => (m[code] = symbol, m), {})

export function formatSpending(byCurrency) {
  const parts = ORDER
    .filter(code => byCurrency[code] > 0)
    .map(code => `${SYMBOL_BY_CODE[code]}${byCurrency[code].toLocaleString()}`)
  return parts.join(' / ')
}
