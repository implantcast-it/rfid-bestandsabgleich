# Product Intent — RFID Bestandsabgleich

> Snapshot of **current product intent** (v4.1.3) for a full rewrite (UI, implementation, tests, performance).  
> Derived from code + existing docs on 2026-03-11. Treat this as the source of truth for *what the product must do*, not *how it is built today*.

---

## One-liner

A **Windows desktop app** for implantcast field staff that reconciles **on-site RFID/barcode scans** with **ERP expected stock** at a customer (Debitor), lets staff annotate discrepancies with operational actions, and exports a **customer-signable PDF** plus a reusable **Excel comparison workbook**.

---

## Problem

Manual inventory (Inventur) at hospitals/clinics is slow and error-prone. implantcast places stock at customers (often consignment / Konsi). Field staff need to:

1. Know what ERP says *should* be on site.
2. Compare that to what RFID (and optionally barcode) devices actually scanned.
3. Decide follow-up bookings (To Do / Anmerkung).
4. Get customer confirmation of the inventory result.

---

## Users & stakeholders

| Role | Need |
|------|------|
| **Außendienstmitarbeiter** (field rep) | Primary operator: upload files, review mismatches, annotate, export PDF/Excel, get customer signature |
| **Logistik** | Receives feedback on bugs/performance/feature requests; owns process outcomes after export |
| **Kunde** (hospital/clinic) | Signs PDF confirmation; does not use the app |
| **IT / implantcast-it** | Builds, signs, releases Windows installer; keeps updater working |

---

## Product identity

| Attribute | Value |
|-----------|-------|
| Display name | Bestandsabgleich |
| Window title pattern | `implantcast GmbH - Bestandsabgleich v{version}` |
| Bundle ID | `de.implantcast.rfid-bestandsabgleich` |
| Platform | Windows desktop (Tauri v2 + WebView) |
| Distribution | GitHub Releases (NSIS) + in-app auto-update |
| Language (UI) | German |
| Brand accent | `#006860` |

---

## Jobs to be done

1. **Prepare inventory inputs** — Master GTIN catalog, same-day ERP stock export, RFID scan TXT (optional barcode TXT).
2. **Run reconciliation** — Enrich scans via GTIN, dedupe lots, compare ERP ↔ RFID at LotId and Artikelnummer level.
3. **Work the discrepancies** — Edit RFID presence, assign To Do / Anmerkung, mark Stichproben; use bulk + auto helpers.
4. **Confirm with customer** — Export landscape PDF with totals + signature page.
5. **Hand off to logistics** — Export full Excel workbook; optionally re-open that workbook later to continue/review.

---

## Success criteria (product)

A session is successful when:

- Debitor is identified from ERP data.
- LotId comparison covers all unique lots from ERP and RFID.
- Staff can explain every red/amber mismatch via To Do and/or Anmerkung (process expectation; not enforced by software).
- Stichproben quota met: at least **ceil(1% of Ax-Bestand ERP quantity)** LotId rows marked `X` (mandatory before Excel/PDF export and Fertig).
- PDF and/or Excel can be saved to disk without data loss of edits (only after Stichproben quota).
- Customer can sign the PDF confirmation page.

---

## Non-goals (current product)

- Online ERP / live API integration
- Multi-user collaboration or cloud sync
- Mobile / macOS / Linux support
- Automated booking back into ERP
- Authentication / user accounts
- Training mode with sample data (beyond accidental hardcoded paths in ProcessingScreen)

---

## Inputs the operator must bring

Documented for operators in `README.md`; enforced in-app on the upload screen:

| Input | Required | Format | Role |
|-------|----------|--------|------|
| Inventur-Master (import) | Rare (library seed / update) | `.xlsx` / `.xls` | **Same for all clients.** Source of GTIN → product fields. Imported/copied into the app once; **not** edited in place as the export file. Updates are **additive** (new GTINs); existing GTIN mappings never change |
| ERP-Daten | Yes (per Inventur) | `.xlsx` / `.xls` | Same-day ERP export of stock expected at customer |
| RFID-Scan | Yes (per Inventur) | `.txt` | Export from RFID device (GTIN/Lot/… only — product name etc. filled from **in-app GTIN list**) |
| Barcode-Scan | No | `.txt` | Manual/barcode inventory lines |
| Existing Abgleich | Alternative / legacy | `.xlsx` | Previously exported comparison workbook (“Abgleich einlesen”) |

