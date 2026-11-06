# Home mock — production-oriented

File: `home-inspired.html` · Tauri window **1075×700**  
Assets: `assets/ic-shamrock_rgb.png` · visual ref: `ref-dribbble.jpg`

## Screen jobs

1. Start Inventur: upload **ERP** + **RFID**, then **Abgleich starten**
2. **Inline processing** replaces the Neue Inventur banner in place (topbar + insights + inventuren stay). States: **Abgleich läuft** / **fertig** / **fehlgeschlagen**. No PDF/Excel here; exports live in the editor only. Error → **Erneut versuchen** restores upload with files still attached.
3. Year overview cards under the banner slot (version, comparisons, open, samples)
4. Resume work via **document file cards** (Alle / Offen / Exportiert / Fertig)
5. In-app notifications (warnings / info / success) via bell + toast stack
6. Settings (GTIN admin) via header gear

## Mock phases

Bottom mock switcher or URL hash (hash preferred — survives `serve` clean-URL redirects):

| Phase | Param |
|-------|--------|
| Upload (idle) | (default) or `#phase=idle` |
| Abgleich läuft | `#phase=processing` |
| Abgleich fertig | `#phase=success` |
| Abgleich fehlgeschlagen | `#phase=error` |

## Inventuren file cards

Cards are **document silhouettes** (folded-corner sheet as the shape), **larger** so ~**5 per row** fit in the 1075px window. Left-aligned row with a custom horizontal scrollbar when there are more projects.

| Status | Badge | Typical after |
|--------|-------|----------------|
| Offen | muted teal text | Schließen from editor (project persisted) |
| Exportiert | muted blue-gray text | Excel/PDF export from editor |
| Fertig | muted green-gray text | Inventur completed / archived |

Insight counts refresh with the library: **Vergleiche 2026**, **Offene Inventuren**, **Stichproben offen**. Optional toast: *Inventur gespeichert* / *Excel exportiert*.

## Insight cards

| Card | Meaning |
|------|---------|
| App-Version | Installed build (`v4.1.3`) |
| Vergleiche 2026 | Completed/started reconciliations this inventur year |
| Offene Inventuren | Still in progress |
| Stichproben offen | Remaining samples vs ceil(1% ERP qty) quota, summed across all inventuren (open, exported, done) |

## Notifications

- Header bell with unread badge + dropdown list
- Bottom-right toast viewport (warn / info / success), dismissible
- Invalid file drop re-triggers the warning toast
- After successful compare, bell may show *Inventur angelegt* (no second toast on start)
