import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"

/** Mirrors Rust `EditorStats` (serde snake_case). */
type EditorStats = {
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

/** Excel header order for the "Offene Posten" sheet (matches the Rust writer). */
export const OFFENE_POSTEN_EXCEL_HEADERS = [
  "Artikelnummer",
  "Produktname",
  "LotId",
  "Ablaufdatum",
  "Offen",
  "id",
]

type ArtNrGridRow = Record<string, unknown>

const asString = (value: unknown): string => {
  if (value == null) return ""
  return String(value)
}

const asNumber = (value: unknown): number => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Parse an Ax-Bestand ERP quantity cell; invalid/empty/negative → 0. */
const erpQuantityAsNumber = (raw: unknown): number => {
  const trimmed = asString(raw).trim().replace(",", ".")
  if (!trimmed) return 0
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.floor(n)
}

/** Mandatory Stichproben quota: ceil(1% of ERP quantity total). */
export const stichprobenRequiredFromErpTotal = (total: number): number => {
  const safe = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0
  if (safe === 0) return 0
  return Math.ceil(safe / 100)
}

/** True when Stichprobe quota is met. */
export const isStichprobenComplete = (
  done: number,
  required: number
): boolean => done >= required

/** Map LotId grid rows back to serde DTOs for draft persistence. */
const lotIdGridToCompareRows = (
  rows: LotIdGridRow[]
): LotIdCompareRow[] =>
  rows.map((row, index) => ({
    artikelnummer: asString(row["Artikelnummer"]),
    produktname: asString(row["Produktname"]),
    kennzeichen_3: asString(row["Kennzeichen 3"]),
    lot_id: asString(row["LotId"]),
    eigenbestand_nach_erp: asString(row["Eigenbestand nach ERP"]),
    rfid_scan: asString(row["RFID-Scan"]),
    ablaufdatum: asString(row["Ablaufdatum"]),
    to_do: asString(row["To Do"]),
    anmerkung: asString(row["Anmerkung"]),
    stichprobe: asString(row["Stichprobe"]),
    id: asString(row.id) || `row-${index}`,
    index: asNumber(row.Index) || index,
  }))

/** Map ArtNr grid rows back to serde DTOs. */
const artNrGridToCompareRows = (
  rows: ArtNrGridRow[]
): ArtNrCompareRow[] =>
  rows.map((row) => ({
    artikelnummer: asString(row["Artikelnummer"]),
    produktname: asString(row["Produktname"]),
    eigenbestand_nach_erp: asNumber(row["Eigenbestand nach ERP"]),
    rfid_scan: asNumber(row["RFID-Scan"]),
    differenz: asNumber(row.Differenz),
    id: asString(row.id),
  }))

/** Sum Ax-Bestand ERP quantities for the 1% Stichproben guideline. */
export const sumErpQuantityTotal = (axBestand: ErpRow[]): number =>
  axBestand.reduce(
    (sum, row) => sum + erpQuantityAsNumber(row.eigenbestand_nach_erp),
    0
  )

/** Recompute editor stats from live LotId grid rows + Ax-Bestand. */
const computeEditorStatsFromLotIdGrid = (
  rows: LotIdGridRow[],
  axBestand: ErpRow[] = []
): EditorStats => {
  let abweichungen = 0
  let offene_todos = 0
  let stichproben_done = 0

  for (const row of rows) {
    const erp = asNumber(row["Eigenbestand nach ERP"])
    const rfid = asNumber(row["RFID-Scan"])
    if (erp !== rfid) abweichungen += 1
    if (asString(row["To Do"]).trim().length === 0) offene_todos += 1
    if (asString(row["Stichprobe"]).trim().toUpperCase() === "X") {
      stichproben_done += 1
    }
  }

  const erp_quantity_total = sumErpQuantityTotal(axBestand)
  const stichproben_required = stichprobenRequiredFromErpTotal(erp_quantity_total)

  return {
    abweichungen,
    offene_todos,
    stichproben_done,
    stichproben_required,
    erp_quantity_total,
  }
}

/** Build a durable EditorSnapshot from the live editor grid state. */
export const buildSnapshotFromEditorState = (args: {
  base: EditorSnapshot
  lotIdRows: LotIdGridRow[]
  artNrRows: ArtNrGridRow[]
  dirty?: boolean
}): EditorSnapshot => {
  const lot_id_rows = lotIdGridToCompareRows(args.lotIdRows)
  const art_nr_rows = artNrGridToCompareRows(args.artNrRows)
  const edited_ids = args.lotIdRows
    .filter((row) => Boolean(row.isEdited))
    .map((row) => asString(row.id))
    .filter(Boolean)

  return {
    ...args.base,
    lot_id_rows,
    art_nr_rows,
    dirty: args.dirty ?? edited_ids.length > 0,
    edited_ids,
    stats: computeEditorStatsFromLotIdGrid(args.lotIdRows, args.base.ax_bestand),
  }
}

export const runInventur = (erpPath: string, rfidPath: string) =>
  invoke<EditorSnapshot>("run_inventur", {
    erpPath,
    rfidPath,
  })

const loadAbgleich = (path: string) =>
  invoke<EditorSnapshot>("load_abgleich", { path })

/** Open dialog and load an existing Abgleich workbook. */
export const loadAbgleichFromDialog = async (): Promise<EditorSnapshot | null> => {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Excel", extensions: ["xlsx", "xls"] }],
    title: "Abgleich einlesen",
  })
  if (!selected || Array.isArray(selected)) {
    return null
  }
  return loadAbgleich(selected)
}

