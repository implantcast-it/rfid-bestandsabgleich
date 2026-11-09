import { toAblaufdatumTimestamp } from "@/core/utils/ablaufdatum"
import { buildIdentitySearchText } from "@/domains/inventur/search"
import type {
  ErpRow,
  LotIdCompareRow,
  LotIdGridRow,
  OffenePostenGridRow,
  OffenePostenRow,
  RfidRow,
} from "@/domains/inventur/types"

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
    searchText: buildIdentitySearchText([
      row.lot_id,
      row.artikelnummer,
      row.produktname,
      row.kennzeichen_3,
    ]),
    ablaufdatumTimestamp: toAblaufdatumTimestamp(row.ablaufdatum),
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
