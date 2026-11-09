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

type ExcelExportResult = {
  success: boolean
  filePath?: string
  error?: Error
  cancelled?: boolean
}

const saveAbgleichXlsxBytes = async (
  snapshot: EditorSnapshot
): Promise<ExcelExportResult> => {
  const xlsxBytes = await invoke<number[]>("export_abgleich_xlsx", { snapshot })
  const binary = new Uint8Array(xlsxBytes)

  const suggestedFilename = `[${
    snapshot.debitor
  }] Bestandsabgleich ${new Date().toLocaleDateString("de-DE")}.xlsx`

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

  await writeFile(filePath, binary)
  return { success: true, filePath }
}

/** Excel export via Rust rust_xlsxwriter (same schema as Abgleich einlesen). */
export const handleSnapshotExcelDownload = async (
  snapshot: EditorSnapshot,
  setToastInfo: SetToastInfo
) => {
  try {
    const result = await saveAbgleichXlsxBytes(snapshot)

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
          result.error.message || "Die Datei konnte nicht geschrieben werden.",
      })
    }
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
