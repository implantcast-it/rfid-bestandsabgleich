import { useCallback, useDeferredValue, useState, type SetStateAction } from "react"
import type { EditorSnapshot, LotIdGridRow } from "@/domains/inventur"
import type { LotIdStatusFilter } from "@/domains/inventur/search"
import { Toaster } from "@/core/ui/sonner"
import AppTopbar from "@/features/shell/AppTopbar"
import EditorPage from "@/features/editor/EditorPage"
import EditorRail, {
  defaultEditorNavSections,
} from "@/features/editor/EditorRail"
import LotIdStatsHeader from "@/features/editor/LotIdStatsHeader"
import { EditorTabContent } from "@/features/editor/EditorTabContent"
import { editorPageConfig } from "@/features/editor/page-config"
import { useAutoLotIdActions } from "@/features/editor/hooks/use-auto-lotid-actions"
import { useEditorAutosave } from "@/features/editor/hooks/use-editor-autosave"
import { useEditorDraft } from "@/features/editor/hooks/use-editor-draft"
import { useEditorExport } from "@/features/editor/hooks/use-editor-export"
import { useEditorLifecycle } from "@/features/editor/hooks/use-editor-lifecycle"
import { useEditorTableData } from "@/features/editor/hooks/use-editor-table-data"
import { useLotIdStats } from "@/features/editor/hooks/use-lot-id-stats"
import { useStichprobenGate } from "@/features/editor/hooks/use-stichproben-gate"

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
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const {
    lotIdData,
    setLotIdData,
    artNrData,
    erpRows,
    rfidRows,
    offenePostenRows,
  } = useEditorTableData(snapshot)

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

  const {
    completedStichproben,
    requiredStichproben,
    assertStichprobenGate,
  } = useStichprobenGate({
    activeTab,
    stichprobenDone,
    stichprobenRequired,
    stichprobenMet,
  })

  const handleLotIdChange = useCallback(
    (update: SetStateAction<LotIdGridRow[]>) => {
      markDirty()
      setLotIdData(update)
    },
    [markDirty, setLotIdData]
  )

  const { handleAutoFillKommentare, handleAutoSiebe } = useAutoLotIdActions({
    lotIdData,
    onLotIdChange: handleLotIdChange,
  })

  const { exportPending, handleDownloadExcel, handleDownloadPdf } =
    useEditorExport({
      projectId,
      lotIdData,
      buildLiveSnapshot,
      flushDraft,
      setProjectStatus,
      assertStichprobenGate,
    })

  const { handleMarkDone, handleClose } = useEditorLifecycle({
    projectId,
    projectStatus,
    setProjectStatus,
    clearAutosaveTimer,
    flushDraft,
    assertStichprobenGate,
  })

  const currentPageConfig = editorPageConfig[activeTab] || {
    title: "Editor",
    hasHeaderButtons: false,
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
          exportPending={exportPending}
          stichprobenComplete={stichprobenMet}
          projectDone={projectStatus === "done"}
        />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <EditorPage
            title={currentPageConfig.title}
            hasHeaderButtons={currentPageConfig.hasHeaderButtons}
            completedStichproben={completedStichproben}
            requiredStichproben={requiredStichproben}
            onAutoCheck={() => void handleAutoSiebe()}
            onAutoFill={() => void handleAutoFillKommentare()}
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
                <LotIdStatsHeader
                  abweichungen={lotIdStats.abweichungen}
                  offeneTodos={lotIdStats.offeneTodos}
                  stichprobenDone={stichprobenDone}
                  stichprobenRequired={stichprobenRequired}
                  autosaveStatus={autosaveStatus}
                  autosaveCountdown={autosaveCountdown}
                  lotIdStatusFilter={lotIdStatusFilter}
                  onStatusFilterChange={setLotIdStatusFilter}
                />
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
