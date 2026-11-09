import { ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AntennaIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  DatabaseIcon,
  FileExportIcon,
  FloppyDiskIcon,
  GridTableIcon,
  PackageIcon,
  PinIcon,
  Tag01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/core/ui/button"
import { cn } from "@/core/utils"

type EditorNavItem = {
  id: string
  name: string
  icon: ReactNode
}

export type EditorNavSection = {
  title: string
  items: EditorNavItem[]
}

type ExportPendingKind = "excel" | "pdf" | null

type EditorRailProps = {
  navSections: EditorNavSection[]
  activeTab: string
  onTabChange: (id: string) => void
  onSave: () => void
  onDownloadExcel: () => void
  onDownloadPdf: () => void
  onMarkDone: () => void
  onClose: () => void
  savePending?: boolean
  exportPending?: ExportPendingKind
  stichprobenComplete?: boolean
  projectDone?: boolean
}

export const defaultEditorNavSections: EditorNavSection[] = [
  {
    title: "Bestände",
    items: [
      {
        id: "erp",
        name: "ERP",
        icon: <HugeiconsIcon icon={DatabaseIcon} size={16} strokeWidth={2} />,
      },
      {
        id: "offenePosten",
        name: "Offene Posten",
        icon: <HugeiconsIcon icon={PackageIcon} size={16} strokeWidth={2} />,
      },
      {
        id: "rfid",
        name: "RFID",
        icon: <HugeiconsIcon icon={AntennaIcon} size={16} strokeWidth={2} />,
      },
    ],
  },
  {
    title: "Vergleiche",
    items: [
      {
        id: "lotId",
        name: "LotId",
        icon: <HugeiconsIcon icon={PinIcon} size={16} strokeWidth={2} />,
      },
      {
        id: "artikelNr",
        name: "Artikelnummer",
        icon: <HugeiconsIcon icon={Tag01Icon} size={16} strokeWidth={2} />,
      },
    ],
  },
]

const EditorRail = ({
  navSections,
  activeTab,
  onTabChange,
  onSave,
  onDownloadExcel,
  onDownloadPdf,
  onMarkDone,
  onClose,
  savePending = false,
  exportPending = null,
  stichprobenComplete = false,
  projectDone = false,
}: EditorRailProps) => {
  const exportBusy = exportPending !== null
  const exportBlockedHint = stichprobenComplete
    ? undefined
    : "Stichproben-Quote noch nicht erfüllt"
  const exportBusyHint = exportBusy
    ? "Export läuft – bitte warten"
    : exportBlockedHint

  return (
    <aside
      className="bg-card border-border flex h-full w-56 shrink-0 flex-col justify-between border-r"
      aria-label="Editor-Navigation"
    >
      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
        {navSections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <h2 className="text-muted-foreground mb-1 px-3 text-xs font-semibold tracking-wider uppercase">
              {section.title}
            </h2>
            {section.items.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium transition-colors",
                    "focus-visible:ring-ring outline-none focus-visible:ring-2",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="shrink-0" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="truncate">{item.name}</span>
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="border-border flex flex-col gap-2 border-t p-4">
        <Button
          type="button"
          className="w-full rounded-none"
          onClick={onSave}
          disabled={savePending}
          aria-label="Inventur speichern"
        >
          <HugeiconsIcon icon={FloppyDiskIcon} size={16} strokeWidth={2} />
          {savePending ? "Speichert…" : "Speichern"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full rounded-none"
          onClick={onDownloadExcel}
          disabled={exportBusy}
          aria-busy={exportPending === "excel"}
          aria-label={
            exportPending === "excel"
              ? "Excel wird erstellt"
              : "Excel herunterladen"
          }
          title={exportBusyHint}
        >
          <HugeiconsIcon icon={GridTableIcon} size={16} strokeWidth={2} />
          {exportPending === "excel" ? "Excel wird erstellt…" : "Excel"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full rounded-none"
          onClick={onDownloadPdf}
          disabled={exportBusy}
          aria-busy={exportPending === "pdf"}
          aria-label={
            exportPending === "pdf" ? "PDF wird erstellt" : "PDF herunterladen"
          }
          title={exportBusyHint}
        >
          <HugeiconsIcon icon={FileExportIcon} size={16} strokeWidth={2} />
          {exportPending === "pdf" ? "PDF wird erstellt…" : "PDF"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full rounded-none"
          onClick={onMarkDone}
          disabled={projectDone || exportBusy}
          aria-label="Inventur als fertig markieren"
          title={
            projectDone
              ? "Inventur bereits fertig"
              : exportBusyHint
          }
        >
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            size={16}
            strokeWidth={2}
          />
          {projectDone ? "Fertig" : "Fertig melden"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full rounded-none"
          onClick={onClose}
          aria-label="Editor schließen"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
          Schließen
        </Button>
      </div>
    </aside>
  )
}

export default EditorRail
