import { Readability } from "@mozilla/readability"
import type { PlasmoCSConfig } from "plasmo"

import type {
  PageStatePayload,
  PageStateResult,
  ToContentMessage
} from "~lib/messages"
import {
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  normalizeSensorySettings,
  type SensorySettings,
  type ThemePreference,
  loadSettings
} from "~lib/settings"

export const config: PlasmoCSConfig = {
  matches: ["http://*/*", "https://*/*"],
  run_at: "document_idle",
  all_frames: false
}

const STYLE_ID = "croutons-sensory-style"
const READING_ROOT_ID = "croutons-reading-root"
const READING_STYLE_ID = "croutons-reading-style"

function buildReadingModeCss(theme: ThemePreference): string {
  const dark = theme === "dark"
  const bg = dark ? "#13151c" : "#ebe6dc"
  const fg = dark ? "#ebe7df" : "#1a1614"
  const borderSubtle = dark ? "rgba(235, 231, 223, 0.12)" : "rgba(26, 22, 20, 0.15)"
  const closeBorder = dark ? "rgba(235, 231, 223, 0.28)" : "rgba(26, 22, 20, 0.25)"
  const closeBg = dark ? "#1a1d26" : "#f4f0e8"
  const focusRing = dark ? "#9bdcff" : "#3d5a4a"
  const link = dark ? "#6ecfae" : "#3d5a4a"
  const scheme = dark ? "dark" : "light"

  return `
    html:has(#${READING_ROOT_ID}) {
      overflow: hidden !important;
      scrollbar-gutter: stable;
    }
    html:has(#${READING_ROOT_ID}) body {
      overflow: hidden !important;
    }
    #${READING_ROOT_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      color-scheme: ${scheme};
      background: ${bg};
      color: ${fg};
      overflow: auto;
      overscroll-behavior: contain;
      font-family: "Atkinson Hyperlegible", Georgia, serif;
      line-height: 1.65;
    }
    #${READING_ROOT_ID} .croutons-reading-panel { max-width: 42rem; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
    #${READING_ROOT_ID} .croutons-reading-header {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid ${borderSubtle};
    }
    #${READING_ROOT_ID} .croutons-reading-brand { font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; margin: 0; opacity: 0.7; }
    #${READING_ROOT_ID} .croutons-reading-close {
      font: inherit;
      cursor: pointer;
      border: 1px solid ${closeBorder};
      background: ${closeBg};
      color: inherit;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
    }
    #${READING_ROOT_ID} .croutons-reading-close:focus-visible {
      outline: 2px solid ${focusRing}; outline-offset: 2px;
    }
    #${READING_ROOT_ID} .croutons-reading-title { font-family: "Fraunces", Georgia, serif; font-size: 1.75rem; font-weight: 600; margin: 0 0 1rem; }
    #${READING_ROOT_ID} .croutons-reading-content p {
      margin: 0 0 1.5em;
    }
    #${READING_ROOT_ID} .croutons-reading-content p:last-child {
      margin-bottom: 0;
    }
    #${READING_ROOT_ID} .croutons-reading-content img { max-width: 100%; height: auto; }
    #${READING_ROOT_ID} .croutons-reading-content a { color: ${link}; }
  `
}

function refreshReadingModeTheme(settings: SensorySettings) {
  const root = document.getElementById(READING_ROOT_ID)
  if (!root) return
  root.setAttribute("data-croutons-theme", settings.themePreference)
  const styleEl = document.getElementById(READING_STYLE_ID) as HTMLStyleElement | null
  if (styleEl) {
    styleEl.textContent = buildReadingModeCss(settings.themePreference)
  }
}

function isReadingModeActive(): boolean {
  return !!document.getElementById(READING_ROOT_ID)
}

function exitReadingMode() {
  document.getElementById(READING_ROOT_ID)?.remove()
}

let currentSettings: SensorySettings = { ...DEFAULT_SETTINGS }
let mediaObserver: MutationObserver | null = null
let overlayTimer: ReturnType<typeof setInterval> | null = null

