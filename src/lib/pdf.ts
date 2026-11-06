import { invoke } from "@tauri-apps/api/core"
import { save } from "@tauri-apps/plugin-dialog"
import { writeFile } from "@tauri-apps/plugin-fs"
import type { OffenePostenRow } from "./inventur"

/** LotId row DTO matching Rust `LotIdCompareRow` (snake_case for serde). */
export type LotIdPdfRow = {
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

export type PdfExportInput = {
  debitor: string
  kundenname?: string
  lots: LotIdPdfRow[]
  /** Printed as a separate table; never counted in the totals. */
  offene_posten?: OffenePostenRow[]
  generated_at?: string
}

export type PdfExportResult = {
  success: boolean
  filePath?: string
  error?: Error
  cancelled?: boolean
}

type SheetLotRow = Record<string, unknown>

const asString = (value: unknown): string => {
  if (value === null || value === undefined) return ""
  return String(value)
}

const asIndex = (value: unknown): number => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Map SheetJS / editor LotId rows to the Rust PDF DTO. */
export const mapSheetRowsToPdfLots = (rows: SheetLotRow[]): LotIdPdfRow[] =>
  rows.map((row) => ({
    artikelnummer: asString(row.Artikelnummer),
    produktname: asString(row.Produktname),
    kennzeichen_3: asString(row["Kennzeichen 3"] ?? row.Kennzeichen),
    lot_id: asString(row.LotId),
    eigenbestand_nach_erp: asString(row["Eigenbestand nach ERP"]),
    rfid_scan: asString(row["RFID-Scan"]),
    ablaufdatum: asString(row.Ablaufdatum),
    to_do: asString(row["To Do"]),
    anmerkung: asString(row.Anmerkung),
    stichprobe: asString(row.Stichprobe),
    id: asString(row.id),
    index: asIndex(row.Index),
  }))

const savePdfBytes = async (
  input: PdfExportInput,
  debitor: string
): Promise<PdfExportResult> => {
  const pdfBytes = await invoke<number[]>("export_abgleich_pdf", { input })
  const binary = new Uint8Array(pdfBytes)

  const suggestedFilename = `[${debitor}] Bestandsabgleich - ${new Date().toLocaleDateString("de-DE")}.pdf`

  const filePath = await save({
    title: "Bestandsabgleich speichern",
    defaultPath: suggestedFilename,
    filters: [
      {
        name: "PDF-Dokument",
        extensions: ["pdf"],
      },
    ],
  })

  if (!filePath) {
    return { success: false, cancelled: true }
  }

  await writeFile(filePath, binary)
  return { success: true, filePath }
}

/** PDF export from editor LotId grid rows (EditorSnapshot path). */
export const exportAbgleichPdfFromRows = async (data: {
  debitor: string
  kundenname?: string
  lotIdRows: SheetLotRow[]
  offenePosten?: OffenePostenRow[]
}): Promise<PdfExportResult> => {
  try {
    const lots = mapSheetRowsToPdfLots(data.lotIdRows)
    return await savePdfBytes(
      {
        debitor: String(data.debitor ?? "Unbekannt"),
        kundenname: data.kundenname ?? "",
        lots,
        offene_posten: data.offenePosten ?? [],
      },
      String(data.debitor ?? "Unbekannt")
    )
  } catch (err) {
    console.error("Error saving PDF:", err)
    return { success: false, error: err as Error, cancelled: false }
  }
}

/**
 * Download a blank Bestätigungsformular PDF for printing form stacks.
 */
export const exportBestaetigungPdf = async (): Promise<PdfExportResult> => {
  try {
    const pdfBytes = await invoke<number[]>("export_bestaetigung_pdf")
    const binary = new Uint8Array(pdfBytes)

    const filePath = await save({
      title: "Bestätigungsformular speichern",
      defaultPath: "Bestätigungsformular Inventur.pdf",
      filters: [
        {
          name: "PDF-Dokument",
          extensions: ["pdf"],
        },
      ],
    })

    if (!filePath) {
      return { success: false, cancelled: true }
    }

    await writeFile(filePath, binary)
    return { success: true, filePath }
  } catch (err) {
    console.error("Error saving Bestätigungsformular:", err)
    return { success: false, error: err as Error, cancelled: false }
  }
}
