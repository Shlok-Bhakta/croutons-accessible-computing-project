export type SensorySettings = {
  reduceMotion: boolean
  softenContrast: boolean
  contrastSoftness: number
  blockAutoplay: boolean
  hideOverlays: boolean
  /** 0–100: auto-apply stronger filters when score exceeds this */
  sensoryThreshold: number
}

export const DEFAULT_SETTINGS: SensorySettings = {
  reduceMotion: true,
  softenContrast: true,
  contrastSoftness: 72,
  blockAutoplay: true,
  hideOverlays: false,
  sensoryThreshold: 45
}

export const STORAGE_KEY = "croutonsSensorySettings"

export async function loadSettings(): Promise<SensorySettings> {
  const raw = await chrome.storage.sync.get(STORAGE_KEY)
  const v = raw[STORAGE_KEY] as Partial<SensorySettings> | undefined
  return { ...DEFAULT_SETTINGS, ...v }
}

export async function saveSettings(s: SensorySettings): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: s })
}
