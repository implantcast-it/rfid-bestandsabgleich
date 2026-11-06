import { utils, WorkBook, write } from "xlsx"
import { save } from "@tauri-apps/plugin-dialog"

import { downloadFile } from "./download"
import { exportAbgleichPdfFromRows } from "./pdf"
import { writeFile } from "@tauri-apps/plugin-fs"
import {
  OFFENE_POSTEN_EXCEL_HEADERS,
  lotIdGridRowsForExport,
  type EditorSnapshot,
  type LotIdGridRow,
} from "./inventur"

type ToastInfo = {
  open: boolean
  type: "success" | "error"
  title: string
  description: string
}

type SetToastInfo = (info: ToastInfo | null) => void

// Async handler for Excel download
const handleExcelDownload = async (
  results: { debitor: any; masterData: WorkBook },
  setToastInfo: SetToastInfo
) => {
  if (!results) return

  // 1. Generate suggested filename
  const suggestedFilename = `[${
    results.debitor
  }] Bestandsabgleich ${new Date().toLocaleDateString("de-DE")}.xlsx`

  try {
    // 2. Open Tauri's native "save" dialog
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

    // 3. If user cancels, filePath will be null
    if (filePath === null) {
      return // User canceled
    }

    // 4. Generate the workbook object (from your lib)
    const wb = downloadFile(results.masterData)

    // 5. Generate the binary data (Uint8Array) from the workbook
    const binaryData = write(wb, { bookType: "xlsx", type: "array" })

    // 6. Use Tauri's API to write the binary file to the chosen path
    await writeFile(filePath, binaryData)

    // 7. Show success toast
    setToastInfo({
      open: true,
      type: "success",
      title: "Speichern erfolgreich",
      description: `Datei wurde gespeichert: ${filePath.split(/[\\/]/).pop()}`, // Show only filename
    })
  } catch (err: any) {
    // 8. Show error toast on failure
    console.error("Fehler beim Speichern der Excel-Datei:", err)
    setToastInfo({
      open: true,
      type: "error",
      title: "Speichern fehlgeschlagen",
      description: err.message || "Die Datei konnte nicht geschrieben werden.",
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