/** Map LotId DTOs to German column keys used by LotIdTable. */
export const lotIdRowsForGrid = (rows: LotIdCompareRow[]): LotIdGridRow[] =>
  rows.map((row) => ({
    Index: row.index,
    LotId: row.lot_id,
    Artikelnummer: row.artikelnummer,
    Produktname: row.produktname,
    "Kennzeichen 3": row.kennzeichen_3,
    Ablaufdatum: row.ablaufdatum,
    "Eigenbestand nach ERP": row.eigenbestand_nach_erp,
    "RFID-Scan": row.rfid_scan,
    "To Do": row.to_do,
    Anmerkung: row.anmerkung,
    Stichprobe: row.stichprobe,
    id: row.id,
  }))

/** Map ArtNr DTOs to German column keys. */
export const artNrRowsForGrid = (rows: ArtNrCompareRow[]) =>
  rows.map((row) => ({
    Artikelnummer: row.artikelnummer,
    Produktname: row.produktname,
    "Eigenbestand nach ERP": row.eigenbestand_nach_erp,
    "RFID-Scan": row.rfid_scan,
    Differenz: row.differenz,
    id: row.id,
  }))

/** Map ERP DTOs to German column keys. */
export const erpRowsForGrid = (rows: ErpRow[]) =>
  rows.map((row) => ({
    Artikelnummer: row.artikelnummer,
    Produktname: row.produktname,
    LotId: row.lot_id,
    "Kennzeichen 3": row.kennzeichen_3,
    Ablaufdatum: row.ablaufdatum,
    Debitorenkonto: row.debitorenkonto,
    "Eigenbestand nach ERP": row.eigenbestand_nach_erp,
  }))

/** Map RFID DTOs to German column keys. */
export const rfidRowsForGrid = (rows: RfidRow[]) =>
  rows.map((row) => ({
    GTIN: row.gtin,
    LotId: row.lot_id,
    "Kennung 1": row.kennung_1,
    Debitorennummer: row.debitorennummer,
    "Erfasst um": row.erfasst_um,
    Artikelnummer: row.artikelnummer,
    Produktname: row.produktname,
    "Kennzeichen 3": row.kennzeichen_3,
  }))

/** Map Offene Posten DTOs to German column keys (table and Excel sheet). */
export const offenePostenRowsForGrid = (
  rows: OffenePostenRow[]
): OffenePostenGridRow[] =>
  rows.map((row) => ({
    Artikelnummer: row.artikelnummer,
    Produktname: row.produktname,
    LotId: row.lot_id,
    Ablaufdatum: row.ablaufdatum,
    Offen: row.offen,
    id: row.id,
  }))
