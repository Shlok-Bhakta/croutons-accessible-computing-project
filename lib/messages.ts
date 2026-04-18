import type { SensorySettings } from "~lib/settings"

export type PageStatePayload = {
  score: number
  baseScore: number
  reducedBy: number
  colorLoadScore: number
  recommendation: string
  recommendedFilters: string[]
  url: string
  applied: boolean
  readingMode: boolean
}

/** Messages sent from popup/options to the active tab content script */
export type ToContentMessage =
  | { type: "GET_PAGE_STATE" }
  | { type: "APPLY_SETTINGS"; settings: SensorySettings }
  | { type: "SET_READING_MODE"; enabled: boolean }

/** Response from content script for GET_PAGE_STATE */
export type PageStateResponse = {
  ok: true
  payload: PageStatePayload
}

export type PageStateError = {
  ok: false
  error: string
}

export type PageStateResult = PageStateResponse | PageStateError
