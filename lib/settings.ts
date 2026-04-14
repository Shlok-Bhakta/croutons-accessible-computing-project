export type SensorySettings = {
  reduceMotion: boolean
  contrastSoftness: number
  blockAutoplay: boolean
  hideOverlays: boolean
  /** 0–100: auto-apply stronger filters when score exceeds this */
  sensoryThreshold: number
}

export const DEFAULT_SETTINGS: SensorySettings = {
  reduceMotion: true,
  contrastSoftness: 36,
  blockAutoplay: true,
  hideOverlays: false,
  sensoryThreshold: 45
}

export const STORAGE_KEY = "croutonsSensorySettings"

/** 0–100 slider → human-readable tier for UI and assistive tech. */
export function contrastSoftnessTier(
  softness: number
): "Disabled" | "Mild" | "Moderate" | "Strong" {
  const s = Math.max(0, Math.min(100, softness))
  if (s === 0) return "Disabled"
  if (s < 34) return "Mild"
  if (s < 67) return "Moderate"
  return "Strong"
}

/** Merge stored values with defaults; migrate legacy `softenContrast` and strip it. */
export function normalizeSensorySettings(
  input: Partial<SensorySettings> & { softenContrast?: boolean }
): SensorySettings {
  const merged = { ...DEFAULT_SETTINGS, ...input }
  if (input.softenContrast === false) {
    merged.contrastSoftness = 0
  }
  const { softenContrast: _legacy, ...rest } = merged as SensorySettings & {
    softenContrast?: boolean
  }
  return rest
}

export async function loadSettings(): Promise<SensorySettings> {
  const raw = await chrome.storage.sync.get(STORAGE_KEY)
  const v = raw[STORAGE_KEY] as
    | (Partial<SensorySettings> & { softenContrast?: boolean })
    | undefined
  return normalizeSensorySettings(v ?? {})
}

const LOAD_SETTINGS_TIMEOUT_MS = 4000

/** Like loadSettings, but never throws and does not hang forever (falls back to defaults). */
export async function loadSettingsResilient(): Promise<SensorySettings> {
  try {
    return await Promise.race([
      loadSettings(),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("loadSettings timeout")),
          LOAD_SETTINGS_TIMEOUT_MS
        )
      })
    ])
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(s: SensorySettings): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: s })
}
