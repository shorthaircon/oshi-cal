// Image compression + blob conversion helpers.

const PROXY = import.meta.env.VITE_PROXY_URL || ''

// Resize blob to fit within maxDim and re-encode as JPEG.
export async function compressImage(blob, opts = {}) {
  const { maxDim = 1200, quality = 0.85, mime = 'image/jpeg' } = opts
  const bitmap = await createImageBitmap(blob)
  const { width, height } = bitmap
  const scale = Math.min(1, maxDim / Math.max(width, height))
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (out) => out ? resolve(out) : reject(new Error('canvas.toBlob 失敗')),
      mime,
      quality,
    )
  })
}

// Fetch a remote image URL → Blob. Tries direct → weserv (image proxy) → app proxy.
export async function blobFromUrl(url) {
  if (!url) throw new Error('URL 是空的')
  const errors = []

  // 1) Direct fetch (works for CORS-friendly hosts)
  try {
    const r = await fetch(url, { mode: 'cors' })
    if (r.ok) {
      const b = await r.blob()
      if (b.type.startsWith('image/')) return b
    } else {
      errors.push(`直連 ${r.status}`)
    }
  } catch (e) {
    errors.push(`直連 ${e.message || 'CORS'}`)
  }

  // 2) images.weserv.nl — free open image proxy designed for hotlinking
  try {
    const noProto = url.replace(/^https?:\/\//, '')
    const r = await fetch(`https://images.weserv.nl/?url=${encodeURIComponent(noProto)}`)
    if (r.ok) {
      const b = await r.blob()
      if (b.type.startsWith('image/')) return b
      errors.push(`weserv 回應非圖片`)
    } else {
      errors.push(`weserv ${r.status}`)
    }
  } catch (e) {
    errors.push(`weserv ${e.message}`)
  }

  // 3) App proxy (last resort, designed for HTML so may 403 images)
  if (PROXY) {
    try {
      const r = await fetch(`${PROXY}/?url=${encodeURIComponent(url)}`)
      if (r.ok) {
        const b = await r.blob()
        return b
      } else {
        errors.push(`Proxy ${r.status}`)
      }
    } catch (e) {
      errors.push(`Proxy ${e.message}`)
    }
  }

  throw new Error(errors.join(' / ') || '所有抓圖方式都失敗')
}

// Read clipboard for an image. Modern browsers only.
export async function blobFromClipboard() {
  if (!navigator.clipboard?.read) {
    throw new Error('此瀏覽器不支援讀取剪貼簿圖片')
  }
  const items = await navigator.clipboard.read()
  for (const item of items) {
    const imgType = item.types.find(t => t.startsWith('image/'))
    if (imgType) return await item.getType(imgType)
  }
  throw new Error('剪貼簿沒有圖片')
}
