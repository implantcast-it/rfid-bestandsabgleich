import { invoke } from "@tauri-apps/api/core"
import { save } from "@tauri-apps/plugin-dialog"
import { writeFile } from "@tauri-apps/plugin-fs"
import { exportAbgleichPdfFromRows } from "@/domains/pdf"
import type { EditorSnapshot } from "@/domains/inventur"

type ToastInfo = {
  open: boolean
  type: "success" | "error"
  title: string
  description: string
}

type SetToastInfo = (info: ToastInfo | null) => void

export type ExportOutcome = "success" | "cancelled" | "error"

type ExcelExportResult = {
  success: boolean
  filePath?: string
  error?: Error
  cancelled?: boolean
}

const saveAbgleichXlsxBytes = async (
  snapshot: EditorSnapshot
): Promise<ExcelExportResult> => {
  const suggestedFilename = `[${
    snapshot.debitor
  }] Bestandsabgleich ${new Date().toLocaleDateString("de-DE")}.xlsx`

  // Ask for the path first so the dialog opens immediately; generation can take a while.
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

  if (!filePath) {
    return { success: false, cancelled: true }
  }

  const xlsxBytes = await invoke<number[]>("export_abgleich_xlsx", { snapshot })
  await writeFile(filePath, new Uint8Array(xlsxBytes))
  return { success: true, filePath }
}

const toOutcome = (result: {
  success: boolean
  cancelled?: boolean
}): ExportOutcome => {
  if (result.success) return "success"
  if (result.cancelled) return "cancelled"
  return "error"
}

/** Excel export via Rust rust_xlsxwriter (same schema as Abgleich einlesen). */
export const handleSnapshotExcelDownload = async (
  snapshot: EditorSnapshot,
  setToastInfo: SetToastInfo
): Promise<ExportOutcome> => {
  try {
    const result = await saveAbgleichXlsxBytes(snapshot)

    if (result.success) {
      setToastInfo({
        open: true,
        type: "success",
        title: "Speichern erfolgreich",
        description: `Datei wurde gespeichert: ${result.filePath?.split(/[\\/]/).pop()}`,
      })
      return "success"
    }

    if (result.cancelled) return "cancelled"

    if (result.error) {
      setToastInfo({
        open: true,
        type: "error",
        title: "Speichern fehlgeschlagen",
        description:
          result.error.message || "Die Datei konnte nicht geschrieben werden.",
      })
    }
    return "error"
  } catch (err: unknown) {
    console.error("Fehler beim Speichern der Excel-Datei:", err)
    setToastInfo({
      open: true,
      type: "error",
      title: "Speichern fehlgeschlagen",
      description:
        (err as Error).message || "Die Datei konnte nicht geschrieben werden.",
    })
    return "error"
  }
}

export const handleSnapshotPdfDownload = async (
  snapshot: EditorSnapshot,
  lotIdRows: Record<string, unknown>[],
  setToastInfo: SetToastInfo
): Promise<ExportOutcome> => {
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
      return "success"
    }

    if (result.cancelled) return "cancelled"

    if (result.error) {
      setToastInfo({
        open: true,
        type: "error",
        title: "Speichern fehlgeschlagen",
        description:
          result.error.message || "Die PDF-Datei konnte nicht erstellt werden.",
      })
    }
    return toOutcome(result)
  } catch (err) {
    console.error("Fehler beim Erstellen der PDF:", err)
    setToastInfo({
      open: true,
      type: "error",
      title: "Speichern fehlgeschlagen",
      description:
        (err as Error).message || "Ein unbekannter Fehler ist aufgetreten.",
    })
    return "error"
  }
}
