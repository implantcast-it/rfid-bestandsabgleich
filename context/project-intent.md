# RFID Bestandsabgleich — Context

- **What it is:** Windows Tauri desktop app that reconciles RFID/barcode scans with ERP expected stock at a customer (Debitor) for implantcast field inventory.
- **Who it's for:** Außendienst (operators), Logistik (process owners), Kunden sign PDF only.
- **Key differentiator:** Offline LotId-level reconciliation with operational To Do/Anmerkung vocabularies + customer-signable PDF + reloadable Excel.
- **Current version:** 4.1.3 (`de.implantcast.rfid-bestandsabgleich`)
- **Rewrite goal:** New UI, cleaner implementation, tests, better performance — product intent preserved.

## 2026-03-11 — Full exploration documented

Parallel exploration of product flows, compare/lib layer, editor UI, and Tauri/CI. Canonical docs written under `documentation/`:

| Doc | Purpose |
|-----|---------|
| `documentation/product-intent.md` | Why the product exists |
| `documentation/user-flows.md` | Operator journeys |
| `documentation/data-model-and-rules.md` | Schemas + algorithms |
| `documentation/architecture-current.md` | As-is tech map |
| `documentation/feature-parity.md` | Rewrite acceptance checklist |
| `documentation/rework-notes.md` | Engineering approach |

### Critical rewrite constraints

- Preserve sheet names, To Do/Anmerkung vocabularies, LotId→ArtNr sync, PDF confirmation page.
- ArtNr compare counts **rows**, not ERP quantity field.
- No tests today; `main` push = production release.
- ProcessingScreen has hardcoded fallback paths — must die.
- Session = wouter `history.state` only — needs durable draft model.

### Open product questions

See end of `documentation/product-intent.md` (Konsi semantics, Stichprobe gate, mandatory To Do, barcode future, Master ownership, autosave).

## 2026-03-11 — Import stack research

Full write-up: `documentation/import-stack-research.md`.

**Recommendation for rewrite:** Rust Tauri commands with `calamine` (≥0.32) + BurntSushi `csv` + `rust_xlsxwriter`; stop using SheetJS for RFID/Barcode TXT. If staying JS interim: keep SheetJS CE 0.20.3 CDN for Excel + Papa Parse ≥5.2 for scans. Avoid ExcelJS (unmaintained CVEs) and experimental SheetKit.

## 2026-03-11 — UX document model

User direction: Office-like UX. Master imported rarely into app library (not every session). Inventur = saved project with autosave + Recent list; closing must not discard work. Excel/PDF remain exports, not the only save. Details: `documentation/ux-document-model.md`.

### Master / GTIN / export (revised same day)

- Master Excel is **the same for all clients**; import **copies** into the app (not in-place edit of the file).
- **In-app GTIN catalog** (structured store) for speed — not xlsx on the hot path.
- GTIN updates are **additive**; **existing GTIN mappings never change** → no re-enrichment of old projects for known GTINs.
- **Result Excel is created by the program**, not by cloning/mutating Master.
- **Export sheet names keep today’s names** for Logistik parity.
- Legacy v4 mutated Master as export shell — retired in rewrite.

## 2026-03-11 — Start screen IA

Home is for **continue / recent / neue Inventur** only. **No GTIN panel** on daily start (settings or first-run setup). Visual mock directions discarded.
