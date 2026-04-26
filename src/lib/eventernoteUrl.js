// Distinguish single-event page vs idol/actor list page on Eventernote.
// Single event: /events/12345
// Actor list: /actors/<encodedName>/<id> (events sub-path may exist)

export function classifyEventernoteUrl(rawUrl) {
  let u
  try { u = new URL(rawUrl) } catch { return { kind: 'invalid' } }
  if (!/(^|\.)eventernote\.com$/.test(u.hostname)) return { kind: 'invalid' }

  const m = u.pathname.match(/^\/events\/(\d+)\/?$/)
  if (m) return { kind: 'event', id: m[1] }

  if (/^\/actors\//.test(u.pathname)) return { kind: 'actor' }
  return { kind: 'unknown' }
}
