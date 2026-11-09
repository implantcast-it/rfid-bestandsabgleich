import { HugeiconsIcon } from "@hugeicons/react"
import { Download04Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/core/ui/button"

type BestaetigungFormDownloadProps = {
  downloading: boolean
  onDownload: () => void
}

export const BestaetigungFormDownload = ({
  downloading,
  onDownload,
}: BestaetigungFormDownloadProps) => (
  <>
    <div className="border-b px-3.5 py-3">
      <strong className="text-[13px] font-bold">Formulare</strong>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        Leeres Bestätigungsformular zum Ausdrucken und Vorhalten im Außendienst
        (ohne Kundendaten).
      </p>
    </div>
    <div className="p-2">
      <Button
        type="button"
        variant="secondary"
        className="w-full justify-start gap-2 rounded-none"
        disabled={downloading}
        aria-label="Bestätigungsformular als PDF herunterladen"
        onClick={onDownload}
      >
        <HugeiconsIcon icon={Download04Icon} size={16} strokeWidth={2} />
        {downloading ? "PDF wird erstellt…" : "Bestätigungsformular (PDF)"}
      </Button>
    </div>
  </>
)
