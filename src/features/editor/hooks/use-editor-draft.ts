import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  buildSnapshotFromEditorState,
  type EditorSnapshot,
  type LotIdGridRow,
} from "@/domains/inventur"
import {
  loadInventurDraft,
  saveInventurDraft,
  updateInventurStatus,
  type ProjectStatus,
} from "@/domains/projects"
import type { AutosaveStatus } from "@/features/editor/MiniStats"

type UseEditorDraftArgs = {
  projectId: string
  snapshot: EditorSnapshot
  lotIdData: LotIdGridRow[]
  artNrData: Record<string, unknown>[]
}

export const useEditorDraft = ({
  projectId,
  snapshot,
  lotIdData,
  artNrData,
}: UseEditorDraftArgs) => {
  const [autosaveStatus, setAutosaveStatus] =
    useState<AutosaveStatus>("saved")
  const [savePending, setSavePending] = useState(false)
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>("open")
  const isDirtyRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    void loadInventurDraft(projectId)
      .then((loaded) => {
        if (!cancelled) setProjectStatus(loaded.meta.status)
      })
      .catch(() => {
        /* keep default open */
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  const markDirty = useCallback(() => {
    isDirtyRef.current = true
    setAutosaveStatus("idle")
  }, [])

  const buildLiveSnapshot = useCallback(
    () =>
      buildSnapshotFromEditorState({
        base: snapshot,
        lotIdRows: lotIdData,
        artNrRows: artNrData,
      }),
    [snapshot, lotIdData, artNrData]
  )

  const flushDraft = useCallback(
    async (opts?: { silent?: boolean; markExported?: boolean }) => {
      setSavePending(true)
      setAutosaveStatus("saving")
      try {
        await saveInventurDraft(projectId, buildLiveSnapshot())
        if (opts?.markExported) {
          await updateInventurStatus(projectId, "exported")
        }
        isDirtyRef.current = false
        setAutosaveStatus("saved")
        if (!opts?.silent) {
          toast.success("Gespeichert", {
            description: "Inventur-Entwurf wurde aktualisiert.",
          })
        }
        return true
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error)
        setAutosaveStatus("error")
        toast.error("Speichern fehlgeschlagen", { description: message })
        return false
      } finally {
        setSavePending(false)
      }
    },
    [projectId, buildLiveSnapshot]
  )

  return {
    autosaveStatus,
    setAutosaveStatus,
    savePending,
    projectStatus,
    setProjectStatus,
    isDirtyRef,
    markDirty,
    buildLiveSnapshot,
    flushDraft,
  }
}
