import { lotIdGridToCompareRows } from "@/domains/inventur/mappers"
import type {
  ArtNrGridRow,
  EditorSnapshot,
  EditorStats,
  ErpRow,
  ArtNrCompareRow,
  LotIdGridRow,
} from "@/domains/inventur/types"

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

/** Map ArtNr grid rows back to serde DTOs. */
const artNrGridToCompareRows = (rows: ArtNrGridRow[]): ArtNrCompareRow[] =>
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
