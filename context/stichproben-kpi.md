# Stichproben KPI (start screen)

## 2026-11-06 — Mandatory ceil(1% ERP quantity)

**Rule:** `required = ceil(0.01 × Σ Ax-Bestand eigenbestand_nach_erp)`. Progress = LotId rows with Stichprobe `X`. Complete when `done >= required`.

**Hard gates:** Excel export, PDF export, and **Fertig** (status `done`) blocked until complete.

**Hub KPI `Stichproben offen`:** sum of `max(0, required - done)` across all inventuren for the inventur year (open, exported, done).

**Persisted on `ProjectMeta`:** `stichproben_done`, `stichproben_required` (refreshed on create/save from `EditorStats`).

**Code:** `helpers::stichproben_required_from_erp_total`, `EditorStats`, `StartScreen` `insightCounts`, editor gates in `EditorScreen`.

## 2026-11-06 — Earlier (superseded)

Previously used a soft `/10` inventur target and counted inventuren or remaining-to-10. Replaced by the 1% ERP rule above.
