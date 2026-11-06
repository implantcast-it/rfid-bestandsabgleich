import type { FilterFn, Row } from "@tanstack/react-table"

/** Fold umlauts so "sued" / "muenchen" style queries still hit. */
export const normalizeSearchText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")

/**
 * TanStack global filter that only matches identity fields
 * (LotId / Artikelnummer / Produktname / …), with umlaut folding.
 */
export const createIdentityGlobalFilterFn = <TData>(
  fields: readonly string[]
): FilterFn<TData> => {
  return (row: Row<TData>, _columnId: string, filterValue: unknown) => {
    const query = normalizeSearchText(String(filterValue ?? ""))
    if (!query) return true

    const original = row.original as Record<string, unknown>
    return fields.some((field) =>
      normalizeSearchText(String(original[field] ?? "")).includes(query)
    )
  }
}

export type LotIdStatusFilter = "all" | "abweichung" | "offen" | "stichprobe"

const asNumber = (value: unknown) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** ERP ≠ RFID presence flags. */
export const isLotIdAbweichung = (row: Record<string, unknown>) =>
  asNumber(row["Eigenbestand nach ERP"]) !== asNumber(row["RFID-Scan"])

/** Violet rule: Abweichung and empty To Do. */
export const isLotIdOffenerTodo = (row: Record<string, unknown>) =>
  isLotIdAbweichung(row) && String(row["To Do"] ?? "").trim().length === 0

const isLotIdOhneStichprobe = (row: Record<string, unknown>) =>
  String(row["Stichprobe"] ?? "")
    .trim()
    .toUpperCase() !== "X"

export const matchesLotIdStatus = (
  row: Record<string, unknown>,
  filter: LotIdStatusFilter
) => {
  if (filter === "all") return true
  if (filter === "abweichung") return isLotIdAbweichung(row)
  if (filter === "offen") return isLotIdOffenerTodo(row)
  return isLotIdOhneStichprobe(row)
}
