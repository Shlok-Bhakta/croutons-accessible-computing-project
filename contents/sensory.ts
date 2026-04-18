import { Readability } from "@mozilla/readability"
import type { PlasmoCSConfig } from "plasmo"

import atkinsonBold from "url:~/assets/AtkinsonHyperlegible-Bold.ttf"
import atkinsonBoldItalic from "url:~/assets/AtkinsonHyperlegible-BoldItalic.ttf"
import atkinsonItalic from "url:~/assets/AtkinsonHyperlegible-Italic.ttf"
import atkinsonRegular from "url:~/assets/AtkinsonHyperlegible-Regular.ttf"

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
const AUTO_GRAYSCALE_THRESHOLD = 60

const READING_FONT_FACE = `
  @font-face {
    font-family: "Atkinson Hyperlegible";
    font-style: normal;
    font-weight: 400;
    src: url("${atkinsonRegular}") format("truetype");
    font-display: swap;
  }
  @font-face {
    font-family: "Atkinson Hyperlegible";
    font-style: normal;
    font-weight: 700;
    src: url("${atkinsonBold}") format("truetype");
    font-display: swap;
  }
  @font-face {
    font-family: "Atkinson Hyperlegible";
    font-style: italic;
    font-weight: 400;
    src: url("${atkinsonItalic}") format("truetype");
    font-display: swap;
  }
  @font-face {
    font-family: "Atkinson Hyperlegible";
    font-style: italic;
    font-weight: 700;
    src: url("${atkinsonBoldItalic}") format("truetype");
    font-display: swap;
  }
`

