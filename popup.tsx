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
import { useApplyDocumentTheme } from "~lib/theme"

function IndexPopup() {
  const [settings, setSettings] = useState<SensorySettings>(DEFAULT_SETTINGS)
  const settingsRef = useRef<SensorySettings>(DEFAULT_SETTINGS)
  const persistTailRef = useRef(Promise.resolve())
  const [score, setScore] = useState<number | null>(null)
  const [baseScore, setBaseScore] = useState<number | null>(null)
  const [reducedBy, setReducedBy] = useState<number>(0)
  const [colorLoadScore, setColorLoadScore] = useState<number | null>(null)
  const [colorRecommendation, setColorRecommendation] = useState<string>("")
  const [recommendedFilters, setRecommendedFilters] = useState<string[]>([])
  const [pageUrl, setPageUrl] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [readingModeActive, setReadingModeActive] = useState(false)

  useApplyDocumentTheme(settings.themePreference)

  const scorePercent = useMemo(() => {
    if (score == null) return "0%"
    return `${Math.min(100, Math.max(0, score))}%`
  }, [score])

  const refreshPageState = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      setError("No active tab.")
      setScore(null)
      setBaseScore(null)
      setReducedBy(0)
      setColorLoadScore(null)
      setColorRecommendation("")
      setRecommendedFilters([])
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
      setBaseScore(null)
      setReducedBy(0)
      setColorLoadScore(null)
      setColorRecommendation("")
      setRecommendedFilters([])
      setReadingModeActive(false)
      return
    }
    try {
      const res = (await chrome.tabs.sendMessage(tab.id, {
        type: "GET_PAGE_STATE"
      })) as PageStateResult
      if (res?.ok) {
        setScore(res.payload.score)
        setBaseScore(res.payload.baseScore)
        setReducedBy(res.payload.reducedBy)
        setColorLoadScore(res.payload.colorLoadScore)
        setColorRecommendation(res.payload.recommendation)
        setRecommendedFilters(res.payload.recommendedFilters)
        setReadingModeActive(res.payload.readingMode)
        setError(null)
      } else {
        setError(res.error || "Could not reach this page.")
        setScore(null)
        setBaseScore(null)
        setReducedBy(0)
        setColorLoadScore(null)
        setColorRecommendation("")
        setRecommendedFilters([])
        setReadingModeActive(false)
      }
    } catch {
      setError("Reload the page after installing the extension, then try again.")
      setScore(null)
      setBaseScore(null)
      setReducedBy(0)
      setColorLoadScore(null)
      setColorRecommendation("")
      setRecommendedFilters([])
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
        setBaseScore(res.payload.baseScore)
        setReducedBy(res.payload.reducedBy)
        setColorLoadScore(res.payload.colorLoadScore)
        setColorRecommendation(res.payload.recommendation)
        setRecommendedFilters(res.payload.recommendedFilters)
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

  const toggleDarkInterface = () => {
    const cur = settingsRef.current.themePreference
    void update({ themePreference: cur === "dark" ? "light" : "dark" })
  }

  const openOptions = () => {
    void chrome.runtime.openOptionsPage()
  }

  const contrastSliderId = useId()
  const darkSwitchId = useId()

  const scoreAriaLabel =
    score == null
      ? "Sensory load score not available."
      : `Sensory load ${score} out of 100.`
  const colorScoreText = colorLoadScore == null ? "—" : `${colorLoadScore}/100`
  const reductionText =
    baseScore == null || score == null
      ? "—"
      : `${baseScore} → ${score} (-${reducedBy})`

  return (
    <main className="croutons-root" id="croutons-popup-main">
      <header className="croutons-header">
        <div className="croutons-header-main">
          <div className="croutons-header-text">
            <p className="croutons-kicker">Croutons</p>
            <h1 className="croutons-title">Universal Sensory Filter</h1>
          </div>
          <div
            className="croutons-score-ring-wrap"
            role="img"
            aria-label={scoreAriaLabel}>
            <div
              className="croutons-score-ring"
              style={{ ["--p" as string]: scorePercent }}>
              <div className="croutons-score-ring-inner" aria-hidden="true">
                {score == null ? "—" : score}
              </div>
            </div>
            <span className="croutons-score-ring-label">Load</span>
          </div>
        </div>
        <p className="croutons-tagline">
          Calmer contrast, quieter motion, steadier media.
        </p>
        {error ? (
          <p className="croutons-inline-status croutons-inline-status--error" role="status">
            {error}
          </p>
        ) : (
          <>
            <p className="croutons-inline-status" title={pageUrl}>
              {pageUrl ? (
                <>
                  <span className="croutons-sr-only">Page address: </span>
                  {pageUrl}
                </>
              ) : (
                "This tab"
              )}
            </p>
            <p className="croutons-inline-status">
              <span className="croutons-status-key">Color load:</span> {colorScoreText}
            </p>
            <p className="croutons-inline-status">
              <span className="croutons-status-key">Reduction:</span> {reductionText}
            </p>
            {colorRecommendation ? (
              <p className="croutons-inline-status croutons-inline-status--recommendation">
                {colorRecommendation}
              </p>
            ) : null}
            {recommendedFilters.length > 0 ? (
              <p className="croutons-inline-status">
                <span className="croutons-status-key">Suggested:</span>{" "}
                {recommendedFilters.join(", ")}
              </p>
            ) : null}
          </>
        )}
      </header>

      <section className="croutons-stack" aria-label="Filter controls">
        <ToggleRow
          title="Reading mode"
          hint="Article view with calmer typography"
          checked={readingModeActive}
          onChange={() => void toggleReadingMode()}
        />
        <ToggleRow
          title="Reduce motion"
          hint="Short-circuit animations and transitions"
          checked={settings.reduceMotion}
          onChange={toggle("reduceMotion")}
        />

        <p className="croutons-mini-heading">Media</p>
        <ToggleRow
          title="Block autoplay"
          hint="Pause auto-playing video and audio"
          checked={settings.blockAutoplay}
          onChange={toggle("blockAutoplay")}
        />
        <ToggleRow
          title="Hide big overlays"
          hint="Large fixed layers such as modals"
          checked={settings.hideOverlays}
          onChange={toggle("hideOverlays")}
        />

        <p className="croutons-mini-heading" id="croutons-comfort-heading">
          Visual comfort
        </p>
        <ToggleRow
          title="Grayscale"
          hint="Black and white page view to reduce color stimulation"
          checked={settings.grayscale}
          onChange={toggle("grayscale")}
        />
        <div
          className="croutons-slider-block"
          aria-labelledby="croutons-comfort-heading">
          <div className="croutons-slider-head">
            <label htmlFor={contrastSliderId} className="croutons-control-label">
              Contrast softening
            </label>
            <span
              className="croutons-softness-tier"
              title={`${settings.contrastSoftness} out of 100`}>
              {contrastSoftnessTier(settings.contrastSoftness)}
            </span>
          </div>
          <input
            id={contrastSliderId}
            className="croutons-slider"
            type="range"
            min={0}
            max={100}
            value={settings.contrastSoftness}
            onChange={(e) =>
              void update({ contrastSoftness: Number(e.target.value) })
            }
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={settings.contrastSoftness}
            aria-valuetext={contrastSoftnessTier(settings.contrastSoftness)}
          />
          <div className="croutons-slider-scale" aria-hidden="true">
            <span>Off</span>
            <span>Softer</span>
          </div>
        </div>
      </section>

      <div className="croutons-actions">
        <button
          type="button"
          className="croutons-btn croutons-btn-ghost"
          onClick={openOptions}>
          Open full settings
        </button>
      </div>

      <div className="croutons-theme-row">
        <label className="croutons-row-label" htmlFor={darkSwitchId}>
          <span className="croutons-row-title">Dark interface</span>
          <span className="croutons-row-hint">Easier in low light</span>
        </label>
        <span className="croutons-switch">
          <input
            id={darkSwitchId}
            type="checkbox"
            role="switch"
            aria-checked={settings.themePreference === "dark"}
            checked={settings.themePreference === "dark"}
            onChange={toggleDarkInterface}
          />
          <span className="croutons-switch-track" aria-hidden="true">
            <span className="croutons-switch-thumb" />
          </span>
        </span>
      </div>
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
      <label className="croutons-row-label" htmlFor={id}>
        <span className="croutons-row-title">{props.title}</span>
        <span className="croutons-row-hint">{props.hint}</span>
      </label>
      <span className="croutons-switch">
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-checked={props.checked}
          checked={props.checked}
          onChange={props.onChange}
        />
        <span className="croutons-switch-track" aria-hidden="true">
          <span className="croutons-switch-thumb" />
        </span>
      </span>
    </div>
  )
}

export default IndexPopup
