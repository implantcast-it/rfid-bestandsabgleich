# UX mockups (rewrite chrome)

Tauri window **1075×700** · Manrope · `#121212` · shared topbar from the home mock.

## Open locally

From repo root:

```bash
npx --yes serve documentation/ux-mockups -l 5179
```

Then:

| Screen | URL |
|--------|-----|
| Home (upload) | http://localhost:5179/start-screen/home-inspired.html |
| Home — Abgleich läuft | `#phase=processing` (or `?phase=processing`) |
| Home — Abgleich fertig | `#phase=success` |
| Home — Abgleich fehlgeschlagen | `#phase=error` |
| Editor LotId | http://localhost:5179/editor-lotid.html |

Prefer hash deep-links: `serve` clean URLs can drop `?query` on redirect.

Logo asset: `start-screen/assets/ic-shamrock_rgb.png`

## Screens in this folder

1. **`start-screen/home-inspired.html`** — hub: Neue Inventur upload **or** inline Abgleich panel (same slot), insights, inventuren file cards. Mock switcher / `?phase=` for idle · processing · success · error. **No PDF/Excel** during processing.
2. **`editor-lotid.html`** — LotId editor shell: sidebar, grid, collapsed bulk, Speichern / Excel / PDF / Schließen
