import { ref } from 'vue'

// Matches eventernote event/actor URLs.
const EVENTERNOTE_RE = /^https?:\/\/(?:www\.)?eventernote\.com\/(events|actors)\/\d+/

export const detectedUrl = ref(null)

// Per-session memory of the URL we've already alerted on.
// (Avoid re-banner if user dismisses then taps again with same clipboard.)
let lastSeen = null
let listenerInstalled = false

async function tryDetect() {
  if (!navigator.clipboard?.readText) return
  try {
    const text = (await navigator.clipboard.readText()).trim()
    if (!EVENTERNOTE_RE.test(text)) return
    if (text === lastSeen) return
    lastSeen = text
    detectedUrl.value = text
  } catch {
    // permission denied / not in secure context — fail silent
  }
}

export function installClipboardWatcher() {
  if (listenerInstalled) return
  listenerInstalled = true
  // First user interaction → check clipboard once.
  // Repeat on tab visibility change so re-focusing also triggers a check.
  const onInteract = () => tryDetect()
  document.addEventListener('pointerdown', onInteract, { capture: true, passive: true })
  document.addEventListener('keydown', onInteract, { capture: true, passive: true })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tryDetect()
  })
}

export function dismissBanner() {
  detectedUrl.value = null
}
