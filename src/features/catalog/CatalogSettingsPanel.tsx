import { HugeiconsIcon } from "@hugeicons/react"
import { Upload04Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/core/ui/button"
import type { CatalogStats } from "@/domains/catalog"

type CatalogSettingsPanelProps = {
  catalogStats: CatalogStats | null
  importing: boolean
  onImport: () => void
}

export const CatalogSettingsPanel = ({
  catalogStats,
  importing,
  onImport,
}: CatalogSettingsPanelProps) => (
  <>
    <div className="border-b px-3.5 py-3">
      <strong className="text-[13px] font-bold">Referenzkatalog</strong>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        Eine Excel-Datei mit den Tabellen <strong>GTIN</strong> und{" "}
        <strong>Debitoren</strong> lokal speichern. Bestehende Einträge werden
        nicht überschrieben.
      </p>
    </div>
    <div className="text-muted-foreground space-y-1 border-b px-3.5 py-2.5 text-xs">
      {catalogStats ? (
        <>
          <p>
            GTIN:{" "}
            <strong className="text-foreground">{catalogStats.gtin_count}</strong>
            {" · "}
            Debitoren:{" "}
            <strong className="text-foreground">
              {catalogStats.debitor_count}
            </strong>
          </p>
          {catalogStats.last_import_filename && (
            <p className="truncate" title={catalogStats.last_import_filename}>
              Zuletzt: {catalogStats.last_import_filename}
            </p>
          )}
        </>
      ) : (
        <p>Noch kein Katalog geladen.</p>
      )}
    </div>
    <div className="p-2">
      <Button
        type="button"
        variant="secondary"
        className="w-full justify-start gap-2 rounded-none"
        disabled={importing}
        aria-label="Referenzkatalog aus Excel importieren"
        onClick={onImport}
      >
        <HugeiconsIcon icon={Upload04Icon} size={16} strokeWidth={2} />
        {importing ? "Import läuft…" : "Excel importieren…"}
      </Button>
    </div>
  </>
)
