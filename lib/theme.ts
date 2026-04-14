import { useEffect } from "react"

/** Applies theme to the host document (popup or options page). */
export function useApplyDocumentTheme(resolved: "light" | "dark"): void {
  useEffect(() => {
    document.documentElement.dataset.croutonsTheme = resolved
    document.documentElement.style.colorScheme = resolved
  }, [resolved])
}
