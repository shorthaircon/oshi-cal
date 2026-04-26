const ALLOWED_HOSTS = new Set([
  'www.eventernote.com',
  'eventernote.com',
])

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }
    if (request.method !== 'GET') {
      return json({ error: 'method not allowed' }, 405)
    }

    const target = new URL(request.url).searchParams.get('url')
    if (!target) return json({ error: 'missing url param' }, 400)

    let parsed
    try {
      parsed = new URL(target)
    } catch {
      return json({ error: 'invalid url' }, 400)
    }
    if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
      return json({ error: 'host not allowed' }, 403)
    }

    const upstream = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'oshi-cal-proxy/1.0 (+https://github.com/shorthaircon/oshi-cal)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.7',
      },
      cf: { cacheTtl: 300, cacheEverything: true },
    })

    const body = await upstream.text()
    return new Response(body, {
      status: upstream.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': upstream.headers.get('Content-Type') ?? 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    })
  },
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
