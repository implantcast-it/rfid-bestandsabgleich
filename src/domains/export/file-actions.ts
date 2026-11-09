import { utils, WorkBook, write } from "xlsx"
import { save } from "@tauri-apps/plugin-dialog"
import { writeFile } from "@tauri-apps/plugin-fs"
import { downloadFile } from "@/domains/export/download"
import { exportAbgleichPdfFromRows } from "@/domains/pdf"
import {
  OFFENE_POSTEN_EXCEL_HEADERS,
  lotIdGridRowsForExport,
  type EditorSnapshot,
  type LotIdGridRow,
} from "@/domains/inventur"

type ToastInfo = {
  open: boolean
  type: "success" | "error"
  title: string
  description: string
}

type SetToastInfo = (info: ToastInfo | null) => void

const handleExcelDownload = async (
  results: { debitor: unknown; masterData: WorkBook },
  setToastInfo: SetToastInfo
) => {
  if (!results) return

  const suggestedFilename = `[${
    results.debitor
  }] Bestandsabgleich ${new Date().toLocaleDateString("de-DE")}.xlsx`

  try {
    const filePath = await save({
      title: "Excel-Vergleich speichern",
      defaultPath: suggestedFilename,
      filters: [
        {
          name: "Excel-Arbeitsmappe",
          extensions: ["xlsx"],
        },
      ],
    })

    if (filePath === null) {
      return
    }

    const wb = downloadFile(results.masterData)
    const binaryData = write(wb, { bookType: "xlsx", type: "array" })
    await writeFile(filePath, binaryData)

    setToastInfo({
      open: true,
      type: "success",
      title: "Speichern erfolgreich",
      description: `Datei wurde gespeichert: ${filePath.split(/[\\/]/).pop()}`,
    })
  } catch (err: unknown) {
    console.error("Fehler beim Speichern der Excel-Datei:", err)
    setToastInfo({
      open: true,
      type: "error",
      title: "Speichern fehlgeschlagen",
      description:
        (err as Error).message || "Die Datei konnte nicht geschrieben werden.",
    })
  }
}

/** Editor grid rows, one entry per Excel sheet. */
type AbgleichSheets = {
  lotIdRows: LotIdGridRow[]
  artNrRows: Record<string, unknown>[]
  erpRows: Record<string, unknown>[]
  rfidRows: Record<string, unknown>[]
  offenePostenRows: Record<string, unknown>[]
}

/** Build a SheetJS workbook from editable editor grids (Excel download). */
const buildAbgleichWorkbook = (args: AbgleichSheets): WorkBook => {
  const wb = utils.book_new()
  utils.book_append_sheet(
    wb,
    utils.json_to_sheet(lotIdGridRowsForExport(args.lotIdRows)),
    "Bestandsabgleich LotId"
  )
  utils.book_append_sheet(
    wb,
    utils.json_to_sheet(args.artNrRows),
    "Bestandsabgleich Artikelnummer"
  )
  utils.book_append_sheet(wb, utils.json_to_sheet(args.erpRows), "Ax-Bestand")
  utils.book_append_sheet(wb, utils.json_to_sheet(args.rfidRows), "RFID-Scan")
  utils.book_append_sheet(
    wb,
    utils.json_to_sheet(args.offenePostenRows, {
      header: OFFENE_POSTEN_EXCEL_HEADERS,
    }),
    "Offene Posten"
  )
  return wb
}

export const handleSnapshotExcelDownload = async (
  snapshot: EditorSnapshot,
  sheets: AbgleichSheets,
  setToastInfo: SetToastInfo
) => {
  const masterData = buildAbgleichWorkbook(sheets)
  await handleExcelDownload(
    { debitor: snapshot.debitor, masterData },
    setToastInfo
  )
}

export const handleSnapshotPdfDownload = async (
  snapshot: EditorSnapshot,
  lotIdRows: Record<string, unknown>[],
  setToastInfo: SetToastInfo
) => {
  try {
    const result = await exportAbgleichPdfFromRows({
      debitor: snapshot.debitor,
      kundenname: snapshot.kundenname,
      lotIdRows,
      offenePosten: snapshot.offene_posten,
    })

    if (result.success) {
      setToastInfo({
        open: true,
        type: "success",
        title: "Speichern erfolgreich",
        description: `Datei wurde gespeichert: ${result.filePath?.split(/[\\/]/).pop()}`,
      })
      return
    }

    if (result.cancelled) return

    if (result.error) {
      setToastInfo({
        open: true,
        type: "error",
        title: "Speichern fehlgeschlagen",
        description:
          result.error.message || "Die PDF-Datei konnte nicht erstellt werden.",
      })
    }
  } catch (err) {
    console.error("Fehler beim Erstellen der PDF:", err)
    setToastInfo({
      open: true,
      type: "error",
      title: "Speichern fehlgeschlagen",
      description:
        (err as Error).message || "Ein unbekannter Fehler ist aufgetreten.",
    })
  }
}
