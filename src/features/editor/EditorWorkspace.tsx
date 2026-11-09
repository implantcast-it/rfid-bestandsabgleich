import {
  SetStateAction,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from "react"
import { toast } from "sonner"
import { useLocation } from "wouter"
import {
  handleSnapshotExcelDownload,
  handleSnapshotPdfDownload,
} from "@/domains/export"
import {
  applyLotIdPatches,
  artNrAggregateRowsFromLotId,
  computeAutofillKommentare,
  computeAutoSiebeAndOffenePosten,
  erpRowsForGrid,
  lotIdRowsForGrid,
  offenePostenRowsForGrid,
  rfidRowsForGrid,
  type EditorSnapshot,
  type LotIdGridRow,
} from "@/domains/inventur"
import { updateInventurStatus } from "@/domains/projects"
import type { LotIdStatusFilter } from "@/domains/inventur/search"
import { Toaster } from "@/core/ui/sonner"
import AppTopbar from "@/features/shell/AppTopbar"
import EditorPage from "@/features/editor/EditorPage"
import EditorRail, {
  defaultEditorNavSections,
} from "@/features/editor/EditorRail"
import LotIdStatusChips from "@/features/editor/LotIdStatusChips"
import MiniStats from "@/features/editor/MiniStats"
import { EditorTabContent } from "@/features/editor/EditorTabContent"
import { editorPageConfig } from "@/features/editor/page-config"
import { useEditorAutosave } from "@/features/editor/hooks/use-editor-autosave"
import { useEditorDraft } from "@/features/editor/hooks/use-editor-draft"
import { useLotIdStats } from "@/features/editor/hooks/use-lot-id-stats"

type EditorWorkspaceProps = {
  projectId: string
  snapshot: EditorSnapshot
  projectTitle?: string
  inventurjahr?: string
}

export const EditorWorkspace = ({
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

  const {
    autosaveStatus,
    savePending,
    projectStatus,
    setProjectStatus,
    isDirtyRef,
    markDirty,
    buildLiveSnapshot,
    flushDraft,
  } = useEditorDraft({
    projectId,
    snapshot,
    lotIdData,
    artNrData,
  })

  const { autosaveCountdown, clearAutosaveTimer } = useEditorAutosave({
    isDirtyRef,
    flushDraft,
  })

  const {
    lotIdStats,
    stichprobenRequired,
    stichprobenDone,
    stichprobenMet,
  } = useLotIdStats(lotIdData, snapshot.ax_bestand)

  const currentPageConfig = editorPageConfig[activeTab] || {
    title: "Editor",
    hasHeaderButtons: false,
  }

  const completedStichproben =
    activeTab === "lotId" ? stichprobenDone : undefined
  const requiredStichproben =
    activeTab === "lotId" ? stichprobenRequired : undefined

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
      markDirty()
      setLotIdData(update)
    },
    [markDirty]
  )

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
    const { changes, affectedArtikelnummern } =
      computeAutofillKommentare(lotIdData)

    if (affectedArtikelnummern.length > 0) {
      setToastInfo({
        open: true,
        type: "success",
        title: "Kommentare automatisch ausgefüllt",
        description: `${[...new Set(affectedArtikelnummern)].length} Artikelnummer(n) automatisch kommentiert.`,
      })
      handleLotIdChange((prev) => applyLotIdPatches(prev, changes))
      return
    }

    setToastInfo({
      open: true,
      type: "error",
      title: "Keine passenden Paare gefunden",
      description: "Keine passenden Paare zum Kommentieren gefunden.",
    })
  }, [lotIdData, handleLotIdChange])

  const handleAutoSiebeAndOffenePosten = useCallback(() => {
    const { changes, siebRowCount, offenePostenRowCount } =
      computeAutoSiebeAndOffenePosten(lotIdData)

    if (siebRowCount > 0 || offenePostenRowCount > 0) {
      handleLotIdChange((prev) => applyLotIdPatches(prev, changes))
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
      return
    }

    setToastInfo({
      open: true,
      type: "error",
      title: "Keine Aktionen ausgeführt",
      description:
        "Keine Zeilen für 'SIEB', 'INST' oder 'Offene Posten' gefunden.",
    })
  }, [lotIdData, handleLotIdChange])

  const handleDownloadExcel = async () => {
    if (!assertStichprobenGate("Excel-Export")) return
    const live = buildLiveSnapshot()
    await flushDraft({ silent: true })
    await handleSnapshotExcelDownload(live, setToastInfo)
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
      const message =
        error instanceof Error ? error.message : String(error)
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
            <EditorTabContent
              activeTab={activeTab}
              deferredSearchQuery={deferredSearchQuery}
              lotIdData={lotIdData}
              artNrData={artNrData}
              erpRows={erpRows}
              rfidRows={rfidRows}
              offenePostenRows={offenePostenRows}
              lotIdStatusFilter={lotIdStatusFilter}
              isBulkEditOpen={isBulkEditOpen}
              onBulkEditOpenChange={setIsBulkEditOpen}
              onLotIdChange={handleLotIdChange}
            />
          </EditorPage>
        </main>
      </div>
      <Toaster position="bottom-right" />
    </div>
  )
}
