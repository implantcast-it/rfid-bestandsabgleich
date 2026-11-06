import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Search01Icon,
  Settings01Icon,
  Sun03Icon,
  Moon02Icon,
  Upload04Icon,
  Download04Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTheme } from "@/context/ThemeContext"
import { cn } from "@/lib/utils"
import {
  CatalogStats,
  formatImportSummary,
  getCatalogStats,
  importReferenceCatalogFromDialog,
} from "@/lib/catalog"
import { exportBestaetigungPdf } from "@/lib/pdf"

type AppTopbarVariant = "home" | "editor"

type AppTopbarProps = {
  variant?: AppTopbarVariant
  searchQuery: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  projectLabel?: string
  inventurjahr?: string
  /** Called after a successful reference-catalog import so home gates refresh. */
  onCatalogChanged?: () => void
}

const AppTopbar = ({
  variant = "home",
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  projectLabel,
  inventurjahr,
  onCatalogChanged,
}: AppTopbarProps) => {
  const { theme, toggleTheme } = useTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [catalogStats, setCatalogStats] = useState<CatalogStats | null>(null)
  const [importing, setImporting] = useState(false)
  const [downloadingForm, setDownloadingForm] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [kbdHint, setKbdHint] = useState("Ctrl+K")

  const placeholder =
    searchPlaceholder ??
    (variant === "editor"
      ? "LotId, Artikel oder Produkt…"
      : "Datum, Debitor, PLZ oder Ort…")

  const refreshCatalogStats = async () => {
    try {
      const stats = await getCatalogStats()
      setCatalogStats(stats)
    } catch (error) {
      console.error("Katalog-Statistik konnte nicht geladen werden:", error)
      setCatalogStats(null)
    }
  }

  useEffect(() => {
    const isMac =
      /Mac|iPhone|iPad|iPod/.test(navigator.platform) ||
      (navigator as Navigator & { userAgentData?: { platform?: string } })
        .userAgentData?.platform === "macOS"
    setKbdHint(isMac ? "⌘K" : "Ctrl+K")
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === "Escape") {
        setSettingsOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (!settingsOpen) return
    void refreshCatalogStats()
    const handlePointer = (event: MouseEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener("mousedown", handlePointer)
    return () => document.removeEventListener("mousedown", handlePointer)
  }, [settingsOpen])

  const handleImportCatalog = async () => {
    setImporting(true)
    try {
      const stats = await importReferenceCatalogFromDialog()
      if (!stats) return
      toast.success("Referenzkatalog importiert", {
        description: formatImportSummary(stats),
      })
      await refreshCatalogStats()
      onCatalogChanged?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.error("Import fehlgeschlagen", { description: message })
    } finally {
      setImporting(false)
    }
  }

  const handleDownloadBestaetigung = async () => {
    setDownloadingForm(true)
    try {
      const result = await exportBestaetigungPdf()
      if (result.cancelled) return
      if (!result.success) {
        toast.error("Download fehlgeschlagen", {
          description:
            result.error?.message ??
            "Das Bestätigungsformular konnte nicht erstellt werden.",
        })
        return
      }
      toast.success("Bestätigungsformular gespeichert", {
        description: result.filePath,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.error("Download fehlgeschlagen", { description: message })
    } finally {
      setDownloadingForm(false)
    }
  }

  return (
    <header className="bg-card/90 supports-backdrop-filter:backdrop-blur-md sticky top-0 z-20 grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_minmax(180px,360px)_minmax(0,1fr)] items-center gap-3 border-b px-5 sm:gap-4">
      <div className="flex min-w-0 items-center gap-2.5 justify-self-stretch overflow-hidden">
        <img
          src="./ic-shamrock_rgb.png"
          alt=""
          width={36}
          height={36}
          className="size-9 shrink-0 object-contain dark:mix-blend-lighten"
        />
        <span
          className={cn(
            "truncate text-sm font-bold tracking-[-0.02em]",
            variant === "editor" && projectLabel && "hidden min-[1100px]:inline"
          )}
        >
          Bestandsabgleich
        </span>
        {variant === "editor" && projectLabel && (
          <span
            className="text-muted-foreground border-border min-w-0 truncate border-l pl-2.5 text-xs font-semibold"
            title={projectLabel}
          >
            {projectLabel}
          </span>
        )}
        {variant === "editor" && inventurjahr && (
          <span className="border-primary/35 bg-primary/15 text-primary shrink-0 border px-1.5 py-0.5 text-[11px] font-bold tracking-[0.04em]">
            {inventurjahr}
          </span>
        )}
      </div>

      <label className="bg-background border-input focus-within:border-primary focus-within:ring-primary/30 relative flex h-9 min-w-0 w-full items-center gap-2 rounded-full border px-3 focus-within:ring-[3px]">
        <HugeiconsIcon
          icon={Search01Icon}
          size={18}
          strokeWidth={2}
          className="text-muted-foreground shrink-0"
        />
        <span className="sr-only">
          {variant === "editor"
            ? "Editor-Suche"
            : "Inventur suchen nach Datum, Jahr, Debitor, PLZ oder Ort"}
        </span>
        <Input
          ref={searchRef}
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          title={
            variant === "editor"
              ? "Nach LotId, Artikelnummer oder Produktname filtern"
              : "Suche nach dd.mm.yyyy, Jahr, Debitorname, Debitor-ID, PLZ oder Ort"
          }
          className="h-auto flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent placeholder:bg-transparent"
          autoComplete="off"
          spellCheck={false}
          aria-controls={variant === "home" ? "fileGrid" : undefined}
        />
        <kbd className="text-muted-foreground pointer-events-none hidden rounded-md border px-1.5 py-1 text-[10px] font-semibold sm:inline">
          {kbdHint}
        </kbd>
      </label>

      <div className="relative flex items-center justify-end gap-2 justify-self-end">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="bg-background text-muted-foreground size-9 rounded-none"
          aria-label="Theme umschalten"
          title="Theme"
          onClick={toggleTheme}
        >
          <HugeiconsIcon
            icon={theme === "light" ? Moon02Icon : Sun03Icon}
            size={18}
            strokeWidth={2}
          />
        </Button>

        <div className="relative" ref={settingsRef}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(
              "bg-background text-muted-foreground size-9 rounded-none",
              settingsOpen && "border-primary bg-primary/10 text-foreground"
            )}
            aria-label="Einstellungen"
            title="Einstellungen"
            aria-expanded={settingsOpen}
            aria-controls="settingsPanel"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <HugeiconsIcon icon={Settings01Icon} size={18} strokeWidth={2} />
          </Button>

          <div
            id="settingsPanel"
            role="region"
            aria-label="Einstellungen"
            hidden={!settingsOpen}
            className={cn(
              "bg-popover text-popover-foreground absolute top-[calc(100%+8px)] right-0 z-40 w-80 overflow-hidden border shadow-[0_16px_40px_rgba(0,0,0,0.45)]",
              !settingsOpen && "hidden"
            )}
          >
            <div className="border-b px-3.5 py-3">
              <strong className="text-[13px] font-bold">Referenzkatalog</strong>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                Eine Excel-Datei mit den Tabellen <strong>GTIN</strong> und{" "}
                <strong>Debitoren</strong> lokal speichern. Bestehende Einträge
                werden nicht überschrieben.
              </p>
            </div>
            <div className="text-muted-foreground space-y-1 border-b px-3.5 py-2.5 text-xs">
              {catalogStats ? (
                <>
                  <p>
                    GTIN:{" "}
                    <strong className="text-foreground">
                      {catalogStats.gtin_count}
                    </strong>
                    {" · "}
                    Debitoren:{" "}
                    <strong className="text-foreground">
                      {catalogStats.debitor_count}
                    </strong>
                  </p>
                  {catalogStats.last_import_filename && (
                    <p
                      className="truncate"
                      title={catalogStats.last_import_filename}
                    >
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
                onClick={() => void handleImportCatalog()}
              >
                <HugeiconsIcon icon={Upload04Icon} size={16} strokeWidth={2} />
                {importing ? "Import läuft…" : "Excel importieren…"}
              </Button>
            </div>
            {variant === "home" && (
              <>
                <div className="border-b px-3.5 py-3">
                  <strong className="text-[13px] font-bold">Formulare</strong>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    Leeres Bestätigungsformular zum Ausdrucken und Vorhalten
                    im Außendienst (ohne Kundendaten).
                  </p>
                </div>
                <div className="p-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full justify-start gap-2 rounded-none"
                    disabled={downloadingForm}
                    aria-label="Bestätigungsformular als PDF herunterladen"
                    onClick={() => void handleDownloadBestaetigung()}
                  >
                    <HugeiconsIcon
                      icon={Download04Icon}
                      size={16}
                      strokeWidth={2}
                    />
                    {downloadingForm
                      ? "PDF wird erstellt…"
                      : "Bestätigungsformular (PDF)"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default AppTopbar
