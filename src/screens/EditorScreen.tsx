import {
  ReactNode,
  SetStateAction,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  handleSnapshotExcelDownload,
  handleSnapshotPdfDownload,
} from "@/lib/file-actions"
import { toast } from "sonner"

import ArtNrTable from "@/components/editor/tables/ArtNrTable"
import AppTopbar from "@/components/layout/AppTopbar"
import EditorPage from "@/components/editor/EditorPage"
import EditorRail, {
  defaultEditorNavSections,
} from "@/components/editor/EditorRail"
import ErpTable from "@/components/editor/tables/ErpTable"
import LotIdTable from "@/components/editor/tables/LotIdTable"
import OffenePostenTable from "@/components/editor/tables/OffenePostenTable"
import LotIdStatusChips from "@/components/editor/LotIdStatusChips"
import MiniStats, {
  type AutosaveStatus,
} from "@/components/editor/MiniStats"
import RfidTable from "@/components/editor/tables/RfidTable"
import { Toaster } from "@/components/ui/sonner"
import { useLocation } from "wouter"
import {
  artNrAggregateRowsFromLotId,
  buildSnapshotFromEditorState,
  erpRowsForGrid,
  isStichprobenComplete,
  lotIdRowsForGrid,
  offenePostenRowsForGrid,
  rfidRowsForGrid,
  stichprobenRequiredFromErpTotal,
  sumErpQuantityTotal,
  type EditorSnapshot,
  type InventurSessionState,
  type LotIdGridRow,
} from "@/lib/inventur"
import {
  loadInventurDraft,
  saveInventurDraft,
  updateInventurStatus,
  type ProjectStatus,
} from "@/lib/projects"
import {
  isLotIdAbweichung,
  isLotIdOffenerTodo,
  type LotIdStatusFilter,
} from "@/lib/search"

const AUTOSAVE_MS = 5 * 60 * 1000

const formatAutosaveCountdown = (remainingMs: number) => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  if (minutes >= 1) return `${minutes} Min`
  return `${totalSeconds} s`
}

interface PageConfig {
  title: string
  hasHeaderButtons: boolean
}

interface PageConfigMap {
  [key: string]: PageConfig
}

const pageConfig: PageConfigMap = {
  erp: { title: "ERP Bestände", hasHeaderButtons: false },
  offenePosten: { title: "Offene Posten", hasHeaderButtons: false },
  rfid: { title: "RFID Scan", hasHeaderButtons: false },
  lotId: { title: "Abgleich nach LotId", hasHeaderButtons: true },
  artikelNr: {
    title: "Abgleich nach Artikelnummer",
    hasHeaderButtons: false,
  },
}

const isInventurSession = (state: unknown): state is InventurSessionState => {
  if (!state || typeof state !== "object") return false
  const session = state as InventurSessionState
  return Boolean(session.snapshot) && typeof session.projectId === "string"
}

type EditorWorkspaceProps = {
  projectId: string
  snapshot: EditorSnapshot
  projectTitle?: string
  inventurjahr?: string
}

