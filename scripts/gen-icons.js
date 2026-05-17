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

const PAPER = { r: 245, g: 239, b: 230, alpha: 1 }

async function renderTicket(targetWidth) {
  // ticket viewBox is 192×104 (aspect 1.846); fit-inside resize keeps it sharp
  return sharp(svg).resize({ width: targetWidth, fit: 'inside' }).png().toBuffer()
}

async function composeIcon(size, innerRatio, outPath) {
  const innerWidth = Math.round(size * innerRatio)
  const ticket = await renderTicket(innerWidth)
  await sharp({
    create: { width: size, height: size, channels: 4, background: PAPER },
  })
    .composite([{ input: ticket, gravity: 'center' }])
    .png()
    .toFile(outPath)
}

async function plain(size, name) {
  await composeIcon(size, 0.86, resolve(OUT_DIR, name))
  console.log('✓', name)
}

async function maskable(size, name) {
  await composeIcon(size, 0.66, resolve(OUT_DIR, name))
  console.log('✓', name)
}

async function appleTouch(size, name) {
  await composeIcon(size, 0.82, resolve(ROOT, 'public', name))
  console.log('✓', name)
}

await plain(192, 'icon-192.png')
await plain(512, 'icon-512.png')
await maskable(512, 'icon-maskable-512.png')
await appleTouch(180, 'apple-touch-icon.png')

console.log('done')
