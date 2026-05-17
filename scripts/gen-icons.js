// One-off script: render PWA icons from public/logo.svg
// Run: node scripts/gen-icons.js

import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SRC = resolve(ROOT, 'public/logo.svg')
const OUT_DIR = resolve(ROOT, 'public/icons')

mkdirSync(OUT_DIR, { recursive: true })

const svg = readFileSync(SRC)

async function plain(size, name) {
  await sharp(svg).resize(size, size).png().toFile(resolve(OUT_DIR, name))
  console.log('✓', name)
}

async function maskable(size, name) {
  // Maskable icons: content must sit inside 80% safe zone with opaque background.
  const inner = Math.round(size * 0.78)
  const bg = { r: 245, g: 239, b: 230, alpha: 1 } // paper color
  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: await sharp(svg).resize(inner, inner).png().toBuffer() }])
    .png()
    .toFile(resolve(OUT_DIR, name))
  console.log('✓', name)
}

async function appleTouch(size, name) {
  // Apple touch icon: opaque background (iOS doesn't mask but doesn't like transparency)
  const bg = { r: 245, g: 239, b: 230, alpha: 1 }
  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: await sharp(svg).resize(size, size).png().toBuffer() }])
    .png()
    .toFile(resolve(ROOT, 'public', name))
  console.log('✓', name)
}

await plain(192, 'icon-192.png')
await plain(512, 'icon-512.png')
await maskable(512, 'icon-maskable-512.png')
await appleTouch(180, 'apple-touch-icon.png')

console.log('done')
