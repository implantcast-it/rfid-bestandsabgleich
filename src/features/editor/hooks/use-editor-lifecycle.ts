import { toast } from "sonner"
import { useLocation } from "wouter"
import { updateInventurStatus, type ProjectStatus } from "@/domains/projects"

type UseEditorLifecycleArgs = {
  projectId: string
  projectStatus: ProjectStatus
  setProjectStatus: (status: ProjectStatus) => void
  clearAutosaveTimer: () => void
  flushDraft: (opts?: { silent?: boolean }) => Promise<boolean>
  assertStichprobenGate: (actionLabel: string) => boolean
}

export const useEditorLifecycle = ({
  projectId,
  projectStatus,
  setProjectStatus,
  clearAutosaveTimer,
  flushDraft,
  assertStichprobenGate,
}: UseEditorLifecycleArgs) => {
  const [, setLocation] = useLocation()

  const handleMarkDone = async () => {
    if (projectStatus === "done") return
    if (!assertStichprobenGate("Fertig melden")) return
    clearAutosaveTimer()
    const ok = await flushDraft({ silent: true })
    if (!ok) {
      toast.error("Fertig melden abgebrochen", {
        description:
          "Der Entwurf konnte nicht gespeichert werden. Bitte erneut speichern.",
      })
      return
    }
    try {
      await updateInventurStatus(projectId, "done")
      setProjectStatus("done")
      toast.success("Inventur fertig", {
        description: "Status wurde auf Fertig gesetzt.",
      })
      setLocation("/")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.error("Fertig melden fehlgeschlagen", { description: message })
    }
  }

  const handleClose = async () => {
    clearAutosaveTimer()
    const ok = await flushDraft({ silent: true })
    if (!ok) {
      toast.error("Schließen abgebrochen", {
        description:
          "Der Entwurf konnte nicht gespeichert werden. Bitte erneut speichern.",
      })
      return
    }
    if (projectStatus !== "exported" && projectStatus !== "done") {
      try {
        await updateInventurStatus(projectId, "open")
      } catch (error) {
        console.error("Status Offen konnte nicht gesetzt werden:", error)
      }
    }
    setLocation("/")
  }

  return { handleMarkDone, handleClose }
}
