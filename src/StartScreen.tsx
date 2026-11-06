import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation } from "wouter"
import { getVersion } from "@tauri-apps/api/app"
import { toast } from "sonner"
import { UpdaterDialog } from "./components/ui/UpdaterDialog"
import { Toaster } from "./components/ui/sonner"
import HomeTopbar from "./components/home/HomeTopbar"
import UploadPanel from "./components/home/UploadPanel"
import InsightCards from "./components/home/InsightCards"
import InventurenFileGrid, {
  type InventurFile,
} from "./components/home/InventurenFileGrid"
import {
  catalogGateMessage,
  formatDebitorSummary,
  getCatalogReady,
  searchDebitors,
  type CatalogReady,
  type DebitorEntry,
} from "./lib/catalog"
import {
  loadAbgleichFromDialog,
  runInventur,
  type EditorSnapshot,
  type InventurSessionState,
} from "./lib/inventur"
import type { ProcessPhase } from "./components/home/ProcessPanel"
import {
  createInventurProject,
  deleteInventurProject,
  listInventurProjects,
  loadInventurDraft,
  projectMetaToInventurFile,
  updateInventurTitle,
  type ProjectMeta,
} from "./lib/projects"

const inventurjahrDefault = () => String(new Date().getFullYear())

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

/* Start Screen for the Application */
const StartScreen = () => {
  const [appVersion, setAppVersion] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [, setLocation] = useLocation()

  const [catalogReady, setCatalogReady] = useState<CatalogReady | null>(null)
  const [erpPath, setErpPath] = useState<string | null>(null)
  const [rfidPath, setRfidPath] = useState<string | null>(null)
  const [inventurjahr] = useState(inventurjahrDefault)

  const [processPhase, setProcessPhase] = useState<ProcessPhase | null>(null)
  const [processTitle, setProcessTitle] = useState("Abgleich läuft")
  const [processStatus, setProcessStatus] = useState("")
  const [processPercent, setProcessPercent] = useState(0)
  const [progressLabel, setProgressLabel] = useState("Vorbereitung")
  const [snapshot, setSnapshot] = useState<EditorSnapshot | null>(null)
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null)
  const [debitorEntry, setDebitorEntry] = useState<DebitorEntry | null>(null)
  const [loadingAbgleich, setLoadingAbgleich] = useState(false)
  const [projects, setProjects] = useState<ProjectMeta[]>([])

  const inventurFiles: InventurFile[] = useMemo(
    () => projects.map(projectMetaToInventurFile),
    [projects]
  )

  const insightCounts = useMemo(() => {
    const year = inventurjahr
    const yearProjects = projects.filter((p) =>
      p.inventur_date.startsWith(year)
    )
    const offene = yearProjects.filter((p) => p.status === "open").length
    // Remaining samples vs ceil(1% ERP qty) quota across all inventuren
    const stichproben = yearProjects.reduce((sum, project) => {
      const done = Number(project.stichproben_done)
      const required = Number(project.stichproben_required)
      const completed = Number.isFinite(done) ? done : 0
      const target = Number.isFinite(required) ? required : 0
      return sum + Math.max(0, target - completed)
    }, 0)
    return {
      vergleiche: yearProjects.length,
      offene,
      stichproben,
    }
  }, [projects, inventurjahr])

  const refreshCatalogReady = useCallback(async () => {
    try {
      const ready = await getCatalogReady()
      setCatalogReady(ready)
    } catch (error) {
      console.error("Katalog-Status konnte nicht geladen werden:", error)
      setCatalogReady(null)
    }
  }, [])

  const refreshProjects = useCallback(async () => {
    try {
      const items = await listInventurProjects()
      setProjects(items)
    } catch (error) {
      console.error("Inventuren konnten nicht geladen werden:", error)
      setProjects([])
    }
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

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const version = await getVersion()
        setAppVersion(version)
      } catch (error) {
        console.error("Failed to get app version:", error)
      }
    }

    void fetchVersion()
    void refreshCatalogReady()
    void refreshProjects()
  }, [refreshCatalogReady, refreshProjects])

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
    setProcessPhase("processing")
    setProcessTitle("Abgleich läuft")
    setProcessStatus("Dateien werden gelesen und mit dem Katalog abgeglichen…")
    setProgressLabel("Vergleich")
    setProcessPercent(35)

    try {
      setProcessPercent(70)
      const result = await runInventur(erpPath, rfidPath)
      const entry = await resolveDebitorEntry(result.debitor)
      const meta = await createProjectFromSnapshot(result, entry)
      setSnapshot(result)
      setPendingProjectId(meta.id)
      await refreshProjects()
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
      setProcessTitle("Abgleich fehlgeschlagen")
      setProcessStatus(message)
      setProgressLabel("Fehler")
      setProcessPercent(100)
      setProcessPhase("error")
      toast.error("Abgleich fehlgeschlagen", { description: message })
    }
  }

  const handleRetry = () => {
    setProcessPhase(null)
    setProcessPercent(0)
    setProcessStatus("")
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

  const handleRenameInventur = async (id: string, title: string) => {
    try {
      await updateInventurTitle(id, title)
      await refreshProjects()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error)
      toast.error("Umbenennen fehlgeschlagen", { description: message })
    }
  }

  const handleDeleteInventur = async (id: string) => {
    try {
      await deleteInventurProject(id)
      await refreshProjects()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error)
      toast.error("Löschen fehlgeschlagen", { description: message })
    }
  }

  return (
    <div className="text-foreground relative flex h-svh min-w-0 flex-col overflow-hidden">
      <HomeTopbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCatalogChanged={() => void refreshCatalogReady()}
      />

      <div className="scrollbar-none relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <main className="mx-auto grid w-full min-w-0 max-w-[1075px] gap-3 px-5 pt-3.5 pb-4">
          <UploadPanel
            inventurjahr={inventurjahr}
            catalogReady={catalogReady}
            erpPath={erpPath}
            rfidPath={rfidPath}
            onErpSelect={setErpPath}
            onRfidSelect={setRfidPath}
            processPhase={processPhase}
            processTitle={processTitle}
            processStatus={processStatus}
            processPercent={processPercent}
            progressLabel={progressLabel}
            debitorLabel={formatDebitorLabel(snapshot, debitorEntry)}
            loadingAbgleich={loadingAbgleich}
            onStartCompare={() => void handleStartCompare()}
            onOpenExisting={() => void handleOpenExisting()}
            onRetry={handleRetry}
            onOpenEditor={handleOpenEditor}
          />
          <div
            className={
              processPhase === "processing"
                ? "pointer-events-none min-w-0 space-y-3 opacity-55 transition-opacity"
                : "min-w-0 space-y-3"
            }
          >
            <InsightCards
              version={appVersion}
              inventurjahr={inventurjahr}
              vergleiche={insightCounts.vergleiche}
              offene={insightCounts.offene}
              stichproben={insightCounts.stichproben}
            />
            <InventurenFileGrid
              files={inventurFiles}
              inventurjahr={inventurjahr}
              searchQuery={searchQuery}
              onOpenFile={(id) => void handleOpenInventur(id)}
              onRenameFile={(id, title) => void handleRenameInventur(id, title)}
              onDeleteFile={(id) => void handleDeleteInventur(id)}
            />
          </div>
        </main>
      </div>

      <UpdaterDialog />
      <Toaster position="bottom-right" />
    </div>
  )
}

export default StartScreen
