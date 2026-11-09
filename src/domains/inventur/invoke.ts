import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import type { EditorSnapshot } from "@/domains/inventur/types"

export const runInventur = (erpPath: string, rfidPath: string) =>
  invoke<EditorSnapshot>("run_inventur", {
    erpPath,
    rfidPath,
  })

const loadAbgleich = (path: string) =>
  invoke<EditorSnapshot>("load_abgleich", { path })

/** Open dialog and load an existing Abgleich workbook. */
export const loadAbgleichFromDialog = async (): Promise<EditorSnapshot | null> => {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Excel", extensions: ["xlsx", "xls"] }],
    title: "Abgleich einlesen",
  })
  if (!selected || Array.isArray(selected)) {
    return null
  }
  return loadAbgleich(selected)
}
