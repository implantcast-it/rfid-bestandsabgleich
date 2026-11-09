import { Channel, invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import type { InventurProgressEvent } from "@/domains/inventur/progress"
import type {
  EditorSnapshot,
  LotIdCompareRow,
} from "@/domains/inventur/types"

/** Mirrors Rust `AutoKommentareResult`. */
export type AutoKommentareResult = {
  rows: LotIdCompareRow[]
  affected_artikelnummern: string[]
  changed_count: number
}

/** Mirrors Rust `AutoSiebeResult`. */
export type AutoSiebeResult = {
  rows: LotIdCompareRow[]
  sieb_inst_row_count: number
}

export const runInventur = (
  erpPath: string,
  rfidPath: string,
  onProgress?: (event: InventurProgressEvent) => void
) => {
  const onProgressChannel = new Channel<InventurProgressEvent>()
  onProgressChannel.onmessage = (event) => {
    onProgress?.(event)
  }

  return invoke<EditorSnapshot>("run_inventur", {
    erpPath,
    rfidPath,
    onProgress: onProgressChannel,
  })
}

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

/** Pair missing ↔ extra lots with To Dos (Auto-Kommentare). */
export const autoFillKommentare = (rows: LotIdCompareRow[]) =>
  invoke<AutoKommentareResult>("auto_fill_kommentare", { rows })

/** Force RFID presence for SIEB / missing INST lots. */
export const autoSiebe = (rows: LotIdCompareRow[]) =>
  invoke<AutoSiebeResult>("auto_siebe", { rows })
