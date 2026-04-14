import "./popup.css"

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from "react"

import type { PageStateResult } from "~lib/messages"
import {
  DEFAULT_SETTINGS,
  contrastSoftnessTier,
  type SensorySettings,
  loadSettingsResilient,
  saveSettings
} from "~lib/settings"

function IndexPopup() {
  const [settings, setSettings] = useState<SensorySettings>(DEFAULT_SETTINGS)
  const settingsRef = useRef<SensorySettings>(DEFAULT_SETTINGS)
  const persistTailRef = useRef(Promise.resolve())
  const [score, setScore] = useState<number | null>(null)
  const [pageUrl, setPageUrl] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [readingModeActive, setReadingModeActive] = useState(false)

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
      setReadingModeActive(false)
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
      setReadingModeActive(false)
      return
    }
    try {
      const res = (await chrome.tabs.sendMessage(tab.id, {
        type: "GET_PAGE_STATE"
      })) as PageStateResult
      if (res?.ok) {
        setScore(res.payload.score)
        setReadingModeActive(res.payload.readingMode)
        setError(null)
      } else {
        setError(res?.error || "Could not reach this page.")
        setScore(null)
        setReadingModeActive(false)
      }
    } catch {
      setError("Reload the page after installing the extension, then try again.")
      setScore(null)
      setReadingModeActive(false)
    }
  }, [])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    void (async () => {
      const s = await loadSettingsResilient()
      settingsRef.current = s
      setSettings(s)
      try {
        await refreshPageState()
      } catch {
        /* tab may be restricted; controls stay usable */
      }
    })()
  }, [refreshPageState])

  const pushToTab = useCallback(async (next: SensorySettings) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return
    try {
      const res = (await chrome.tabs.sendMessage(tab.id, {
        type: "APPLY_SETTINGS",
        settings: next
      })) as PageStateResult
      if (res?.ok) {
        setScore(res.payload.score)
        setReadingModeActive(res.payload.readingMode)
      }
    } catch {
      /* restricted pages */
    }
  }, [])

  const update = useCallback(
    async (partial: Partial<SensorySettings>) => {
      const next = { ...settingsRef.current, ...partial }
      settingsRef.current = next
      setSettings(next)
      // Serialize persist + tab apply so rapid slider input cannot reorder or
      // overwrite storage; each enqueued step keeps its own snapshot of `next`.
      persistTailRef.current = persistTailRef.current
        .catch(() => {})
        .then(async () => {
          await saveSettings(next)
          await pushToTab(next)
          await refreshPageState()
        })
      return persistTailRef.current
    },
    [pushToTab, refreshPageState]
  )

  const toggle = (key: keyof SensorySettings) => async () => {
    const cur = settingsRef.current[key]
    if (typeof cur !== "boolean") return
    await update({ [key]: !cur } as Partial<SensorySettings>)
  }

  const toggleReadingMode = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return
    const next = !readingModeActive
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "SET_READING_MODE",
        enabled: next
      })
      await refreshPageState()
    } catch {
      setError("Reading mode needs a normal webpage tab.")
    }
  }, [readingModeActive, refreshPageState])

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
          onChange={toggle("reduceMotion")}
        />
        <div className="croutons-row croutons-slider-row">
          <div className="croutons-slider-head">
            <span className="croutons-row-title">Contrast softening</span>
            <span
              className="croutons-softness-tier"
              title={`${settings.contrastSoftness} / 100`}>
              {contrastSoftnessTier(settings.contrastSoftness)}
            </span>
          </div>
          <input
            className="croutons-slider"
            type="range"
            min={0}
            max={100}
            value={settings.contrastSoftness}
            onChange={(e) =>
              void update({ contrastSoftness: Number(e.target.value) })
            }
            aria-label="Contrast softening amount"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={settings.contrastSoftness}
            aria-valuetext={contrastSoftnessTier(settings.contrastSoftness)}
          />
          <div className="croutons-slider-scale" aria-hidden>
            <span>Disabled</span>
            <span>Softer</span>
          </div>
        </div>
        <ToggleRow
          title="Block autoplay"
          hint="Pause auto-playing video & audio"
          checked={settings.blockAutoplay}
          onChange={toggle("blockAutoplay")}
        />
        <ToggleRow
          title="Hide big overlays"
          hint="Large fixed layers (modals, takeovers)"
          checked={settings.hideOverlays}
          onChange={toggle("hideOverlays")}
        />
        <ToggleRow
          title="Reading mode"
          hint="Article view with calmer typography on this tab"
          checked={readingModeActive}
          onChange={() => void toggleReadingMode()}
        />
      </section>

      <div className="croutons-actions">
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
