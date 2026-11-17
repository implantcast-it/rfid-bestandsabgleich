import { Alert02Icon, FileUploadIcon } from "@hugeicons/core-free-icons";
import type {
  ErpCategoryCounts,
  PipelineStepState,
  ProcessPhase,
  ProductCategoryComparison,
} from "@/domains/inventur";

import { Button } from "@/core/ui/button";
import type { CatalogReady } from "@/domains/catalog";
import FilePickSlot from "@/features/home/FilePickSlot";
import { HugeiconsIcon } from "@hugeicons/react";
import ProcessPanel from "@/features/home/ProcessPanel";
import { catalogGateMessage } from "@/domains/catalog";
import ProductCategorySummary from "@/features/home/ProductCategorySummary";

export type ErpPreviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; counts: ErpCategoryCounts };

type UploadPanelProps = {
  inventurjahr: string;
  catalogReady: CatalogReady | null;
  erpPath: string | null;
  rfidPath: string | null;
  erpPreview: ErpPreviewState | null;
  onErpSelect: (path: string | null) => void;
  onRfidSelect: (path: string | null) => void;
  processPhase: ProcessPhase | null;
  processTitle: string;
  processStatus: string;
  processPercent: number;
  progressLabel: string;
  pipelineSteps: PipelineStepState[];
  debitorLabel: string;
  categoryComparison: ProductCategoryComparison | null;
  loadingAbgleich: boolean;
  onStartCompare: () => void;
  onOpenExisting: () => void;
  onRetry: () => void;
  onOpenEditor: () => void;
};

const fileName = (path: string | null) => {
  if (!path) return "—";
  return path.replace(/^.*[\\/]/, "");
};

const UploadPanel = ({
  inventurjahr,
  catalogReady,
  erpPath,
  rfidPath,
  erpPreview,
  onErpSelect,
  onRfidSelect,
  processPhase,
  processTitle,
  processStatus,
  processPercent,
  progressLabel,
  pipelineSteps,
  debitorLabel,
  categoryComparison,
  loadingAbgleich,
  onStartCompare,
  onOpenExisting,
  onRetry,
  onOpenEditor,
}: UploadPanelProps) => {
  const gateMessage = catalogGateMessage(catalogReady);
  const catalogOk = Boolean(catalogReady?.ready);
  const filesReady = Boolean(
    erpPath && rfidPath && erpPreview?.status === "ready"
  );
  const canStart = catalogOk && filesReady && !processPhase;

  if (processPhase) {
    return (
      <ProcessPanel
        phase={processPhase}
        title={processTitle}
        status={processStatus}
        percent={processPercent}
        progressLabel={progressLabel}
        pipelineSteps={pipelineSteps}
        erpName={fileName(erpPath)}
        rfidName={fileName(rfidPath)}
        debitor={debitorLabel}
        inventurjahr={inventurjahr}
        categoryComparison={categoryComparison}
        onRetry={onRetry}
        onOpenEditor={onOpenEditor}
      />
    );
  }

  return (
    <section
      className='gap-3 grid bg-card p-3.5 border'
      aria-labelledby='uploadTitle'
    >
      <div className='flex justify-between items-start gap-4'>
        <div className='min-w-0'>
          <h1
            id='uploadTitle'
            className='font-bold text-[17px] leading-tight tracking-[-0.025em]'
          >
            Neue Inventur
          </h1>
          <p className='mt-1 max-w-[52ch] text-[12.5px] text-muted-foreground leading-snug'>
            ERP-Bestand und RFID-Scan für{" "}
            <strong className='font-semibold text-foreground dark:text-[#ddd]'>
              {inventurjahr}
            </strong>
          </p>
          <p className='mt-1 max-w-[72ch] text-[11.5px] text-muted-foreground leading-snug'>
            Lade zuerst den ERP-Abzug hoch, um die Sollzahlen zu sehen. Den
            RFID-Export wählst du nach der Zählung aus.
          </p>
        </div>
        <div className='flex flex-wrap justify-end items-center gap-2 shrink-0'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='px-3.5 rounded-none h-[34px] font-semibold text-[13px]'
            disabled={loadingAbgleich}
            onClick={onOpenExisting}
            aria-label='Bestehenden Abgleich einlesen'
          >
            <HugeiconsIcon icon={FileUploadIcon} data-icon='inline-start' />
            {loadingAbgleich ? "Wird geladen…" : "Abgleich einlesen"}
          </Button>
          <Button
            type='button'
            size='sm'
            className='px-3.5 rounded-none h-[34px] font-semibold text-[13px]'
            disabled={!canStart}
            onClick={onStartCompare}
            aria-label='Abgleich starten'
            aria-disabled={!canStart}
            aria-describedby='startHint'
          >
            Abgleich starten
          </Button>
        </div>
      </div>

      <p id='startHint' className='sr-only'>
        ERP-Datei auswerten lassen, RFID-Datei auswählen und Katalog bereithalten.
      </p>

      {gateMessage && (
        <div
          className='flex items-start gap-3 bg-[rgba(224,162,58,0.16)] px-3 py-2.5 border border-amber-500/40 text-amber-700 dark:text-[#f0c06a] text-sm'
          role='alert'
        >
          <HugeiconsIcon
            icon={Alert02Icon}
            size={18}
            strokeWidth={2}
            className='mt-0.5 shrink-0'
            aria-hidden='true'
          />
          <div className='space-y-1'>
            <p className='font-medium'>Katalog nicht bereit</p>
            <p className='opacity-90 text-xs/relaxed'>{gateMessage}</p>
            {catalogReady && (
              <p className='opacity-80 text-[11px]'>
                Aktuell: {catalogReady.stats.gtin_count} GTINs ·{" "}
                {catalogReady.stats.debitor_count} Debitoren
              </p>
            )}
          </div>
        </div>
      )}

      <div className='gap-2.5 grid sm:grid-cols-2'>
        <FilePickSlot
          title='ERP-Bestand'
          acceptLabel='Excel'
          description='.xlsx / .xls'
          extensions={["xlsx", "xls"]}
          filePath={erpPath ?? undefined}
          onSelect={onErpSelect}
        />
        <FilePickSlot
          title='RFID-Scan'
          acceptLabel='Text'
          description='.txt'
          extensions={["txt"]}
          filePath={rfidPath ?? undefined}
          onSelect={onRfidSelect}
        />
      </div>
      {erpPreview?.status === "loading" && (
        <p className="text-muted-foreground text-xs" role="status">
          ERP-Datei wird ausgewertet…
        </p>
      )}
      {erpPreview?.status === "error" && (
        <p
          className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
          role="alert"
        >
          ERP-Datei konnte nicht ausgewertet werden: {erpPreview.message} Bitte
          wähle den aktuellen ERP-Excel-Abzug erneut aus.
        </p>
      )}
      {erpPreview?.status === "ready" && (
        <ProductCategorySummary
          expected={{
            implantate: erpPreview.counts.implantate,
            siebe: erpPreview.counts.siebe,
            instrumente: erpPreview.counts.instrumente,
            weitere: erpPreview.counts.weitere,
          }}
          excludedOpenItems={erpPreview.counts.offene_posten_ausgeschlossen}
        />
      )}
    </section>
  );
};

export default UploadPanel;
