# Universal Sensory Filter (Croutons)

Chrome extension prototype that **softens contrast**, **reduces motion**, **blocks autoplay**, optionally **hides large fixed overlays**, and offers **reading mode** (Mozilla Readability) — all **client-side**.

Stack: [Plasmo](https://docs.plasmo.com/) · React · TypeScript.

## Run locally

```bash
npm install
npm run dev
```

In Chrome: **Extensions → Developer mode → Load unpacked** → pick `build/chrome-mv3-dev` (dev) or `build/chrome-mv3-prod` (after `npm run build`).

After changing code, reload the extension on `chrome://extensions` when not using dev HMR.

## Production zip

```bash
npm run build
npm run package
```

## What to try

1. Open a busy news or shopping site.
2. Open the extension popup: check **Sensory load score** and toggles.
3. Use **Reading mode** on an article page.
4. Open **Thresholds & details** for the full options tab.

Restricted URLs (`chrome://`, the Chrome Web Store, etc.) cannot run content scripts — use a normal `https://` page.

## Project layout

| Path | Role |
|------|------|
| `popup.tsx` / `popup.css` | Toolbar popup UI |
| `options.tsx` / `options.css` | Full-page options |
| `contents/sensory.ts` | Page filters, score, reading mode |
| `lib/settings.ts` | `chrome.storage.sync` schema |

## Team

**Croutons** — accessible computing project.
