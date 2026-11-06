import type { RowData } from "@tanstack/react-table"
import type {
  DataTableFilterFn,
  DataTableRow,
} from "@/lib/data-table-features"

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
 * Query normalization shared by every global search filter. TanStack applies
 * it once per filter run and passes the result to the filter function.
 */
const resolveSearchQuery = (filterValue: unknown) =>
  normalizeSearchText(String(filterValue ?? ""))

/**
 * Identity text for the global search: each field is normalized and the fields
 * are joined with a line break, which the single-line search input cannot
 * contain, so a query never matches across two fields.
 */
export const buildIdentitySearchText = (values: readonly unknown[]) =>
  values.map((value) => normalizeSearchText(String(value ?? ""))).join("\n")

/**
 * TanStack global filter that only matches identity fields
 * (LotId / Artikelnummer / Produktname / …), with umlaut folding.
 */
export const createIdentityGlobalFilterFn = <TData extends RowData>(
  fields: readonly string[]
): DataTableFilterFn<TData> => {
  const filterFn: DataTableFilterFn<TData> = (
    row: DataTableRow<TData>,
    _columnId: string,
    query: string
  ) => {
    if (!query) return true

    const original = row.original as Record<string, unknown>
    return fields.some((field) =>
      normalizeSearchText(String(original[field] ?? "")).includes(query)
    )
  }
  filterFn.resolveFilterValue = resolveSearchQuery
  return filterFn
}

/**
 * TanStack global filter over the precomputed `searchText` of each row
 * (see `buildIdentitySearchText`). Pair it with a single global column so the
 * filter runs once per row.
 */
export const createSearchTextGlobalFilterFn = <
  TData extends RowData & { searchText: string }
>(): DataTableFilterFn<TData> => {
  const filterFn: DataTableFilterFn<TData> = (
    row: DataTableRow<TData>,
    _columnId: string,
    query: string
  ) => {
    if (!query) return true
    return row.original.searchText.includes(query)
  }
  filterFn.resolveFilterValue = resolveSearchQuery
  return filterFn
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
