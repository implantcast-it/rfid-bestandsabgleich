/** Mirrors Rust `EditorStats` (serde snake_case). */
export type EditorStats = {
  abweichungen: number
  offene_todos: number
  stichproben_done: number
  /** Mandatory quota: ceil(1% of erp_quantity_total). */
  stichproben_required: number
  /** Sum of Ax-Bestand ERP quantities (guideline for the 1% rule). */
  erp_quantity_total: number
}

export type ErpRow = {
  artikelnummer: string
  produktname: string
  lot_id: string
  kennzeichen_3: string
  ablaufdatum: string
  debitorenkonto: string
  eigenbestand_nach_erp: string
}

export type RfidRow = {
  gtin: string
  lot_id: string
  kennung_1: string
  debitorennummer: string
  erfasst_um: string
  artikelnummer: string
  produktname: string
  kennzeichen_3: string
}

export type LotIdCompareRow = {
  artikelnummer: string
  produktname: string
  kennzeichen_3: string
  lot_id: string
  eigenbestand_nach_erp: string
  rfid_scan: string
  ablaufdatum: string
  to_do: string
  anmerkung: string
  stichprobe: string
  id: string
  index: number
}

export type ArtNrCompareRow = {
  artikelnummer: string
  produktname: string
  eigenbestand_nach_erp: number
  rfid_scan: number
  differenz: number
  id: string
}

/** Mirrors Rust `OffenePostenRow`: ordered but not on site; outside the Abgleich. */
export type OffenePostenRow = {
  artikelnummer: string
  produktname: string
  lot_id: string
  /** MHD (`Ablaufdatum` from the ERP sheet). */
  ablaufdatum: string
  /** Count from `Insgesamt bestellt`. */
  offen: string
  id: string
}

/** Mirrors Rust `EditorSnapshot` returned by run_inventur / load_abgleich. */
export type EditorSnapshot = {
  debitor: string
  kundenname: string
  lot_id_rows: LotIdCompareRow[]
  art_nr_rows: ArtNrCompareRow[]
  ax_bestand: ErpRow[]
  rfid_scan: RfidRow[]
  offene_posten: OffenePostenRow[]
  dirty: boolean
  edited_ids: string[]
  stats: EditorStats
}

/** wouter history.state payload for the editor. */
export type InventurSessionState = {
  projectId: string
  snapshot: EditorSnapshot
  projectTitle?: string
  inventurjahr?: string
}

/** German column keys used by LotIdTable (TanStack DataTable). */
export type LotIdGridRow = {
  Index: number
  LotId: string
  Artikelnummer: string
  Produktname: string
  "Kennzeichen 3": string
  Ablaufdatum: string
  "Eigenbestand nach ERP": string
  "RFID-Scan": string
  "To Do": string
  Anmerkung: string
  Stichprobe: string
  id: string
  isEdited?: boolean
  /** View-only: normalized identity text for the global search (never exported). */
  searchText: string
  /** View-only: Ablaufdatum timestamp for sorting (never exported). */
  ablaufdatumTimestamp: number
}

/** German column keys used by OffenePostenTable and the Excel sheet. */
export type OffenePostenGridRow = {
  Artikelnummer: string
  Produktname: string
  LotId: string
  Ablaufdatum: string
  Offen: string
  id: string
}

/** ArtNr grid row aggregated from LotId grid rows (ERP and RFID counts). */
export type ArtNrAggregateRow = {
  Artikelnummer: string
  Produktname: string
  "Eigenbestand nach ERP": number
  "RFID-Scan": number
  Differenz: number
  id: string
}

export type ArtNrGridRow = Record<string, unknown>

/** Excel header order for the "Offene Posten" sheet (matches the Rust writer). */
export const OFFENE_POSTEN_EXCEL_HEADERS = [
  "Artikelnummer",
  "Produktname",
  "LotId",
  "Ablaufdatum",
  "Offen",
  "id",
]
