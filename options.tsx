import "./options.css"

import { useEffect, useState } from "react"

import {
  DEFAULT_SETTINGS,
  type SensorySettings,
  loadSettings,
  saveSettings
} from "~lib/settings"

export default function OptionsPage() {
  const [settings, setSettings] = useState<SensorySettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void loadSettings().then((s) => {
      setSettings(s)
      setLoaded(true)
    })
  }, [])

  const persist = async (next: SensorySettings) => {
    setSettings(next)
    await saveSettings(next)
  }

  return (
    <div className="croutons-opt-wrap">
      <header className="croutons-opt-hero">
        <p className="croutons-opt-kicker">Croutons · accessible computing</p>
        <h1 className="croutons-opt-title">Sensory filter settings</h1>
        <p className="croutons-opt-lede">
          Tune when the extension treats a page as “high load” and how strongly
          defaults kick in. All processing stays on your device.
        </p>
      </header>

      <section className="croutons-opt-card" aria-labelledby="threshold-heading">
        <h2 id="threshold-heading">Sensory load threshold</h2>
        <p>
          When a page’s score is at or above this number, the page is marked as
          high sensory load (for future auto rules). Lower = more pages flagged.
        </p>
        <div className="croutons-opt-field">
          <div className="croutons-opt-label">
            <span>Threshold</span>
            <span className="croutons-opt-value">{settings.sensoryThreshold}</span>
          </div>
          <input
            className="croutons-opt-slider"
            type="range"
            min={0}
            max={100}
            disabled={!loaded}
            value={settings.sensoryThreshold}
            onChange={(e) =>
              void persist({
                ...settings,
                sensoryThreshold: Number(e.target.value)
              })
            }
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={settings.sensoryThreshold}
            aria-label="Sensory load threshold"
          />
          <p className="croutons-opt-note">
            Score is a rough heuristic (videos, iframes, motion hints, autoplay).
          </p>
        </div>
      </section>

      <section className="croutons-opt-card" aria-labelledby="defaults-heading">
        <h2 id="defaults-heading">Default intensities</h2>
        <p>
          These mirror the popup controls. Adjust here if you want a calmer
          baseline every session.
        </p>
        <div className="croutons-opt-field">
          <div className="croutons-opt-label">
            <span>Contrast softness</span>
            <span className="croutons-opt-value">{settings.contrastSoftness}</span>
          </div>
          <input
            className="croutons-opt-slider"
            type="range"
            min={0}
            max={100}
            disabled={!loaded}
            value={settings.contrastSoftness}
            onChange={(e) =>
              void persist({
                ...settings,
                contrastSoftness: Number(e.target.value)
              })
            }
            aria-label="Default contrast softness"
          />
        </div>
      </section>

      <footer className="croutons-opt-footer">
        <p>
          Team Croutons — Universal Sensory Filter prototype. Not medical advice.
          For issues with specific sites, use toggles per session from the
          extension popup.
        </p>
      </footer>
    </div>
  )
}
