import type {
  ErpRow,
  LotIdCompareRow,
  LotIdGridRow,
  OffenePostenGridRow,
  OffenePostenRow,
  RfidRow,
} from "@/domains/inventur/types";

import { buildIdentitySearchText } from "@/domains/inventur/search";
import { toAblaufdatumTimestamp } from "@/core/utils/ablaufdatum";

const asString = (value: unknown): string => {
  if (value == null) return "";
  return String(value);
};

const asNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** Map LotId DTOs to German column keys used by LotIdTable. */
export const lotIdRowsForGrid = (rows: LotIdCompareRow[]): LotIdGridRow[] =>
  rows.map((row) => ({
    Index: row.index,
    LotId: row.lot_id,
    Artikelnummer: row.artikelnummer,
    Produktname: row.produktname,
    "Kennzeichen 3": row.kennzeichen_3,
    Ablaufdatum: row.ablaufdatum,
    "Eigenbestand nach ERP": row.erp,
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
  }));

/** Map LotId grid rows back to serde DTOs for draft persistence / Rust autos. */
export const lotIdGridToCompareRows = (
  rows: LotIdGridRow[],
): LotIdCompareRow[] =>
  rows.map((row, index) => ({
    artikelnummer: asString(row["Artikelnummer"]),
    produktname: asString(row["Produktname"]),
    kennzeichen_3: asString(row["Kennzeichen 3"]),
    lot_id: asString(row["LotId"]),
    erp: asString(row["Eigenbestand nach ERP"]),
    rfid_scan: asString(row["RFID-Scan"]),
    ablaufdatum: asString(row["Ablaufdatum"]),
    to_do: asString(row["To Do"]),
    anmerkung: asString(row["Anmerkung"]),
    stichprobe: asString(row["Stichprobe"]),
    id: asString(row.id) || `row-${index}`,
    index: asNumber(row.Index) || index,
  }));

/** Apply Rust auto-action rows onto the live LotId grid (preserve UI-only fields). */
export const applyAutoLotIdRows = (
  current: LotIdGridRow[],
  nextRows: LotIdCompareRow[],
): LotIdGridRow[] => {
  const byId = new Map(nextRows.map((row) => [row.id, row]));
  return current.map((row) => {
    const next = byId.get(asString(row.id));
    if (!next) return row;

    const rfidChanged = asString(row["RFID-Scan"]) !== next.rfid_scan;
    const todoChanged = asString(row["To Do"]) !== next.to_do;
    const anmerkungChanged = asString(row["Anmerkung"]) !== next.anmerkung;
    const stichprobeChanged = asString(row["Stichprobe"]) !== next.stichprobe;
    if (
      !rfidChanged &&
      !todoChanged &&
      !anmerkungChanged &&
      !stichprobeChanged
    ) {
      return row;
    }

    return {
      ...row,
      "RFID-Scan": next.rfid_scan,
      "To Do": next.to_do,
      Anmerkung: next.anmerkung,
      Stichprobe: next.stichprobe,
      isEdited: true,
    };
  });
};

/** Map ERP DTOs to German column keys. */
export const erpRowsForGrid = (rows: ErpRow[]) =>
  rows.map((row) => ({
    Artikelnummer: row.artikelnummer,
    Produktname: row.produktname,
    LotId: row.lot_id,
    "Kennzeichen 3": row.kennzeichen_3,
    Ablaufdatum: row.ablaufdatum,
    Debitorenkonto: row.debitorenkonto,
    "Eigenbestand nach ERP": row.erp,
  }));

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
  }));

/** Map Offene Posten DTOs to German column keys (table and Excel sheet). */
export const offenePostenRowsForGrid = (
  rows: OffenePostenRow[],
): OffenePostenGridRow[] =>
  rows.map((row) => ({
    Artikelnummer: row.artikelnummer,
    Produktname: row.produktname,
    LotId: row.lot_id,
    Ablaufdatum: row.ablaufdatum,
    Offen: row.offen,
    id: row.id,
  }));
