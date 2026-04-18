import "./options.css"

import { useEffect, useId, useRef, useState } from "react"

import {
  DEFAULT_SETTINGS,
  contrastSoftnessTier,
  type SensorySettings,
  loadSettingsResilient,
  saveSettings
} from "~lib/settings"
import { useApplyDocumentTheme } from "~lib/theme"

export default function OptionsPage() {
  const [settings, setSettings] = useState<SensorySettings>(DEFAULT_SETTINGS)
  const settingsRef = useRef<SensorySettings>(DEFAULT_SETTINGS)
  const persistTailRef = useRef(Promise.resolve())
  const thresholdId = useId()
  const contrastId = useId()
  const darkSwitchId = useId()

  useApplyDocumentTheme(settings.themePreference)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    void (async () => {
      const s = await loadSettingsResilient()
      settingsRef.current = s
      setSettings(s)
    })()
  }, [])

  const persist = (next: SensorySettings) => {
    settingsRef.current = next
    setSettings(next)
    persistTailRef.current = persistTailRef.current
      .catch(() => {})
      .then(async () => {
        await saveSettings(next)
      })
  }

  const toggleDarkInterface = () => {
    const cur = settingsRef.current.themePreference
    void persist({ ...settingsRef.current, themePreference: cur === "dark" ? "light" : "dark" })
  }

  return (
    <>
      <a href="#croutons-options-main" className="croutons-opt-skip">
        Skip to settings
      </a>
      <div className="croutons-opt-wrap">
        <header className="croutons-opt-hero">
          <p className="croutons-opt-kicker">Croutons · accessible computing</p>
          <h1 className="croutons-opt-title">Sensory filter settings</h1>
          <p className="croutons-opt-lede">
            Tune your default comfort level and when a page counts as high sensory
            load. All processing stays on your device.
          </p>
        </header>

        <main id="croutons-options-main" className="croutons-opt-main" tabIndex={-1}>
          <section
            className="croutons-opt-block"
            aria-labelledby="defaults-heading">
            <h2 id="defaults-heading" className="croutons-opt-block-title">
              Default contrast softening
            </h2>
            <p className="croutons-opt-block-lede">
              Starting point for the contrast slider in the popup. You can still
              change it per tab there.
            </p>
            <div className="croutons-opt-field">
              <div className="croutons-opt-label">
                <label htmlFor={contrastId}>Softening amount</label>
                <span className="croutons-opt-value" aria-live="polite">
                  {contrastSoftnessTier(settings.contrastSoftness)}
                </span>
              </div>
              <input
                id={contrastId}
                className="croutons-opt-slider"
                type="range"
                min={0}
                max={100}
                value={settings.contrastSoftness}
                onChange={(e) =>
                  void persist({
                    ...settingsRef.current,
                    contrastSoftness: Number(e.target.value)
                  })
                }
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={settings.contrastSoftness}
                aria-valuetext={contrastSoftnessTier(settings.contrastSoftness)}
              />
              <p className="croutons-opt-note">
                All the way left turns contrast softening off. Higher values apply a
                softer, lower-contrast look (mild, moderate, or strong).
              </p>
            </div>
            <div className="croutons-opt-field croutons-opt-field--row">
              <label className="croutons-opt-theme-label" htmlFor="croutons-grayscale">
                <span className="croutons-opt-theme-title">Grayscale pages</span>
                <span className="croutons-opt-theme-hint">
                  Black and white rendering to lower color stimulation
                </span>
              </label>
              <span className="croutons-opt-switch">
                <input
                  id="croutons-grayscale"
                  type="checkbox"
                  role="switch"
                  aria-checked={settings.grayscale}
                  checked={settings.grayscale}
                  onChange={() =>
                    void persist({
                      ...settingsRef.current,
                      grayscale: !settingsRef.current.grayscale
                    })
                  }
                />
                <span className="croutons-opt-switch-track" aria-hidden="true">
                  <span className="croutons-opt-switch-thumb" />
                </span>
              </span>
            </div>
          </section>

          <section
            className="croutons-opt-block"
            aria-labelledby="threshold-heading">
            <h2 id="threshold-heading" className="croutons-opt-block-title">
              Sensory load threshold
            </h2>
            <p className="croutons-opt-block-lede">
              When a page’s score is at or above this number, it is marked as high
              sensory load (for future automatic rules). Lower values flag more
              pages.
            </p>
            <div className="croutons-opt-field">
              <div className="croutons-opt-label">
                <label htmlFor={thresholdId}>Threshold</label>
                <span className="croutons-opt-value" aria-live="polite">
                  {settings.sensoryThreshold}
                </span>
              </div>
              <input
                id={thresholdId}
                className="croutons-opt-slider"
                type="range"
                min={0}
                max={100}
                value={settings.sensoryThreshold}
                onChange={(e) =>
                  void persist({
                    ...settingsRef.current,
                    sensoryThreshold: Number(e.target.value)
                  })
                }
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={settings.sensoryThreshold}
                aria-label="Sensory load threshold"
              />
              <p className="croutons-opt-note">
                The score is a rough heuristic: videos, iframes, motion hints, and
                autoplay-like behavior.
              </p>
            </div>
          </section>

          <section
            className="croutons-opt-block croutons-opt-block--theme"
            aria-labelledby="appearance-heading">
            <h2 id="appearance-heading" className="croutons-opt-block-title">
              Appearance
            </h2>
            <p className="croutons-opt-block-lede">
              Light by default. Turn on for a dark interface on the popup and this
              page.
            </p>
            <div className="croutons-opt-theme-row">
              <label className="croutons-opt-theme-label" htmlFor={darkSwitchId}>
                <span className="croutons-opt-theme-title">Dark interface</span>
                <span className="croutons-opt-theme-hint">Easier in low light</span>
              </label>
              <span className="croutons-opt-switch">
                <input
                  id={darkSwitchId}
                  type="checkbox"
                  role="switch"
                  aria-checked={settings.themePreference === "dark"}
                  checked={settings.themePreference === "dark"}
                  onChange={toggleDarkInterface}
                />
                <span className="croutons-opt-switch-track" aria-hidden="true">
                  <span className="croutons-opt-switch-thumb" />
                </span>
              </span>
            </div>
          </section>
        </main>

        <footer className="croutons-opt-footer">
          <p>
            Team Croutons — Universal Sensory Filter prototype. Not medical advice.
            Use the extension popup for per-session toggles on specific sites.
          </p>
        </footer>
      </div>
    </>
  )
}
