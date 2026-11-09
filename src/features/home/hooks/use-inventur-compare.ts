import { useCallback, useState } from "react"
import { toast } from "sonner"
import {
  catalogGateMessage,
  formatDebitorSummary,
  searchDebitors,
  type CatalogReady,
  type DebitorEntry,
} from "@/domains/catalog"
import {
  applyInventurProgress,
  INITIAL_PIPELINE_STEPS,
  loadAbgleichFromDialog,
  markActiveStepFailed,
  runInventur,
  type EditorSnapshot,
  type InventurProgressEvent,
  type InventurSessionState,
  type PipelineStepState,
  type ProcessPhase,
} from "@/domains/inventur"
import {
  createInventurProject,
  loadInventurDraft,
  type ProjectMeta,
} from "@/domains/projects"

const formatDebitorLabel = (
  snapshot: EditorSnapshot | null,
  entry: DebitorEntry | null
) => {
  if (entry) return formatDebitorSummary(entry)
  if (!snapshot) return "—"
  if (snapshot.kundenname && snapshot.kundenname !== snapshot.debitor) {
    return `${snapshot.debitor} · ${snapshot.kundenname}`
  }
  return snapshot.debitor || "—"
}

const openEditorSession = (
  setLocation: (to: string, options?: { state?: InventurSessionState }) => void,
  meta: ProjectMeta,
  snapshot: EditorSnapshot,
  inventurjahr: string
) => {
  const state: InventurSessionState = {
    projectId: meta.id,
    snapshot,
    projectTitle: meta.title,
    inventurjahr,
  }
  setLocation("/editor", { state })
}

type UseInventurCompareArgs = {
  inventurjahr: string
  catalogReady: CatalogReady | null
  erpPath: string | null
  rfidPath: string | null
  setLocation: (to: string, options?: { state?: InventurSessionState }) => void
  refreshProjects: () => Promise<void>
}