function computeSensoryScore(): number {
  let s = 0
  const videos = document.querySelectorAll("video")
  const iframes = document.querySelectorAll("iframe")
  const canvases = document.querySelectorAll("canvas")
  const autoplayEls = document.querySelectorAll("[autoplay], [data-autoplay]")
  const motionHints = document.querySelectorAll(
    '[class*="carousel"], [class*="slider"], [class*="marquee"], [class*="animation"]'
  )

  s += Math.min(42, videos.length * 10)
  s += Math.min(28, iframes.length * 4)
  s += Math.min(15, canvases.length * 3)
  s += Math.min(25, autoplayEls.length * 8)
  s += Math.min(20, Math.floor(motionHints.length / 3))

  return Math.min(100, Math.round(s))
}

/** Maps 0–100 softness to CSS contrast(): higher softness = lower contrast. */
function contrastFromSoftness(softness: number): number {
  const t = Math.max(0, Math.min(100, softness)) / 100
  // Cap how far we pull contrast down so pages stay readable (was 0.58 at max).
  const minContrast = 0.76
  return minContrast + (1 - t) * (1 - minContrast)
}

function buildCss(settings: SensorySettings): string {
  const contrast = contrastFromSoftness(settings.contrastSoftness)
  const motionBlock = settings.reduceMotion
    ? `
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  `
    : ""

  const contrastBlock = settings.contrastSoftness > 0
    ? `
    html {
      filter: contrast(${contrast}) saturate(0.92);
    }
  `
    : ""

  const overlayBlock = settings.hideOverlays
    ? `
    [data-croutons-overlay-hidden="1"] {
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `
    : ""

  return `${motionBlock}\n${contrastBlock}\n${overlayBlock}`
}

function injectStyle(css: string) {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement("style")
    el.id = STYLE_ID
    ;(document.head || document.documentElement).appendChild(el)
  }
  el.textContent = css
}

function clearOverlayMarks() {
  document.querySelectorAll("[data-croutons-overlay-hidden]").forEach((n) => {
    n.removeAttribute("data-croutons-overlay-hidden")
  })
}

function markOverlays() {
  if (!currentSettings.hideOverlays) return
  const root = document.body
  if (!root) return

  const nodes = root.getElementsByTagName("*")
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i] as HTMLElement
    if (el.id === READING_ROOT_ID || el.closest?.(`#${READING_ROOT_ID}`)) continue
    const cs = window.getComputedStyle(el)
    if (cs.position !== "fixed" && cs.position !== "sticky") continue
    const z = parseInt(cs.zIndex, 10)
    if (Number.isNaN(z) || z < 50) continue
    const r = el.getBoundingClientRect()
    if (r.width >= window.innerWidth * 0.35 && r.height >= window.innerHeight * 0.18) {
      el.setAttribute("data-croutons-overlay-hidden", "1")
    }
  }
}

function blockAutoplayOn(scope: Document | Element = document) {
  if (!currentSettings.blockAutoplay) return
  scope.querySelectorAll("video, audio").forEach((node) => {
    const m = node as HTMLMediaElement
    m.removeAttribute("autoplay")
    m.muted = true
    void m.pause()
  })
}

function attachMediaObserver() {
  if (!currentSettings.blockAutoplay) {
    mediaObserver?.disconnect()
    mediaObserver = null
    return
  }
  if (mediaObserver) return
  mediaObserver = new MutationObserver((records) => {
    for (const rec of records) {
      rec.addedNodes.forEach((n) => {
        if (n.nodeType !== Node.ELEMENT_NODE) return
        const el = n as Element
        const medias: HTMLMediaElement[] = [
          ...Array.from(el.querySelectorAll("video, audio"))
        ]
        if (el.matches("video, audio")) {
          medias.unshift(el as HTMLMediaElement)
        }
        medias.forEach((mm) => {
          mm.removeAttribute("autoplay")
          mm.muted = true
          void mm.pause()
        })
      })
    }
  })
  mediaObserver.observe(document.documentElement, { childList: true, subtree: true })
}

