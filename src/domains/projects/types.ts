import type { EditorSnapshot } from "@/domains/inventur/types"

export type ProjectStatus = "open" | "exported" | "done"

export type ProjectMeta = {
  id: string
  title: string
  debitor: string
  plz: string
  ort: string
  inventur_date: string
  status: ProjectStatus
  updated_at: string
  last_export_at?: string | null
  stichproben_done: number
  stichproben_required: number
}

export type CreateProjectInput = {
  title?: string | null
  plz?: string | null
  ort?: string | null
  inventur_date?: string | null
}

export type LoadedProject = {
  meta: ProjectMeta
  snapshot: EditorSnapshot
}

export type FileStatus = ProjectStatus

/** Inventur library card — searchable by date, year, debitor, PLZ, city. */
export type InventurFile = {
  id: string
  /** Debitor / Kundenname shown as card title. */
  title: string
  /** Debitorenkonto / Debitor-ID. */
  debitor: string
  plz: string
  ort: string
  /** Inventurdatum as ISO `YYYY-MM-DD` (canonical for year / dd.mm.yyyy search). */
  inventurDate: string
  /** Stichprobe progress as `done/required` (required = ceil 1% ERP qty). */
  formats: string
  /** Relative / short updated-at label under the card. */
  date: string
  status: FileStatus
}
