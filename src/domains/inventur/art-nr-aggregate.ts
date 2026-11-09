import type { ArtNrAggregateRow, LotIdGridRow } from "@/domains/inventur/types"

const asNumber = (value: unknown): number => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Aggregate LotId grid rows per Artikelnummer; rows without Artikelnummer are skipped. */
export const artNrAggregateRowsFromLotId = (
  rows: LotIdGridRow[]
): ArtNrAggregateRow[] => {
  const aggregateByArtikelnummer: Record<string, ArtNrAggregateRow> = {}
  for (const row of rows) {
    const artikelnummer = row.Artikelnummer
    if (!artikelnummer) continue

    const aggregate = aggregateByArtikelnummer[artikelnummer] ?? {
      Artikelnummer: artikelnummer,
      Produktname: row.Produktname,
      "Eigenbestand nach ERP": 0,
      "RFID-Scan": 0,
      Differenz: 0,
      id: artikelnummer,
    }
    aggregate["Eigenbestand nach ERP"] += asNumber(row["Eigenbestand nach ERP"])
    aggregate["RFID-Scan"] += asNumber(row["RFID-Scan"])
    aggregate.Differenz =
      aggregate["RFID-Scan"] - aggregate["Eigenbestand nach ERP"]
    aggregateByArtikelnummer[artikelnummer] = aggregate
  }
  return Object.values(aggregateByArtikelnummer)
}