function stopOverlayLoop() {
  if (overlayTimer) {
    clearInterval(overlayTimer)
    overlayTimer = null
  }
}

function startOverlayLoop() {
  stopOverlayLoop()
  if (!currentSettings.hideOverlays) return
  markOverlays()
  overlayTimer = setInterval(markOverlays, 2500)
}

function applySettings(settings: SensorySettings) {
  currentSettings = settings
  clearOverlayMarks()
  injectStyle(buildCss(settings))
  blockAutoplayOn()
  attachMediaObserver()
  startOverlayLoop()
  if (settings.hideOverlays) markOverlays()

  const score = computeSensoryScore()
  const autoBoost =
    score >= settings.sensoryThreshold &&
    (settings.reduceMotion || settings.contrastSoftness > 0)
  document.documentElement.toggleAttribute("data-croutons-high-load", autoBoost)

  if (isReadingModeActive()) {
    refreshReadingModeTheme(settings)
  }
}

function enterReadingMode() {
  if (document.getElementById(READING_ROOT_ID)) return

  const fontId = "croutons-reading-fonts"
  if (!document.getElementById(fontId)) {
    const link = document.createElement("link")
    link.id = fontId
    link.rel = "stylesheet"
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Atkinson+Hyperlegible:wght@400;700&display=swap"
    document.head.appendChild(link)
  }

  const clone = document.cloneNode(true) as Document
  const article = new Readability(clone).parse()

  if (!article?.content) {
    window.alert(
      "Croutons couldn’t extract a main article on this page. Try a news or blog article."
    )
    return
  }

  const root = document.createElement("div")
  root.id = READING_ROOT_ID
  root.setAttribute("data-croutons-theme", currentSettings.themePreference)
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-modal", "true")
  root.setAttribute("aria-label", "Reading mode")

  root.innerHTML = `
    <div class="croutons-reading-panel">
      <header class="croutons-reading-header">
        <p class="croutons-reading-brand">Croutons · reading mode</p>
        <button type="button" class="croutons-reading-close" id="croutons-reading-close">Close</button>
      </header>
      <article class="croutons-reading-article">
        <h1 class="croutons-reading-title"></h1>
        <div class="croutons-reading-content"></div>
      </article>
    </div>
  `

  const titleEl = root.querySelector(".croutons-reading-title")!
  const contentEl = root.querySelector(".croutons-reading-content")!
  titleEl.textContent = article.title || document.title
  contentEl.innerHTML = article.content

  const style = document.createElement("style")
  style.id = READING_STYLE_ID
  style.textContent = buildReadingModeCss(currentSettings.themePreference)
  root.appendChild(style)

  document.documentElement.appendChild(root)

  root.querySelector("#croutons-reading-close")?.addEventListener("click", () => {
    exitReadingMode()
  })

  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") exitReadingMode()
  })
}

void loadSettings().then((s) => applySettings(s))

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return
  if (!changes[STORAGE_KEY]) return
  const next = changes[STORAGE_KEY].newValue as
    | (Partial<SensorySettings> & { softenContrast?: boolean })
    | undefined
  if (next) applySettings(normalizeSensorySettings(next))
})

function pageStatePayload(): PageStatePayload {
  return {
    score: computeSensoryScore(),
    url: location.href,
    applied: true,
    readingMode: isReadingModeActive()
  }
}

chrome.runtime.onMessage.addListener(
  (msg: ToContentMessage, _sender, sendResponse: (r: PageStateResult) => void) => {
    if (msg?.type === "GET_PAGE_STATE") {
      sendResponse({ ok: true, payload: pageStatePayload() })
      return true
    }
    if (msg?.type === "APPLY_SETTINGS") {
      applySettings(normalizeSensorySettings(msg.settings))
      sendResponse({
        ok: true,
        payload: pageStatePayload()
      })
      return true
    }
    if (msg?.type === "SET_READING_MODE") {
      if (msg.enabled) {
        enterReadingMode()
      } else {
        exitReadingMode()
      }
      sendResponse({
        ok: true,
        payload: pageStatePayload()
      })
      return true
    }
    return false
  }
)
