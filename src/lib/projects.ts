import { invoke } from "@tauri-apps/api/core"
import type { EditorSnapshot } from "./inventur"

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

export const createInventurProject = (
  snapshot: EditorSnapshot,
  input?: CreateProjectInput
) =>
  invoke<ProjectMeta>("create_inventur_project", {
    snapshot,
    input: input ?? null,
  })

export const listInventurProjects = () =>
  invoke<ProjectMeta[]>("list_inventur_projects")

export const loadInventurDraft = (id: string) =>
  invoke<LoadedProject>("load_inventur_draft", { id })

export const saveInventurDraft = (id: string, snapshot: EditorSnapshot) =>
  invoke<ProjectMeta>("save_inventur_draft", { id, snapshot })

export const updateInventurStatus = (id: string, status: ProjectStatus) =>
  invoke<ProjectMeta>("update_inventur_status", { id, status })

export const updateInventurTitle = (id: string, title: string) =>
  invoke<ProjectMeta>("update_inventur_title", { id, title })

export const deleteInventurProject = (id: string) =>
  invoke<void>("delete_inventur_project", { id })

/** Map project meta to inventuren hub card shape. */
export const projectMetaToInventurFile = (meta: ProjectMeta) => ({
  id: meta.id,
  title: meta.title,
  debitor: meta.debitor,
  plz: meta.plz,
  ort: meta.ort,
  inventurDate: meta.inventur_date,
  formats: `${meta.stichproben_done}/${meta.stichproben_required}`,
  date: formatRelativeUpdatedAt(meta.updated_at),
  status: meta.status,
})

/** Relative / short German label from an ISO timestamp. */
export const formatRelativeUpdatedAt = (iso: string): string => {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return iso
  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return "gerade eben"
  if (mins < 60) return `vor ${mins} Min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `vor ${hours} Std`
  const days = Math.floor(hours / 24)
  if (days < 7) return `vor ${days} Tag${days === 1 ? "" : "en"}`
  return new Date(then).toLocaleDateString("de-DE")
}
