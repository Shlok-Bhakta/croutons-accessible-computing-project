# Universal Sensory Filter (Croutons)

A Chrome extension that makes busy pages easier to process: **softer contrast**, **less motion**, **no autoplay**, optional **overlay reduction**, and **reading mode** powered by Mozilla Readability. Everything runs **in the browser**—no accounts and no server.

Built with [Plasmo](https://docs.plasmo.com/), React, and TypeScript.

---

## Screenshots

**Extension popup (dark theme)** — sensory load score and quick controls.

![Extension popup in dark theme](github/assets/darkmodeextension.png)

**Reading mode (dark theme)**

![Reading mode in dark theme](github/assets/darkmodereadingmode.png)

**Reading mode (light theme)**

![Reading mode in light theme](github/assets/lightmodereadingmode.png)

---

## Features

- **Contrast & motion** — Reduce visual harshness and optional animation for a calmer screen.
- **Autoplay control** — Block autoplaying media where the page allows it.
- **Overlays** — Optionally hide large fixed overlays that compete for attention.
- **Reading mode** — Strip clutter and focus on article text (Mozilla Readability).
- **Sensory load score** — A quick signal of how “busy” the current page feels, with deeper settings under **Thresholds & details**.

Restricted URLs (`chrome://`, the Chrome Web Store, and similar) do not run content scripts; test on normal `https://` pages.

---

## Development

```bash
npm install
npm run dev
```

Load the unpacked extension in Chrome: **Extensions → Developer mode → Load unpacked** → choose `build/chrome-mv3-dev` for development, or `build/chrome-mv3-prod` after a production build.

Reload the extension on `chrome://extensions` when you change code (unless you rely on dev HMR).

## Production build

```bash
npm run build
npm run package
```

## Suggested workflow

1. Open a content-heavy site (news, shopping, feeds).
2. Open the toolbar popup: review the **Sensory load score** and adjust toggles.
3. On articles, try **Reading mode**.
4. Open **Thresholds & details** for the full options page.

---

## Project layout

| Path | Role |
|------|------|
| `popup.tsx` / `popup.css` | Toolbar popup |
| `options.tsx` / `options.css` | Full-page options |
| `contents/sensory.ts` | Page filters, score, reading mode |
| `lib/settings.ts` | `chrome.storage.sync` schema |

---

## Team

**Croutons** — accessible computing project.