function buildReadingModeCss(theme: ThemePreference): string {
  const dark = theme === "dark"
  const bg = dark ? "#13151c" : "#ebe6dc"
  const fg = dark ? "#f2efe8" : "#12100e"
  const borderSubtle = dark ? "rgba(235, 231, 223, 0.12)" : "rgba(26, 22, 20, 0.15)"
  const closeBorder = dark ? "rgba(235, 231, 223, 0.28)" : "rgba(26, 22, 20, 0.25)"
  const closeBg = dark ? "#1a1d26" : "#f4f0e8"
  const focusRing = dark ? "#9bdcff" : "#3d5a4a"
  const link = dark ? "#7fe8c8" : "#2d4a3c"
  const muted = dark ? "rgba(242, 239, 232, 0.72)" : "rgba(18, 16, 14, 0.68)"
  const scheme = dark ? "dark" : "light"

  return `
    ${READING_FONT_FACE}
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
      font-family: "Atkinson Hyperlegible", system-ui, sans-serif;
      font-size: 1rem;
      line-height: 1.65;
      -webkit-font-smoothing: antialiased;
    }
    #${READING_ROOT_ID} .croutons-reading-panel { max-width: 42rem; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
    #${READING_ROOT_ID} .croutons-reading-header {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid ${borderSubtle};
    }
    #${READING_ROOT_ID} .croutons-reading-brand { font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; margin: 0; color: ${muted} !important; }
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
    #${READING_ROOT_ID} .croutons-reading-title {
      font-family: "Atkinson Hyperlegible", system-ui, sans-serif;
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.25;
      margin: 0 0 1rem;
      color: ${fg} !important;
    }
    #${READING_ROOT_ID} .croutons-reading-content {
      font-size: 1rem !important;
      color: ${fg} !important;
    }
    #${READING_ROOT_ID} .croutons-reading-content * {
      font-family: "Atkinson Hyperlegible", system-ui, sans-serif !important;
    }
    #${READING_ROOT_ID} .croutons-reading-content *:not(a) {
      color: inherit !important;
    }
    #${READING_ROOT_ID} .croutons-reading-content a,
    #${READING_ROOT_ID} .croutons-reading-content a * {
      color: ${link} !important;
    }
    #${READING_ROOT_ID} .croutons-reading-content p,
    #${READING_ROOT_ID} .croutons-reading-content li,
    #${READING_ROOT_ID} .croutons-reading-content blockquote,
    #${READING_ROOT_ID} .croutons-reading-content td,
    #${READING_ROOT_ID} .croutons-reading-content th {
      font-size: 1rem !important;
      line-height: 1.65 !important;
    }
    #${READING_ROOT_ID} .croutons-reading-content h1 { font-size: 1.75rem !important; font-weight: 700 !important; }
    #${READING_ROOT_ID} .croutons-reading-content h2 { font-size: 1.375rem !important; font-weight: 700 !important; }
    #${READING_ROOT_ID} .croutons-reading-content h3 { font-size: 1.125rem !important; font-weight: 700 !important; }
    #${READING_ROOT_ID} .croutons-reading-content h4 { font-size: 1rem !important; font-weight: 700 !important; }
    #${READING_ROOT_ID} .croutons-reading-content pre,
    #${READING_ROOT_ID} .croutons-reading-content code {
      font-family: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace !important;
      font-size: 0.9375rem !important;
    }
    #${READING_ROOT_ID} .croutons-reading-content p {
      margin: 0 0 1.5em;
    }
    #${READING_ROOT_ID} .croutons-reading-content p:last-child {
      margin-bottom: 0;
    }
    #${READING_ROOT_ID} .croutons-reading-content img { max-width: 100%; height: auto; }
    #${READING_ROOT_ID} .croutons-reading-content a {
      color: ${link} !important;
      text-decoration: underline;
      text-underline-offset: 0.15em;
    }
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
let autoGrayscaleActive = false

type Rgba = { r: number; g: number; b: number; a: number }

function computeStructuralSignals(): {
  motionLoad: number
  autoplayLoad: number
  mediaDensityLoad: number
  overlayLoad: number
} {
  const videos = document.querySelectorAll("video")
  const iframes = document.querySelectorAll("iframe")
  const canvases = document.querySelectorAll("canvas")
  const autoplayEls = document.querySelectorAll("[autoplay], [data-autoplay]")
  const motionHints = document.querySelectorAll(
    '[class*="carousel"], [class*="slider"], [class*="marquee"], [class*="animation"]'
  )
  const overlayHints = document.querySelectorAll(
    '[role="dialog"], [aria-modal="true"], [class*="modal"], [class*="popup"], [class*="overlay"]'
  )

  const motionLoad = clamp100(Math.floor(motionHints.length / 2) * 7)
  const autoplayLoad = clamp100(autoplayEls.length * 20)
  const mediaDensityLoad = clamp100(
    videos.length * 12 + iframes.length * 6 + canvases.length * 4
  )
  const overlayLoad = clamp100(overlayHints.length * 8)

  return { motionLoad, autoplayLoad, mediaDensityLoad, overlayLoad }
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

function clamp100(v: number): number {
  return Math.min(100, Math.max(0, v))
}

function parseCssColor(input: string): Rgba | null {
  const s = input.trim().toLowerCase()
  if (!s || s === "transparent") return null

  if (s.startsWith("#")) {
    const h = s.slice(1)
    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16)
      const g = parseInt(h[1] + h[1], 16)
      const b = parseInt(h[2] + h[2], 16)
      return { r, g, b, a: 1 }
    }
    if (h.length === 6) {
      const r = parseInt(h.slice(0, 2), 16)
      const g = parseInt(h.slice(2, 4), 16)
      const b = parseInt(h.slice(4, 6), 16)
      return { r, g, b, a: 1 }
    }
    return null
  }

  const m = s.match(/^rgba?\(([^)]+)\)$/)
  if (!m) return null
  const parts = m[1].split(",").map((x) => x.trim())
  if (parts.length < 3) return null
  const r = Number(parts[0])
  const g = Number(parts[1])
  const b = Number(parts[2])
  const a = parts.length >= 4 ? Number(parts[3]) : 1
  if (![r, g, b, a].every(Number.isFinite)) return null
  return {
    r: Math.min(255, Math.max(0, r)),
    g: Math.min(255, Math.max(0, g)),
    b: Math.min(255, Math.max(0, b)),
    a: clamp01(a)
  }
}

function relativeLuminance({ r, g, b }: Rgba): number {
  const toLinear = (v: number) => {
    const x = v / 255
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function contrastRatio(a: Rgba, b: Rgba): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const hi = Math.max(l1, l2)
  const lo = Math.min(l1, l2)
  return (hi + 0.05) / (lo + 0.05)
}

function rgbToHsl({ r, g, b }: Rgba): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6
        break
      case gn:
        h = (bn - rn) / d + 2
        break
      default:
        h = (rn - gn) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s, l }
}

function computeColorLoadScore(): number {
  const root = document.body
  if (!root) return 0

  const all = root.getElementsByTagName("*")
  if (all.length === 0) return 0

  const maxSamples = 700
  const stride = Math.max(1, Math.floor(all.length / maxSamples))
  const viewportArea = Math.max(1, window.innerWidth * window.innerHeight)

  let samples = 0
  let contrastWeightedSum = 0
  let satWeightedSum = 0
  let weightSum = 0
  let previousHue: number | null = null
  let previousSat: number | null = null
  let transitions = 0
  let highJumps = 0
  const hueBins = new Array<number>(12).fill(0)

  for (let i = 0; i < all.length && samples < maxSamples; i += stride) {
    const el = all[i] as HTMLElement
    const rect = el.getBoundingClientRect()
    if (rect.width < 12 || rect.height < 12) continue
    if (rect.bottom < 0 || rect.top > window.innerHeight) continue

    const cs = window.getComputedStyle(el)
    if (cs.visibility === "hidden" || cs.display === "none") continue

    const fg = parseCssColor(cs.color)
    const bg = parseCssColor(cs.backgroundColor)
    if (!fg || !bg || bg.a < 0.08) continue

    const areaWeight = Math.min(3, Math.max(0.15, (rect.width * rect.height) / viewportArea))
    const contrast = contrastRatio(fg, bg)
    const contrastHarshness = clamp01((contrast - 3) / 6)
    const sat = rgbToHsl(bg).s
    const { h } = rgbToHsl(bg)

    const hueIdx = Math.floor((h / 360) * hueBins.length) % hueBins.length
    hueBins[hueIdx] += areaWeight
    contrastWeightedSum += contrastHarshness * areaWeight
    satWeightedSum += sat * areaWeight
    weightSum += areaWeight

    if (previousHue != null && previousSat != null) {
      transitions += 1
      const hueDelta = Math.abs(previousHue - h)
      const wrappedHueDelta = Math.min(hueDelta, 360 - hueDelta)
      const satDelta = Math.abs(previousSat - sat)
      if (wrappedHueDelta > 40 || satDelta > 0.25) {
        highJumps += 1
      }
    }
    previousHue = h
    previousSat = sat
    samples += 1
  }

  if (weightSum <= 0) return 0

  const avgContrastHarshness = contrastWeightedSum / weightSum
  const avgSaturation = satWeightedSum / weightSum
  const totalHueWeight = hueBins.reduce((a, b) => a + b, 0)
  let hueEntropy = 0
  if (totalHueWeight > 0) {
    for (const w of hueBins) {
      if (w <= 0) continue
      const p = w / totalHueWeight
      hueEntropy += -p * Math.log2(p)
    }
  }
  const maxEntropy = Math.log2(hueBins.length)
  const hueEntropyNorm = maxEntropy > 0 ? hueEntropy / maxEntropy : 0
  const fragmentation = transitions > 0 ? highJumps / transitions : 0

  const score =
    0.35 * clamp100(avgContrastHarshness * 100) +
    0.3 * clamp100(avgSaturation * 100) +
    0.2 * clamp100(hueEntropyNorm * 100) +
    0.15 * clamp100(fragmentation * 100)

  return Math.round(clamp100(score))
}

function computeOverallLoadScore(settings: SensorySettings): {
  score: number
  baseScore: number
  reducedBy: number
  structuralLoadScore: number
  colorLoadScore: number
} {
  const structuralSignals = computeStructuralSignals()
  const structuralLoadScore = Math.round(
    0.4 * structuralSignals.motionLoad +
      0.3 * structuralSignals.autoplayLoad +
      0.2 * structuralSignals.mediaDensityLoad +
      0.1 * structuralSignals.overlayLoad
  )
  const colorLoadScore = computeColorLoadScore()
  const baseScore = Math.round(
    clamp100(0.55 * structuralLoadScore + 0.45 * colorLoadScore)
  )

  // Show how much current filters likely reduce perceived load.
  let mitigation = 0
  if (settings.reduceMotion) mitigation += 8
  if (settings.blockAutoplay) mitigation += 7
  if (settings.hideOverlays) mitigation += 6
  mitigation += Math.round((settings.contrastSoftness / 100) * 10)
  if (settings.grayscale || autoGrayscaleActive) mitigation += 10
  if (isReadingModeActive()) mitigation += 9

  const score = Math.round(clamp100(baseScore - mitigation))
  const reducedBy = Math.round(clamp100(baseScore - score))
  return { score, baseScore, reducedBy, structuralLoadScore, colorLoadScore }
}

function recommendationFromLoad(
  overallScore: number,
  colorLoadScore: number,
  settings: SensorySettings
): {
  recommendation: string
  recommendedFilters: string[]
} {
  const suggest = (id: string, enabled: boolean) => (enabled ? null : id)
  const suggested = [
    suggest("reduce-motion", settings.reduceMotion),
    suggest("block-autoplay", settings.blockAutoplay),
    suggest("hide-overlays", settings.hideOverlays)
  ].filter((x): x is string => !!x)

  if (overallScore >= 80) {
    if (colorLoadScore >= 70 && !settings.grayscale) {
      suggested.unshift("grayscale")
    }
    if (settings.contrastSoftness < 60) {
      suggested.unshift("contrast-softening-strong")
    }
    return {
      recommendation:
        "High cognitive load. Enable stronger calming filters for motion, media, and color.",
      recommendedFilters: suggested
    }
  }
  if (overallScore >= 60) {
    if (settings.contrastSoftness < 35) {
      suggested.unshift("contrast-softening-moderate")
    }
    if (colorLoadScore >= 65 && !settings.grayscale) {
      suggested.unshift("grayscale")
    }
    return {
      recommendation:
        "Elevated cognitive load. Consider increasing contrast softening and reducing distractions.",
      recommendedFilters: suggested
    }
  }
  if (overallScore >= 40) {
    if (settings.contrastSoftness < 20) {
      suggested.unshift("contrast-softening-mild")
    }
    return {
      recommendation:
        "Moderate load. Small adjustments may improve comfort.",
      recommendedFilters: suggested.slice(0, 2)
    }
  }
  return {
    recommendation: "Load looks manageable with current settings.",
    recommendedFilters: []
  }
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

  const filterParts: string[] = []
  if (settings.contrastSoftness > 0) {
    filterParts.push(`contrast(${contrast}) saturate(0.92)`)
  }
  if (settings.grayscale || autoGrayscaleActive) {
    filterParts.push("grayscale(1)")
  }
  const contrastBlock =
    filterParts.length > 0
      ? `
    html {
      filter: ${filterParts.join(" ")};
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
        const medias: HTMLMediaElement[] = Array.from(
          el.querySelectorAll<HTMLMediaElement>("video, audio")
        )
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
  const loadBeforeAuto = computeOverallLoadScore(settings)
  autoGrayscaleActive = loadBeforeAuto.colorLoadScore > AUTO_GRAYSCALE_THRESHOLD
  const load = computeOverallLoadScore(settings)
  clearOverlayMarks()
  injectStyle(buildCss(settings))
  blockAutoplayOn()
  attachMediaObserver()
  startOverlayLoop()
  if (settings.hideOverlays) markOverlays()

  const score = load.score
  const autoBoost =
    score >= settings.sensoryThreshold &&
    (settings.reduceMotion ||
      settings.contrastSoftness > 0 ||
      settings.grayscale)
  document.documentElement.toggleAttribute("data-croutons-high-load", autoBoost)

  if (isReadingModeActive()) {
    refreshReadingModeTheme(settings)
  }
}

function enterReadingMode() {
  if (document.getElementById(READING_ROOT_ID)) return

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
  const load = computeOverallLoadScore(currentSettings)
  const recommendation = recommendationFromLoad(
    load.score,
    load.colorLoadScore,
    currentSettings
  )
  return {
    score: load.score,
    baseScore: load.baseScore,
    reducedBy: load.reducedBy,
    colorLoadScore: load.colorLoadScore,
    recommendation: recommendation.recommendation,
    recommendedFilters: recommendation.recommendedFilters,
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