export const useInventurCompare = ({
  inventurjahr,
  catalogReady,
  erpPath,
  rfidPath,
  setLocation,
  refreshProjects,
}: UseInventurCompareArgs) => {
  const [processPhase, setProcessPhase] = useState<ProcessPhase | null>(null)
  const [processTitle, setProcessTitle] = useState("Abgleich läuft")
  const [processStatus, setProcessStatus] = useState("")
  const [processPercent, setProcessPercent] = useState(0)
  const [progressLabel, setProgressLabel] = useState("Vorbereitung")
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStepState[]>(
    INITIAL_PIPELINE_STEPS
  )
  const [snapshot, setSnapshot] = useState<EditorSnapshot | null>(null)
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null)
  const [debitorEntry, setDebitorEntry] = useState<DebitorEntry | null>(null)
  const [loadingAbgleich, setLoadingAbgleich] = useState(false)

  const handleProgressEvent = useCallback((event: InventurProgressEvent) => {
    setPipelineSteps((previous) => applyInventurProgress(previous, event))
    setProcessPercent(event.percent)
    setProgressLabel(event.label)
    setProcessStatus(event.message)
  }, [])

  const resolveDebitorEntry = useCallback(async (debitorId: string) => {
    const id = debitorId.trim()
    if (!id) {
      setDebitorEntry(null)
      return null
    }
    try {
      const hits = await searchDebitors(id, 20)
      const exact =
        hits.find((row) => row.debitorenkonto.trim() === id) ?? null
      setDebitorEntry(exact)
      return exact
    } catch (error) {
      console.error("Debitor-Details nicht geladen:", error)
      setDebitorEntry(null)
      return null
    }
  }, [])

  const createProjectFromSnapshot = useCallback(
    async (result: EditorSnapshot, entry: DebitorEntry | null) => {
      const title =
        entry?.kundenname ||
        (result.kundenname && result.kundenname !== result.debitor
          ? result.kundenname
          : result.debitor) ||
        "Inventur"
      return createInventurProject(result, {
        title,
        plz: entry?.plz ?? "",
        ort: entry?.ort ?? "",
        inventur_date: new Date().toISOString().slice(0, 10),
      })
    },
    []
  )

  const handleStartCompare = async () => {
    if (!erpPath || !rfidPath) return

    const gate = catalogGateMessage(catalogReady)
    if (gate) {
      toast.error("Katalog nicht bereit", { description: gate })
      return
    }

    setSnapshot(null)
    setPendingProjectId(null)
    setDebitorEntry(null)
    setPipelineSteps(INITIAL_PIPELINE_STEPS)
    setProcessPhase("processing")
    setProcessTitle("Abgleich läuft")
    setProcessStatus("Pipeline wird gestartet…")
    setProgressLabel("Vorbereitung")
    setProcessPercent(0)

    try {
      const result = await runInventur(erpPath, rfidPath, handleProgressEvent)

      setProgressLabel("Ergebnis bereit")
      setProcessStatus("Inventur-Projekt wird gespeichert…")
      setProcessPercent(95)
      setPipelineSteps(["done", "done", "done", "active"])

      const entry = await resolveDebitorEntry(result.debitor)
      const meta = await createProjectFromSnapshot(result, entry)
      setSnapshot(result)
      setPendingProjectId(meta.id)
      await refreshProjects()

      setPipelineSteps(["done", "done", "done", "done"])
      setProcessPercent(100)
      setProgressLabel("Fertig")
      setProcessTitle("Abgleich abgeschlossen")
      setProcessStatus(
        `${result.lot_id_rows.length} LotId-Zeilen · ${result.art_nr_rows.length} Artikel`
      )
      setProcessPhase("success")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error)
      setPipelineSteps((previous) => markActiveStepFailed(previous))
      setProcessTitle("Abgleich fehlgeschlagen")
      setProcessStatus(message)
      setProgressLabel("Fehler")
      setProcessPhase("error")
      toast.error("Abgleich fehlgeschlagen", { description: message })
    }
  }

  const handleRetry = () => {
    setProcessPhase(null)
    setProcessPercent(0)
    setProcessStatus("")
    setProgressLabel("Vorbereitung")
    setPipelineSteps(INITIAL_PIPELINE_STEPS)
    setSnapshot(null)
    setPendingProjectId(null)
    setDebitorEntry(null)
  }

  const handleOpenEditor = () => {
    if (!snapshot || !pendingProjectId) return
    const title =
      debitorEntry?.kundenname ||
      snapshot.kundenname ||
      snapshot.debitor ||
      "Inventur"
    const state: InventurSessionState = {
      projectId: pendingProjectId,
      snapshot,
      projectTitle: title,
      inventurjahr,
    }
    setLocation("/editor", { state })
  }

  const handleOpenExisting = async () => {
    setLoadingAbgleich(true)
    try {
      const result = await loadAbgleichFromDialog()
      if (!result) return
      const entry = await resolveDebitorEntry(result.debitor)
      const meta = await createProjectFromSnapshot(result, entry)
      await refreshProjects()
      toast.success("Einlesen erfolgreich", {
        description: "Abgleich geladen — Editor wird geöffnet.",
      })
      openEditorSession(setLocation, meta, result, inventurjahr)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error)
      toast.error("Einlesen fehlgeschlagen", { description: message })
    } finally {
      setLoadingAbgleich(false)
    }
  }

  const handleOpenInventur = async (id: string) => {
    try {
      const loaded = await loadInventurDraft(id)
      openEditorSession(
        setLocation,
        loaded.meta,
        loaded.snapshot,
        inventurjahr
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error)
      toast.error("Inventur konnte nicht geöffnet werden", {
        description: message,
      })
    }
  }

  return {
    processPhase,
    processTitle,
    processStatus,
    processPercent,
    progressLabel,
    pipelineSteps,
    loadingAbgleich,
    debitorLabel: formatDebitorLabel(snapshot, debitorEntry),
    handleStartCompare,
    handleRetry,
    handleOpenEditor,
    handleOpenExisting,
    handleOpenInventur,
  }
}
