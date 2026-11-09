import { invoke } from "@tauri-apps/api/core"
import type { EditorSnapshot } from "@/domains/inventur/types"
import type {
  CreateProjectInput,
  LoadedProject,
  ProjectMeta,
  ProjectStatus,
} from "@/domains/projects/types"

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