const EditorWorkspace = ({
  projectId,
  snapshot,
  projectTitle,
  inventurjahr,
}: EditorWorkspaceProps) => {
  const [activeTab, setActiveTab] = useState<string>("lotId")
  const [searchQuery, setSearchQuery] = useState("")
  const [lotIdStatusFilter, setLotIdStatusFilter] =
    useState<LotIdStatusFilter>("all")
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const [, setLocation] = useLocation()
  const [autosaveStatus, setAutosaveStatus] =
    useState<AutosaveStatus>("saved")
  const [autosaveCountdown, setAutosaveCountdown] = useState(() =>
    formatAutosaveCountdown(AUTOSAVE_MS)
  )
  const [savePending, setSavePending] = useState(false)
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>("open")
  const isDirtyRef = useRef(false)
  const autosaveTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const nextAutosaveAtRef = useRef(Date.now() + AUTOSAVE_MS)

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

  const currentPageConfig = pageConfig[activeTab] || {
    title: "Editor",
    hasHeaderButtons: false,
  }

  const [lotIdData, setLotIdData] = useState(() =>
    lotIdRowsForGrid(snapshot.lot_id_rows)
  )
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const artNrData = useMemo(
    () => artNrAggregateRowsFromLotId(lotIdData),
    [lotIdData]
  )
  const [erpRows] = useState(() => erpRowsForGrid(snapshot.ax_bestand))
  const [rfidRows] = useState(() => rfidRowsForGrid(snapshot.rfid_scan))
  const [offenePostenRows] = useState(() =>
    offenePostenRowsForGrid(snapshot.offene_posten)
  )

  const lotIdStats = useMemo(() => {
    let abweichungen = 0
    let offeneTodos = 0
    let stichprobenDone = 0
    for (const row of lotIdData) {
      if (isLotIdAbweichung(row)) abweichungen += 1
      if (isLotIdOffenerTodo(row)) offeneTodos += 1
      if (String(row["Stichprobe"] ?? "").trim().toUpperCase() === "X") {
        stichprobenDone += 1
      }
    }
    return { abweichungen, offeneTodos, stichprobenDone }
  }, [lotIdData])

  const stichprobenRequired = useMemo(
    () =>
      stichprobenRequiredFromErpTotal(sumErpQuantityTotal(snapshot.ax_bestand)),
    [snapshot.ax_bestand]
  )
  const stichprobenDone = lotIdStats.stichprobenDone

  const completedStichproben =
    activeTab === "lotId" ? stichprobenDone : undefined
  const requiredStichproben =
    activeTab === "lotId" ? stichprobenRequired : undefined
  const stichprobenMet = isStichprobenComplete(
    stichprobenDone,
    stichprobenRequired
  )

  const assertStichprobenGate = (actionLabel: string) => {
    if (stichprobenMet) return true
    const remaining = Math.max(0, stichprobenRequired - stichprobenDone)
    toast.error("Stichproben unvollständig", {
      description: `${actionLabel} erst möglich nach ${stichprobenRequired} Stichproben (noch ${remaining} offen). Quote: 1 % der ERP-Menge (aufgerundet).`,
    })
    return false
  }

  const handleLotIdChange = useCallback(
    (update: SetStateAction<LotIdGridRow[]>) => {
      isDirtyRef.current = true
      setAutosaveStatus("idle")
      setLotIdData(update)
    },
    []
  )

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

  const flushDraftRef = useRef(flushDraft)
  useEffect(() => {
    flushDraftRef.current = flushDraft
  }, [flushDraft])

  useEffect(() => {
    nextAutosaveAtRef.current = Date.now() + AUTOSAVE_MS
    setAutosaveCountdown(formatAutosaveCountdown(AUTOSAVE_MS))

    autosaveTimer.current = setInterval(() => {
      nextAutosaveAtRef.current = Date.now() + AUTOSAVE_MS
      setAutosaveCountdown(formatAutosaveCountdown(AUTOSAVE_MS))
      if (!isDirtyRef.current) return
      void flushDraftRef.current({ silent: true })
    }, AUTOSAVE_MS)

    const countdownTimer = setInterval(() => {
      const remainingMs = nextAutosaveAtRef.current - Date.now()
      setAutosaveCountdown(formatAutosaveCountdown(remainingMs))
    }, 1000)

    return () => {
      if (autosaveTimer.current) clearInterval(autosaveTimer.current)
      clearInterval(countdownTimer)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        void flushDraft()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [flushDraft])

  const setToastInfo = (
    info: {
      open: boolean
      type: "success" | "error"
      title: string
      description: string
    } | null
  ) => {
    if (!info?.open) return
    if (info.type === "success") {
      toast.success(info.title, { description: info.description })
      return
    }
    toast.error(info.title, { description: info.description })
  }

  const handleAutoFillKommentare = useCallback(() => {
    const grouped: Record<string, any[]> = {}
    lotIdData.forEach((row: { Artikelnummer: any }) => {
      const key = row.Artikelnummer
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(row)
    })

    let affectedArtikelnummern: string[] = []
    const changesToApply = new Map<string, any>()

    const isToDoEmpty = (row: any) => {
      if (!row) return true
      const todo = row["To Do"]
      return !todo || todo.trim() === ""
    }

    Object.entries(grouped).forEach(([artikelnummer, group]) => {
      const missingItems = group.filter(
        (row) => row["RFID-Scan"] == 0 && row["Eigenbestand nach ERP"] == 1
      )
      const scannedItems = group.filter(
        (row) => row["RFID-Scan"] == 1 && row["Eigenbestand nach ERP"] == 0
      )

      const numPairs = Math.min(missingItems.length, scannedItems.length)

      if (numPairs > 0) {
        let changesMadeForThisArticle = false

        for (let i = 0; i < numPairs; i++) {
          const missing = missingItems[i]
          const scanned = scannedItems[i]

          if (isToDoEmpty(missing) && isToDoEmpty(scanned)) {
            changesToApply.set(missing.id, {
              "To Do": "interne Berechnung",
              isEdited: true,
            })
            changesToApply.set(scanned.id, {
              "To Do": "interne Gutschrift mit Rückbuchung auf Konsi",
              isEdited: true,
            })

            changesMadeForThisArticle = true
          }
        }

        if (changesMadeForThisArticle) {
          affectedArtikelnummern.push(artikelnummer)
        }
      }
    })

    if (affectedArtikelnummern.length > 0) {
      setToastInfo({
        open: true,
        type: "success",
        title: "Kommentare automatisch ausgefüllt",
        description: `${[...new Set(affectedArtikelnummern)].length} Artikelnummer(n) automatisch kommentiert.`,
      })

      handleLotIdChange((prevData) => {
        return prevData.map((row) => {
          if (changesToApply.has(row.id)) {
            return { ...row, ...changesToApply.get(row.id) }
          }
          return row
        })
      })
    } else {
      setToastInfo({
        open: true,
        type: "error",
        title: "Keine passenden Paare gefunden",
        description: "Keine passenden Paare zum Kommentieren gefunden.",
      })
    }
  }, [lotIdData, handleLotIdChange])

  const handleAutoSiebeAndOffenePosten = useCallback(() => {
    const changesToApply = new Map<string, any>()
    let siebRowCount = 0
    let offenePostenRowCount = 0

    lotIdData.forEach((row: any) => {
      if (
        row["Kennzeichen 3"] === "SIEB" ||
        (row["Kennzeichen 3"] === "INST" && row["RFID-Scan"] == 0)
      ) {
        const existingChanges = changesToApply.get(row.id) || {}
        changesToApply.set(row.id, {
          ...existingChanges,
          "RFID-Scan": 1,
          isEdited: true,
        })
        siebRowCount++
      }

      if (row["RFID-Scan"] == 0 && row["Eigenbestand nach ERP"] == 0) {
        const existingChanges = changesToApply.get(row.id) || {}
        changesToApply.set(row.id, {
          ...existingChanges,
          Anmerkung: "offener Posten",
          isEdited: true,
        })
        offenePostenRowCount++
      }
    })

    if (siebRowCount > 0 || offenePostenRowCount > 0) {
      handleLotIdChange((prevData) => {
        return prevData.map((row) => {
          if (changesToApply.has(row.id)) {
            return { ...row, ...changesToApply.get(row.id) }
          }
          return row
        })
      })

      const descriptions = []
      if (siebRowCount > 0) {
        descriptions.push(`${siebRowCount} 'SIEB/INST' Zeile(n)`)
      }
      if (offenePostenRowCount > 0) {
        descriptions.push(`${offenePostenRowCount} 'Offene Posten'`)
      }

      setToastInfo({
        open: true,
        type: "success",
        title: "Aktionen ausgeführt",
        description: `${descriptions.join(" und ")} aktualisiert.`,
      })
    } else {
      setToastInfo({
        open: true,
        type: "error",
        title: "Keine Aktionen ausgeführt",
        description:
          "Keine Zeilen für 'SIEB', 'INST' oder 'Offene Posten' gefunden.",
      })
    }
  }, [lotIdData, handleLotIdChange])

  const handleDownloadExcel = async () => {
    if (!assertStichprobenGate("Excel-Export")) return
    const live = buildLiveSnapshot()
    await flushDraft({ silent: true })
    await handleSnapshotExcelDownload(
      live,
      {
        lotIdRows: lotIdData,
        artNrRows: artNrData,
        erpRows,
        rfidRows,
        offenePostenRows,
      },
      setToastInfo
    )
    try {
      await updateInventurStatus(projectId, "exported")
      setProjectStatus("exported")
    } catch (error) {
      console.error("Status Exportiert konnte nicht gesetzt werden:", error)
    }
  }

  const handleDownloadPdf = async () => {
    if (!assertStichprobenGate("PDF-Export")) return
    const live = buildLiveSnapshot()
    await flushDraft({ silent: true })
    await handleSnapshotPdfDownload(live, lotIdData, setToastInfo)
    try {
      await updateInventurStatus(projectId, "exported")
      setProjectStatus("exported")
    } catch (error) {
      console.error("Status Exportiert konnte nicht gesetzt werden:", error)
    }
  }

  const handleMarkDone = async () => {
    if (projectStatus === "done") return
    if (!assertStichprobenGate("Fertig melden")) return
    if (autosaveTimer.current) clearInterval(autosaveTimer.current)
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
      const message =
        error instanceof Error ? error.message : String(error)
      toast.error("Fertig melden fehlgeschlagen", { description: message })
    }
  }

  const handleClose = async () => {
    if (autosaveTimer.current) clearInterval(autosaveTimer.current)
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

  const renderPageContent = (): ReactNode => {
    switch (activeTab) {
      case "erp":
        return <ErpTable data={erpRows} globalFilter={deferredSearchQuery} />
      case "offenePosten":
        return (
          <OffenePostenTable
            data={offenePostenRows}
            globalFilter={deferredSearchQuery}
          />
        )
      case "rfid":
        return (
          <RfidTable data={rfidRows} globalFilter={deferredSearchQuery} />
        )
      case "lotId":
        return (
          <LotIdTable
            data={lotIdData}
            globalFilter={deferredSearchQuery}
            statusFilter={lotIdStatusFilter}
            isBulkEditOpen={isBulkEditOpen}
            onBulkEditOpenChange={setIsBulkEditOpen}
            onChange={handleLotIdChange}
          />
        )
      case "artikelNr":
        return (
          <ArtNrTable data={artNrData} globalFilter={deferredSearchQuery} />
        )
      default:
        return (
          <div>
            Fehler: Keine Daten gefunden - du befindest dich auf der falschen
            Seite! Wähle eine Seite aus dem Menü.
          </div>
        )
    }
  }

  const displayTitle =
    projectTitle ||
    snapshot.kundenname ||
    snapshot.debitor ||
    "Inventur"

  return (
    <div className="bg-background text-foreground flex h-screen w-full flex-col overflow-hidden">
      <AppTopbar
        variant="editor"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        projectLabel={displayTitle}
        inventurjahr={inventurjahr || String(new Date().getFullYear())}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <EditorRail
          navSections={defaultEditorNavSections}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSave={() => void flushDraft()}
          onDownloadExcel={() => void handleDownloadExcel()}
          onDownloadPdf={() => void handleDownloadPdf()}
          onMarkDone={() => void handleMarkDone()}
          onClose={() => void handleClose()}
          savePending={savePending}
          stichprobenComplete={stichprobenMet}
          projectDone={projectStatus === "done"}
        />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <EditorPage
            title={currentPageConfig.title}
            hasHeaderButtons={currentPageConfig.hasHeaderButtons}
            completedStichproben={completedStichproben}
            requiredStichproben={requiredStichproben}
            onAutoCheck={handleAutoSiebeAndOffenePosten}
            onAutoFill={handleAutoFillKommentare}
            isBulkEditOpen={
              activeTab === "lotId" ? isBulkEditOpen : undefined
            }
            onBulkEditToggle={
              activeTab === "lotId"
                ? () => setIsBulkEditOpen((open) => !open)
                : undefined
            }
            miniStats={
              activeTab === "lotId" ? (
                <div className="flex flex-col gap-2">
                  <MiniStats
                    abweichungen={lotIdStats.abweichungen}
                    stichprobe={`${stichprobenDone}/${stichprobenRequired}`}
                    offeneTodos={lotIdStats.offeneTodos}
                    autosaveStatus={autosaveStatus}
                    autosaveCountdown={autosaveCountdown}
                    activeStatusFilter={lotIdStatusFilter}
                    onStatusFilterChange={setLotIdStatusFilter}
                  />
                  <LotIdStatusChips
                    value={lotIdStatusFilter}
                    onChange={setLotIdStatusFilter}
                  />
                </div>
              ) : undefined
            }
          >
            {renderPageContent()}
          </EditorPage>
        </main>
      </div>
      <Toaster position="bottom-right" />
    </div>
  )
}

export default function EditorScreen() {
  const [, setLocation] = useLocation()
  const session = isInventurSession(history.state) ? history.state : null

  useEffect(() => {
    if (!session?.snapshot || !session.projectId) {
      setLocation("/")
    }
  }, [session, setLocation])

  if (!session?.snapshot || !session.projectId) {
    return null
  }

  return (
    <EditorWorkspace
      projectId={session.projectId}
      snapshot={session.snapshot}
      projectTitle={session.projectTitle}
      inventurjahr={session.inventurjahr}
    />
  )
}
