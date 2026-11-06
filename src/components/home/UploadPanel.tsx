import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  FileUploadIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import DropSlot from "@/components/home/DropSlot"
import ProcessPanel, { type ProcessPhase } from "@/components/home/ProcessPanel"
import type { CatalogReady } from "@/lib/catalog"
import { catalogGateMessage } from "@/lib/catalog"

type UploadPanelProps = {
  inventurjahr: string
  catalogReady: CatalogReady | null
  erpPath: string | null
  rfidPath: string | null
  onErpSelect: (path: string | null) => void
  onRfidSelect: (path: string | null) => void
  processPhase: ProcessPhase | null
  processTitle: string
  processStatus: string
  processPercent: number
  progressLabel: string
  debitorLabel: string
  loadingAbgleich: boolean
  onStartCompare: () => void
  onOpenExisting: () => void
  onRetry: () => void
  onOpenEditor: () => void
}

const fileName = (path: string | null) => {
  if (!path) return "—"
  return path.replace(/^.*[\\/]/, "")
}

const UploadPanel = ({
  inventurjahr,
  catalogReady,
  erpPath,
  rfidPath,
  onErpSelect,
  onRfidSelect,
  processPhase,
  processTitle,
  processStatus,
  processPercent,
  progressLabel,
  debitorLabel,
  loadingAbgleich,
  onStartCompare,
  onOpenExisting,
  onRetry,
  onOpenEditor,
}: UploadPanelProps) => {
  const gateMessage = catalogGateMessage(catalogReady)
  const catalogOk = Boolean(catalogReady?.ready)
  const filesReady = Boolean(erpPath && rfidPath)
  const canStart = catalogOk && filesReady && !processPhase

  if (processPhase) {
    return (
      <ProcessPanel
        phase={processPhase}
        title={processTitle}
        status={processStatus}
        percent={processPercent}
        progressLabel={progressLabel}
        erpName={fileName(erpPath)}
        rfidName={fileName(rfidPath)}
        debitor={debitorLabel}
        inventurjahr={inventurjahr}
        onRetry={onRetry}
        onOpenEditor={onOpenEditor}
      />
    )
  }

  return (
    <section
      className="bg-card grid gap-3 border p-3.5"
      aria-labelledby="uploadTitle"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1
            id="uploadTitle"
            className="text-[17px] font-bold tracking-[-0.025em] leading-tight"
          >
            Neue Inventur
          </h1>
          <p className="text-muted-foreground mt-1 max-w-[52ch] text-[12.5px] leading-snug">
            ERP-Bestand und RFID-Scan für{" "}
            <strong className="text-foreground font-semibold dark:text-[#ddd]">
              {inventurjahr}
            </strong>{" "}
            auswählen. GTIN-Zuordnung liegt in der App.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-[34px] rounded-none px-3.5 text-[13px] font-semibold"
            disabled={loadingAbgleich}
            onClick={onOpenExisting}
            aria-label="Bestehenden Abgleich einlesen"
          >
            <HugeiconsIcon icon={FileUploadIcon} data-icon="inline-start" />
            {loadingAbgleich ? "Wird geladen…" : "Abgleich einlesen"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-[34px] rounded-none px-3.5 text-[13px] font-semibold"
            disabled={!canStart}
            onClick={onStartCompare}
            aria-label="Abgleich starten"
            aria-disabled={!canStart}
            aria-describedby="startHint"
          >
            Abgleich starten
          </Button>
        </div>
      </div>

      <p id="startHint" className="sr-only">
        Beide Dateien müssen ausgewählt sein. Katalog muss bereit sein.
      </p>

      {gateMessage && (
        <div
          className="flex items-start gap-3 border border-amber-500/40 bg-[rgba(224,162,58,0.16)] px-3 py-2.5 text-sm text-[#f0c06a]"
          role="alert"
        >
          <HugeiconsIcon
            icon={Alert02Icon}
            size={18}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="font-medium">Katalog nicht bereit</p>
            <p className="text-xs/relaxed opacity-90">{gateMessage}</p>
            {catalogReady && (
              <p className="text-[11px] opacity-80">
                Aktuell: {catalogReady.stats.gtin_count} GTINs ·{" "}
                {catalogReady.stats.debitor_count} Debitoren
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2">
        <DropSlot
          title="ERP-Bestand"
          acceptLabel="Excel"
          description=".xlsx / .xls"
          extensions={["xlsx", "xls"]}
          filePath={erpPath ?? undefined}
          onSelect={onErpSelect}
        />
        <DropSlot
          title="RFID-Scan"
          acceptLabel="Text"
          description=".txt"
          extensions={["txt"]}
          filePath={rfidPath ?? undefined}
          onSelect={onRfidSelect}
        />
      </div>
    </section>
  )
}

export default UploadPanel
