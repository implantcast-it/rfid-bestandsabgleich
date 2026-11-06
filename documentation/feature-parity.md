# Feature Parity Checklist (Rewrite)

Use this as the acceptance backlog when rebuilding UI + implementation. Items marked **Must** are required for logistics process continuity. **Should** improves UX but can ship later. **Drop/Redesign** are intentional rewrite opportunities.

---

## Rewrite visual sequence (locked)

Post-start UI choreography for the document hub (see start-screen mock + post-start plan):

1. **Home** — ERP + RFID only (no Master dropzone). **Abgleich starten** when both ready.
2. **Inline processing on home** — Neue Inventur banner swaps in place for Abgleich läuft / fertig / fehlgeschlagen (topbar + insights + inventuren stay). **No PDF/Excel downloads** here; no separate processing route.
3. **Editor (LotId)** — Speichern · Excel · PDF · **Schließen** (exports only here).
4. **Hub return** — **Schließen** → home idle; project stays; inventuren file card status updates (**Offen** / **Exportiert** / **Fertig**); insight counts refresh.

---

## Entry & navigation

| Feature | Priority | Notes |
|---------|----------|-------|
| Start welcome + CTA to upload | Redesign | Document hub on home — ERP/RFID upload in place; no separate `/upload` |
| In-app GTIN catalog (from Master import) | Must | Shared for all clients; additive updates; not xlsx at runtime; settings/first-run only |
| App-generated Excel export schema | Must | Do not clone Master workbook; **keep today’s sheet names** for Logistik parity |
| Recent projects hub | Must | Document file cards under Inventuren; open without hunting disk paths |
| Autosave projects internally | Must | Close must not discard edits; first save as soon as compare succeeds |
| Open existing Abgleich Excel | Must | Keep as import/legacy + logistics path |
| Upload ERP / RFID for new project | Must | **No Master on start path** when GTIN library filled |
| Optional Barcode upload | Should | Confirm with Logistik if still needed |
| Processing progress + errors | Must | Inline on home (same banner slot); **no download buttons**; error restores upload with files attached; no hardcoded fallback paths |
| Editor with 6 views | Must | Same information architecture unless product changes; exports live here |
| Close → hub (keep project) | Must | **Schließen** returns to hub; file card + insights update; replaces destructive restart |
| Theme light/dark | Should | Persisted preference |
| In-app updater | Must* | *Unless distribution model changes |
| 404 / invalid route handling | Should | |

---

## Reconciliation engine

| Feature | Priority | Notes |
|---------|----------|-------|
| Master GTIN enrichment | Must | Unknown → `"Unbekannt"` |
| RFID LotId dedupe (first wins) | Must | |
| ERP sheet → `Ax-Bestand` | Must | Rename `Physischer Bestand` |
| Debitor from ERP | Must | |
| ArtNr compare (row counts + Differenz) | Must | Document row-vs-qty semantics |
| LotId compare (binary presence) | Must | Sort IMP/INST/SIEB |
| Barcode parse + scan compare | Should | Length-37 rule or replace with robust GS1 parser |
| Reload validation for required sheets | Must | |

---

## LotId editor

| Feature | Priority | Notes |
|---------|----------|-------|
| Edit RFID / To Do / Anmerkung / Stichprobe | Must | Exact vocabularies |
| Multi-select + bulk apply | Must | |
| Auto-Kommentare pairing | Must | Same To Do strings |
| Auto SIEB/INST + Offene Posten | Must | |
| LotId → ArtNr live aggregation | Must | |
| Writeback into workbook before export | Must | |
| Color coding ERP/RFID/Differenz/expiry | Must | Don’t rely on color alone — add text/icons in rewrite |
| Stichproben counter vs ceil(1% ERP qty) | Must | Hard gate for Excel/PDF/Fertig |
| Filters / pagination / DE locale | Should | Any grid OK if equivalent |
| Dirty-row indicator | Should | `isEdited` unused today — good to implement |

---

## Read-only inventory views

| Feature | Priority | Notes |
|---------|----------|-------|
| ERP table | Must | Expiry coloring |
| RFID table | Must | |
| Barcode table | Should | |
| Scan comparison table | Should | |
| Refresh raw views after LotId edits | Redesign | Today stale — decide product behavior |

---

## Exports

| Feature | Priority | Notes |
|---------|----------|-------|
| Excel save dialog + naming | Must | Debitor + date |
| Round-trip reopen in app | Must | |
| PDF landscape LotId table | Must | SOLL/IST/Abweichung |
| PDF signature / Bestätigung page | Must | |
| Brand accent `#006860` | Should | Brand continuity |

---

## Platform

| Feature | Priority | Notes |
|---------|----------|-------|
| Windows desktop app | Must | |
| Drag-drop file assign | Should | |
| Native open/save dialogs | Must | |
| Version display | Should | Single source of truth |
| Signed auto-update | Must* | *Or replacement distribution |
| Restrict FS permissions | Redesign | Tighten vs `**` |

---

## Quality bar for rewrite (new)

| Capability | Priority | Notes |
|------------|----------|-------|
| Unit tests for compare/parse | Must | Pure functions, golden fixtures |
| Fixture Excel/TXT samples | Must | Anonymized |
| E2E smoke: upload→editor→export | Must | |
| Schema validation with clear errors | Must | Replace silent Unbekannt-only failures where possible |
| Off-main-thread or incremental parse | Should | Performance goal |
| Persistent session / draft save | Should | Product decision |
| Typed domain model | Must | End `Record<string, any>` core |
| No secrets in repo | Must | |
| CI test gate before release | Must | Stop push-to-main = prod without checks |

---

## Explicit non-parity (safe to change)

- MUI icons → any icon set
- Radix → any accessible primitives
- AG Grid → alternative data grid
- wouter → any router (or single-page state machine)
- Tailwind version / design system overhaul
- Theme default Dark window → product design choice
- File/folder structure Domains+Features or similar
- Moving compare logic to Rust (optional; not required for intent)
