import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"

type ImportSheetStats = {
  inserted: number
  skipped_existing: number
  rows_read: number
}

export type ImportStats = {
  source_filename: string
  gtin: ImportSheetStats
  debitor: ImportSheetStats
}

export type CatalogStats = {
  gtin_count: number
  debitor_count: number
  last_import_filename: string | null
  last_import_at: string | null
}

export type CatalogReady = {
  gtin_ok: boolean
  debitor_ok: boolean
  ready: boolean
  stats: CatalogStats
}

export type DebitorEntry = {
  debitorenkonto: string
  kundenname: string
  postanschrift?: string
  plz?: string
  ort?: string
}

/** One-line address from catalog fields (empty parts omitted). */
const formatDebitorAddress = (
  entry: Pick<DebitorEntry, "postanschrift" | "plz" | "ort">
): string => {
  const street = (entry.postanschrift ?? "").trim()
  const plz = (entry.plz ?? "").trim()
  const ort = (entry.ort ?? "").trim()
  const cityLine = [plz, ort].filter(Boolean).join(" ")
  return [street, cityLine].filter(Boolean).join(", ")
}

/** Debitor id · name, with address on a second line when present. */
export const formatDebitorSummary = (entry: DebitorEntry): string => {
  const head = entry.kundenname
    ? `${entry.debitorenkonto} · ${entry.kundenname}`
    : entry.debitorenkonto
  const address = formatDebitorAddress(entry)
  return address ? `${head} · ${address}` : head
}

export const getCatalogStats = () => invoke<CatalogStats>("get_catalog_stats")

export const getCatalogReady = () => invoke<CatalogReady>("catalog_ready")

/** German banner copy when GTIN and/or Debitor catalogs are empty. */
export const catalogGateMessage = (ready: CatalogReady | null): string | null => {
  if (!ready || ready.ready) return null
  if (!ready.gtin_ok && !ready.debitor_ok) {
    return "Referenzkatalog unvollständig: GTIN-Liste und Debitoren fehlen. Bitte unter Einstellungen (Zahnrad) das Master-/Referenz-Excel importieren."
  }
  if (!ready.gtin_ok) {
    return "GTIN-Katalog ist leer. Bitte unter Einstellungen die GTIN-Liste importieren."
  }
  return "Debitoren-Katalog ist leer. Bitte unter Einstellungen die Debitorenliste importieren."
}

export const searchDebitors = (query: string, limit = 20) =>
  invoke<DebitorEntry[]>("search_debitors", { query, limit })

/** Open file dialog and import a reference workbook (sheets GTIN + Debitoren). */
export const importReferenceCatalogFromDialog = async (): Promise<ImportStats | null> => {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Excel", extensions: ["xlsx", "xls"] }],
    title: "Referenzkatalog importieren (GTIN + Debitoren)",
  })

  if (!selected || Array.isArray(selected)) {
    return null
  }

  return invoke<ImportStats>("import_reference_catalog", { path: selected })
}

export const formatImportSummary = (stats: ImportStats): string => {
  return [
    `Datei: ${stats.source_filename}`,
    `GTIN: ${stats.gtin.inserted} neu, ${stats.gtin.skipped_existing} bereits vorhanden`,
    `Debitoren: ${stats.debitor.inserted} neu, ${stats.debitor.skipped_existing} bereits vorhanden`,
  ].join(" · ")
}
