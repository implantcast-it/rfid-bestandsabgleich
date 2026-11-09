import type { LotIdGridRow } from "@/domains/inventur/types"

export type LotIdRowPatch = Partial<LotIdGridRow> & Record<string, unknown>

export type AutofillKommentareResult = {
  changes: Map<string, LotIdRowPatch>
  affectedArtikelnummern: string[]
}

export type AutoSiebeResult = {
  changes: Map<string, LotIdRowPatch>
  siebRowCount: number
  offenePostenRowCount: number
}

const asLooseNumber = (value: unknown): number => {
  const n = Number(value)
  return Number.isFinite(n) ? n : NaN
}

const isToDoEmpty = (row: LotIdGridRow) => {
  const todo = row["To Do"]
  return !todo || todo.trim() === ""
}

/** Paired To-Do comments for missing/scanned lots under the same Artikelnummer. */
export const computeAutofillKommentare = (
  rows: LotIdGridRow[]
): AutofillKommentareResult => {
  const grouped: Record<string, LotIdGridRow[]> = {}
  for (const row of rows) {
    const key = row.Artikelnummer
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(row)
  }

  const affectedArtikelnummern: string[] = []
  const changes = new Map<string, LotIdRowPatch>()

  for (const [artikelnummer, group] of Object.entries(grouped)) {
    const missingItems = group.filter(
      (row) =>
        asLooseNumber(row["RFID-Scan"]) === 0 &&
        asLooseNumber(row["Eigenbestand nach ERP"]) === 1
    )
    const scannedItems = group.filter(
      (row) =>
        asLooseNumber(row["RFID-Scan"]) === 1 &&
        asLooseNumber(row["Eigenbestand nach ERP"]) === 0
    )

    const numPairs = Math.min(missingItems.length, scannedItems.length)
    if (numPairs <= 0) continue

    let changesMadeForThisArticle = false
    for (let i = 0; i < numPairs; i++) {
      const missing = missingItems[i]
      const scanned = scannedItems[i]
      if (isToDoEmpty(missing) && isToDoEmpty(scanned)) {
        changes.set(missing.id, {
          "To Do": "interne Berechnung",
          isEdited: true,
        })
        changes.set(scanned.id, {
          "To Do": "interne Gutschrift mit Rückbuchung auf Konsi",
          isEdited: true,
        })
        changesMadeForThisArticle = true
      }
    }

    if (changesMadeForThisArticle) {
      affectedArtikelnummern.push(artikelnummer)
    }
  }

  return { changes, affectedArtikelnummern }
}

/** Mark SIEB/INST rows scanned and annotate zero/zero rows as offener Posten. */
export const computeAutoSiebeAndOffenePosten = (
  rows: LotIdGridRow[]
): AutoSiebeResult => {
  const changes = new Map<string, LotIdRowPatch>()
  let siebRowCount = 0
  let offenePostenRowCount = 0

  for (const row of rows) {
    if (
      row["Kennzeichen 3"] === "SIEB" ||
      (row["Kennzeichen 3"] === "INST" && asLooseNumber(row["RFID-Scan"]) === 0)
    ) {
      const existing = changes.get(row.id) || {}
      changes.set(row.id, {
        ...existing,
        "RFID-Scan": "1",
        isEdited: true,
      })
      siebRowCount++
    }

    if (
      asLooseNumber(row["RFID-Scan"]) === 0 &&
      asLooseNumber(row["Eigenbestand nach ERP"]) === 0
    ) {
      const existing = changes.get(row.id) || {}
      changes.set(row.id, {
        ...existing,
        Anmerkung: "offener Posten",
        isEdited: true,
      })
      offenePostenRowCount++
    }
  }

  return { changes, siebRowCount, offenePostenRowCount }
}

export const applyLotIdPatches = (
  rows: LotIdGridRow[],
  changes: Map<string, LotIdRowPatch>
): LotIdGridRow[] =>
  rows.map((row) => {
    if (!changes.has(row.id)) return row
    return { ...row, ...changes.get(row.id) } as LotIdGridRow
  })