**Rewrite target (not current v4 behavior):** GTIN list lives **in-app** (fast structured store). The result Excel is **created by the program** from a fixed schema — not by cloning/mutating a Master workbook.

---

## Outputs

| Artifact | Purpose |
|----------|---------|
| Excel workbook | Full comparison + raw sheets; reloadable; logistics handoff |
| PDF | Customer-facing inventory confirmation with signature fields |

Naming pattern:

- `` `[${debitor}] Bestandsabgleich ${date}.xlsx` ``
- `` `[${debitor}] Bestandsabgleich - ${date}.pdf` ``

---

## Domain glossary

| Term | Meaning |
|------|---------|
| Bestandsabgleich | Inventory reconciliation (product name) |
| Inventur | Physical inventory count at customer site |
| Debitor / Debitorenkonto | Customer account number |
| GTIN | Global Trade Item Number on tags/labels |
| Artikelnummer / REF | Product reference number |
| LotId / LotID | Lot / batch identifier — primary unit of match |
| Kennzeichen 3 (Kz 3) | Product category: typically `IMP`, `INST`, `SIEB` |
| SIEB / INST | Sieves / instruments — often treated as “counted” without RFID |
| IMP | Implant products (default sort group) |
| Eigenbestand nach ERP | Expected quantity / presence from ERP |
| Physischer Bestand | ERP source column renamed to Eigenbestand nach ERP |
| Ax-Bestand | Sheet name for ERP data inside the workbook |
| Konsi | Consignment stock |
| To Do | Operational follow-up action for a lot discrepancy |
| Anmerkung | Free-ish note from a fixed vocabulary |
| Stichprobe | Spot-check mark (`X`); mandatory ceil(1% of ERP qty) |
| MHD / Ablaufdatum / Verfall | Expiry date |
| offener Posten | Open item (ERP 0 & RFID 0) |
| interne Berechnung | Auto To Do for “expected but not scanned” |
| interne Gutschrift mit Rückbuchung auf Konsi | Auto To Do for “scanned but not in ERP” |
| Außendienstmitarbeiter | Field representative signing the PDF |
| SOLL / IST / Abweichung | Expected / actual / delta totals on PDF |

Full dropdown vocabularies: see [data-model-and-rules.md](./data-model-and-rules.md).

---

## Constraints a rewrite must respect

1. **Offline desktop** — works on field laptops without cloud dependency for core flow.
2. **German domain language** — labels and export vocabulary stay process-compatible with logistics.
3. **Excel round-trip** — exported workbook must reopen in-app with LotId + Artikelnummer sheets.
4. **Windows distribution** — staff install via NSIS; updates via GitHub `latest.json` (unless distribution is redesigned intentionally).
5. **No silent data loss** — edits to LotId must flow into ArtNr aggregates and exports.
6. **Customer PDF** — must remain printable/signable with SOLL/IST/Abweichung and signature page.

---

## Open product questions (clarify before / during rewrite)

1. Is “unser Bestand” always implantcast consignment, or mixed Eigentum/Konsi?
2. ~~Should Stichproben ≥ 10 block PDF export?~~ → **Yes — mandatory ceil(1% of Ax ERP quantity) gates Excel, PDF, and Fertig.**
3. Should To Do be mandatory when ERP ≠ RFID?
4. Is barcode scan still a first-class path, or legacy?
5. Who owns Master-Template creation and column schema changes?
6. ~~Should mid-session autosave exist?~~ → **Yes** — see [ux-document-model.md](./ux-document-model.md).
7. ~~One global Master vs many?~~ → **One shared GTIN catalog for all clients.**
8. ~~Re-enrich old projects on Master update?~~ → **No.** Existing GTINs never change; updates only add new GTINs. Old projects keep their enrichment; new projects use the updated list (no re-enrichment pass needed for known GTINs).
9. How should field laptops migrate projects (backup zip vs IT roaming)?
10. ~~Export sheet schema?~~ → **Keep today’s sheet names for Logistik parity** (app still generates the workbook; names/columns match current export).

---

## Related docs

- [User flows](./user-flows.md)
- [Data model & business rules](./data-model-and-rules.md)
- [Current architecture](./architecture-current.md)
- [Feature parity checklist](./feature-parity.md)
- [Rework notes](./rework-notes.md)
