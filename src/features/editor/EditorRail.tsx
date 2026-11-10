import { ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AntennaIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
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
  collapsed: boolean
  onToggleCollapsed: () => void
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
  collapsed,
  onToggleCollapsed,
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
      className={cn(
        "bg-card border-border flex h-full shrink-0 flex-col justify-between border-r transition-[width] duration-200",
        collapsed ? "w-16" : "w-56"
      )}
      aria-label="Editor-Navigation"
    >
      <nav
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-4 overflow-auto",
          collapsed ? "p-2" : "p-4"
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("self-end rounded-none", collapsed && "self-center")}
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Navigation ausklappen" : "Navigation einklappen"}
          aria-expanded={!collapsed}
          title={collapsed ? "Navigation ausklappen" : "Navigation einklappen"}
        >
          <HugeiconsIcon
            icon={collapsed ? ArrowRight01Icon : ArrowLeft01Icon}
            size={16}
            strokeWidth={2}
          />
        </Button>
        {navSections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            {!collapsed && (
              <h2 className="text-muted-foreground mb-1 px-3 text-xs font-semibold tracking-wider uppercase">
                {section.title}
              </h2>
            )}
            {section.items.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  aria-label={item.name}
                  aria-current={isActive ? "page" : undefined}
                  title={item.name}
                  className={cn(
                    "flex w-full items-center py-2 text-left text-sm font-medium transition-colors",
                    collapsed ? "justify-center px-0" : "gap-3 px-3",
                    "focus-visible:ring-ring outline-none focus-visible:ring-2",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="shrink-0" aria-hidden="true">
                    {item.icon}
                  </span>
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div
        className={cn(
          "border-border flex flex-col gap-2 border-t",
          collapsed ? "p-2" : "p-4"
        )}
      >
        <Button
          type="button"
          className={cn("w-full rounded-none", collapsed && "px-0")}
          onClick={onSave}
          disabled={savePending}
          aria-label={savePending ? "Inventur wird gespeichert" : "Inventur speichern"}
          title={collapsed ? "Inventur speichern" : undefined}
        >
          <HugeiconsIcon icon={FloppyDiskIcon} size={16} strokeWidth={2} />
          {!collapsed && (savePending ? "Speichert…" : "Speichern")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={cn("w-full rounded-none", collapsed && "px-0")}
          onClick={onDownloadExcel}
          disabled={exportBusy}
          aria-busy={exportPending === "excel"}
          aria-label={
            exportPending === "excel"
              ? "Excel wird erstellt"
              : "Excel herunterladen"
          }
          title={
            collapsed
              ? `Excel herunterladen${exportBusyHint ? ` – ${exportBusyHint}` : ""}`
              : exportBusyHint
          }
        >
          <HugeiconsIcon icon={GridTableIcon} size={16} strokeWidth={2} />
          {!collapsed && (exportPending === "excel" ? "Excel wird erstellt…" : "Excel")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={cn("w-full rounded-none", collapsed && "px-0")}
          onClick={onDownloadPdf}
          disabled={exportBusy}
          aria-busy={exportPending === "pdf"}
          aria-label={
            exportPending === "pdf" ? "PDF wird erstellt" : "PDF herunterladen"
          }
          title={
            collapsed
              ? `PDF herunterladen${exportBusyHint ? ` – ${exportBusyHint}` : ""}`
              : exportBusyHint
          }
        >
          <HugeiconsIcon icon={FileExportIcon} size={16} strokeWidth={2} />
          {!collapsed && (exportPending === "pdf" ? "PDF wird erstellt…" : "PDF")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={cn("w-full rounded-none", collapsed && "px-0")}
          onClick={onMarkDone}
          disabled={projectDone || exportBusy}
          aria-label="Inventur als fertig markieren"
          title={
            collapsed
              ? projectDone
                ? "Inventur bereits fertig"
                : `Fertig melden${exportBusyHint ? ` – ${exportBusyHint}` : ""}`
              : projectDone
                ? "Inventur bereits fertig"
                : exportBusyHint
          }
        >
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            size={16}
            strokeWidth={2}
          />
          {!collapsed && (projectDone ? "Fertig" : "Fertig melden")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={cn("w-full rounded-none", collapsed && "px-0")}
          onClick={onClose}
          aria-label="Editor schließen"
          title={collapsed ? "Editor schließen" : undefined}
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
          {!collapsed && "Schließen"}
        </Button>
      </div>
    </aside>
  )
}

export default EditorRail
