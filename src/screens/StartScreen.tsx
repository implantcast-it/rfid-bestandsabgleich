import { useCallback, useEffect, useState } from "react"
import { useLocation } from "wouter"
import { getVersion } from "@tauri-apps/api/app"
import { UpdaterDialog } from "@/features/feedback/UpdaterDialog"
import { Toaster } from "@/core/ui/sonner"
import HomeTopbar from "@/features/home/HomeTopbar"
import UploadPanel from "@/features/home/UploadPanel"
import InsightCards from "@/features/home/InsightCards"
import InventurenFileGrid from "@/features/home/InventurenFileGrid"
import { getCatalogReady, type CatalogReady } from "@/domains/catalog"
import { useHomeProjects } from "@/features/home/hooks/use-home-projects"
import { useInventurCompare } from "@/features/home/hooks/use-inventur-compare"

const inventurjahrDefault = () => String(new Date().getFullYear())

const StartScreen = () => {
  const [appVersion, setAppVersion] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [, setLocation] = useLocation()
  const [catalogReady, setCatalogReady] = useState<CatalogReady | null>(null)
  const [erpPath, setErpPath] = useState<string | null>(null)
  const [rfidPath, setRfidPath] = useState<string | null>(null)
  const [inventurjahr] = useState(inventurjahrDefault)

  const {
    inventurFiles,
    insightCounts,
    refreshProjects,
    handleRenameInventur,
    handleDeleteInventur,
  } = useHomeProjects(inventurjahr)

  const refreshCatalogReady = useCallback(async () => {
    try {
      const ready = await getCatalogReady()
      setCatalogReady(ready)
    } catch (error) {
      console.error("Katalog-Status konnte nicht geladen werden:", error)
      setCatalogReady(null)
    }
  }, [])

  const compare = useInventurCompare({
    inventurjahr,
    catalogReady,
    erpPath,
    rfidPath,
    setLocation,
    refreshProjects,
  })

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
            processPhase={compare.processPhase}
            processTitle={compare.processTitle}
            processStatus={compare.processStatus}
            processPercent={compare.processPercent}
            progressLabel={compare.progressLabel}
            pipelineSteps={compare.pipelineSteps}
            debitorLabel={compare.debitorLabel}
            loadingAbgleich={compare.loadingAbgleich}
            onStartCompare={() => void compare.handleStartCompare()}
            onOpenExisting={() => void compare.handleOpenExisting()}
            onRetry={compare.handleRetry}
            onOpenEditor={compare.handleOpenEditor}
          />
          <div
            className={
              compare.processPhase === "processing"
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
              onOpenFile={(id) => void compare.handleOpenInventur(id)}
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
