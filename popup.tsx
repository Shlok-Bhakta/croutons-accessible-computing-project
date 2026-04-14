import "./popup.css"

import { useCallback, useEffect, useId, useMemo, useState } from "react"

import type { PageStateResult } from "~lib/messages"
import {
  DEFAULT_SETTINGS,
  type SensorySettings,
  loadSettings,
  saveSettings
} from "~lib/settings"

function IndexPopup() {
  const [settings, setSettings] = useState<SensorySettings>(DEFAULT_SETTINGS)
  const [score, setScore] = useState<number | null>(null)
  const [pageUrl, setPageUrl] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const scorePercent = useMemo(() => {
    if (score == null) return "0%"
    return `${Math.min(100, Math.max(0, score))}%`
  }, [score])

  const refreshPageState = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      setError("No active tab.")
      setScore(null)
      setPageUrl("")
      return
    }
    setPageUrl(tab.url || "")
    if (
      !tab.url ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("edge://") ||
      tab.url.startsWith("about:") ||
      tab.url.startsWith("chrome-extension://")
    ) {
      setError("Open a regular website to filter and score sensory load.")
      setScore(null)
      return
    }
    try {
      const res = (await chrome.tabs.sendMessage(tab.id, {
        type: "GET_PAGE_STATE"
      })) as PageStateResult
      if (res?.ok) {
        setScore(res.payload.score)
        setError(null)
      } else {
        setError(res?.error || "Could not reach this page.")
        setScore(null)
      }
    } catch {
      setError("Reload the page after installing the extension, then try again.")
      setScore(null)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      const s = await loadSettings()
      setSettings(s)
      setReady(true)
      await refreshPageState()
    })()
  }, [refreshPageState])

  const pushToTab = async (next: SensorySettings) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return
    try {
      const res = (await chrome.tabs.sendMessage(tab.id, {
        type: "APPLY_SETTINGS",
        settings: next
      })) as PageStateResult
      if (res?.ok) setScore(res.payload.score)
    } catch {
      /* restricted pages */
    }
  }

  const update = async (partial: Partial<SensorySettings>) => {
    const next = { ...settings, ...partial }
    setSettings(next)
    await saveSettings(next)
    await pushToTab(next)
    await refreshPageState()
  }

  const toggle = (key: keyof SensorySettings) => async () => {
    const cur = settings[key]
    if (typeof cur !== "boolean") return
    await update({ [key]: !cur } as Partial<SensorySettings>)
  }

  const readingMode = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "READING_MODE" })
    } catch {
      setError("Reading mode needs a normal webpage tab.")
    }
  }

  const openOptions = () => {
    void chrome.runtime.openOptionsPage()
  }

  return (
    <main className="croutons-root">
      <header className="croutons-header">
        <p className="croutons-kicker">Croutons</p>
        <h1 className="croutons-title">Universal Sensory Filter</h1>
        <p className="croutons-tagline">
          Calmer contrast, quieter motion, and steadier media — on your terms.
        </p>
      </header>

      <section className="croutons-score-card" aria-live="polite">
        <div
          className="croutons-score-ring"
          style={{ ["--p" as string]: scorePercent }}>
          <div className="croutons-score-ring-inner">
            {score == null ? "—" : score}
          </div>
        </div>
        <div className="croutons-score-meta">
          <p className="croutons-score-label">Sensory load score</p>
          {error ? (
            <p className="croutons-score-error">{error}</p>
          ) : (
            <p className="croutons-score-url" title={pageUrl}>
              {pageUrl || "This page"}
            </p>
          )}
        </div>
      </section>

      <section className="croutons-stack" aria-label="Filters">
        <ToggleRow
          title="Reduce motion"
          hint="Short-circuit animations & transitions"
          checked={settings.reduceMotion}
          disabled={!ready}
          onChange={toggle("reduceMotion")}
        />
        <ToggleRow
          title="Soften contrast"
          hint="Gentler contrast across the page"
          checked={settings.softenContrast}
          disabled={!ready}
          onChange={toggle("softenContrast")}
        />
        <div className="croutons-row croutons-slider-row">
          <div className="croutons-slider-head">
            <span className="croutons-row-title">Softness</span>
            <span className="croutons-row-hint" style={{ maxWidth: "none" }}>
              {settings.contrastSoftness}
            </span>
          </div>
          <input
            className="croutons-slider"
            type="range"
            min={0}
            max={100}
            value={settings.contrastSoftness}
            disabled={!ready || !settings.softenContrast}
            onChange={(e) =>
              void update({ contrastSoftness: Number(e.target.value) })
            }
            aria-label="Contrast softness"
          />
        </div>
        <ToggleRow
          title="Block autoplay"
          hint="Pause auto-playing video & audio"
          checked={settings.blockAutoplay}
          disabled={!ready}
          onChange={toggle("blockAutoplay")}
        />
        <ToggleRow
          title="Hide big overlays"
          hint="Large fixed layers (modals, takeovers)"
          checked={settings.hideOverlays}
          disabled={!ready}
          onChange={toggle("hideOverlays")}
        />
      </section>

      <div className="croutons-actions">
        <button
          type="button"
          className="croutons-btn croutons-btn-primary"
          onClick={() => void readingMode()}
          disabled={!ready}>
          Reading mode
        </button>
        <button
          type="button"
          className="croutons-btn croutons-btn-ghost"
          onClick={openOptions}>
          Thresholds &amp; details
        </button>
      </div>

      <p className="croutons-foot">
        Prototype: heuristics only. Tune auto-behavior and defaults on the
        options page.
      </p>
    </main>
  )
}

function ToggleRow(props: {
  title: string
  hint: string
  checked: boolean
  disabled?: boolean
  onChange: () => void
}) {
  const id = useId()
  return (
    <div className="croutons-row">
      <span className="croutons-row-label">
        <span className="croutons-row-title" id={`${id}-label`}>
          {props.title}
        </span>
        <span className="croutons-row-hint">{props.hint}</span>
      </span>
      <span className="croutons-switch">
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-checked={props.checked}
          aria-labelledby={`${id}-label`}
          checked={props.checked}
          disabled={props.disabled}
          onChange={props.onChange}
        />
        <span className="croutons-switch-track" aria-hidden>
          <span className="croutons-switch-thumb" />
        </span>
      </span>
    </div>
  )
}

export default IndexPopup
