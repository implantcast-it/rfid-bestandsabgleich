import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon, PencilEdit01Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { normalizeSearchText } from "@/lib/search"
import DeleteInventurDialog from "@/components/ui/DeleteInventurDialog"
import RenameInventurDialog from "@/components/ui/RenameInventurDialog"

type FileStatus = "open" | "exported" | "done"

/** Inventur library card — searchable by date, year, debitor, PLZ, city. */
export type InventurFile = {
  id: string
  /** Debitor / Kundenname shown as card title. */
  title: string
  /** Debitorenkonto / Debitor-ID. */
  debitor: string
  plz: string
  ort: string
  /** Inventurdatum as ISO `YYYY-MM-DD` (canonical for year / dd.mm.yyyy search). */
  inventurDate: string
  /** Stichprobe progress as `done/required` (required = ceil 1% ERP qty). */
  formats: string
  /** Relative / short updated-at label under the card. */
  date: string
  status: FileStatus
}

type InventurenFileGridProps = {
  files?: InventurFile[]
  inventurjahr?: string
  searchQuery: string
  onOpenFile?: (id: string) => void
  onRenameFile?: (id: string, title: string) => void
  onDeleteFile?: (id: string) => void
}

const statusLabel: Record<FileStatus, string> = {
  open: "Offen",
  exported: "Exportiert",
  done: "Fertig",
}

const statusBadgeClass: Record<FileStatus, string> = {
  open: "text-[#8aaba6]",
  exported: "text-[#8a9bb0]",
  done: "text-[#8aa894]",
}

const FILTERS = [
  { value: "all", label: "Alle" },
  { value: "open", label: "Offen" },
  { value: "exported", label: "Exportiert" },
  { value: "done", label: "Fertig" },
] as const

/** Format ISO date as German `dd.mm.yyyy`. */
const formatInventurDateDe = (isoDate: string) => {
  const [year, month, day] = isoDate.split("-")
  if (!year || !month || !day) return isoDate
  return `${day}.${month}.${year}`
}

const inventurYear = (isoDate: string) => isoDate.slice(0, 4)

const formatLocation = (file: InventurFile) => {
  const plz = file.plz.trim()
  const ort = file.ort.trim()
  if (plz && ort) return `${plz} ${ort}`
  return plz || ort
}

const formatFileAriaLabel = (file: InventurFile, action?: "open") => {
  const parts = [
    action === "open" ? `${file.title} öffnen` : file.title,
    `Status ${statusLabel[file.status]}`,
  ]
  const location = formatLocation(file)
  if (location) parts.push(location)
  if (file.debitor.trim()) parts.push(`Debitor ${file.debitor.trim()}`)
  if (file.inventurDate) {
    parts.push(`Inventur ${formatInventurDateDe(file.inventurDate)}`)
  }
  return parts.join(", ")
}

const matchesInventurSearch = (file: InventurFile, rawQuery: string) => {
  const query = normalizeSearchText(rawQuery)
  if (!query) return true

  const dateDe = formatInventurDateDe(file.inventurDate)
  const year = inventurYear(file.inventurDate)

  const fields = [
    file.title,
    file.debitor,
    file.plz,
    file.ort,
    dateDe,
    year,
    "Stichprobe",
    file.formats,
    statusLabel[file.status],
  ]

  return fields.some((field) => normalizeSearchText(field).includes(query))
}

const InventurenFileGrid = ({
  files = [],
  inventurjahr = String(new Date().getFullYear()),
  searchQuery,
  onOpenFile,
  onRenameFile,
  onDeleteFile,
}: InventurenFileGridProps) => {
  const [filter, setFilter] = useState<string>("all")
  const [pendingRename, setPendingRename] = useState<InventurFile | null>(null)
  const [pendingDelete, setPendingDelete] = useState<InventurFile | null>(null)

  const visible = useMemo(() => {
    return files.filter((file) => {
      if (filter !== "all" && file.status !== filter) return false
      return matchesInventurSearch(file, searchQuery)
    })
  }, [filter, files, searchQuery])

  const handleFilterClick = (value: string) => {
    setFilter(value)
  }

  const handleFilterKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    value: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      setFilter(value)
    }
  }

  const handleRequestRename = (
    event: React.MouseEvent<HTMLButtonElement>,
    file: InventurFile
  ) => {
    event.preventDefault()
    event.stopPropagation()
    setPendingRename(file)
  }

  const handleRenameDialogChange = (open: boolean) => {
    if (!open) setPendingRename(null)
  }

  const handleConfirmRename = (nextTitle: string) => {
    if (!pendingRename) return

    const renamed = pendingRename
    onRenameFile?.(renamed.id, nextTitle)
    setPendingRename(null)
    toast.success("Inventur umbenannt", {
      description: `Neuer Titel: „${nextTitle}“.`,
    })
  }

  const handleRequestDelete = (
    event: React.MouseEvent<HTMLButtonElement>,
    file: InventurFile
  ) => {
    event.preventDefault()
    event.stopPropagation()
    setPendingDelete(file)
  }

  const handleDeleteDialogChange = (open: boolean) => {
    if (!open) setPendingDelete(null)
  }

  const handleConfirmDelete = () => {
    if (!pendingDelete) return

    const deleted = pendingDelete
    onDeleteFile?.(deleted.id)
    setPendingDelete(null)
    toast.success("Inventur gelöscht", {
      description: `„${deleted.title}“ wurde entfernt.`,
    })
  }

  const emptyMessage =
    files.length === 0
      ? "Noch keine Inventuren. Starte einen Abgleich oder lies eine bestehende Datei ein."
      : "Keine Inventuren gefunden."

  return (
    <section
      className="flex min-w-0 max-w-full flex-col gap-2.5"
      aria-labelledby="libraryTitle"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h2
          id="libraryTitle"
          className="text-sm font-bold tracking-[-0.01em]"
        >
          Inventuren {inventurjahr}
        </h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-muted-foreground text-xs font-medium">
            {visible.length} Datei{visible.length === 1 ? "" : "en"}
          </span>
          <div
            className="bg-background inline-flex rounded-full border p-0.5"
            role="group"
            aria-label="Inventuren filtern"
          >
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                onClick={() => handleFilterClick(item.value)}
                onKeyDown={(event) => handleFilterKeyDown(event, item.value)}
                className={cn(
                  "h-6 rounded-full px-2.5 text-[11px] font-bold transition-colors",
                  filter === item.value
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ul
        id="fileGrid"
        className={cn(
          "grid w-full min-w-0 max-w-full grid-cols-[repeat(auto-fit,minmax(210px,1fr))] content-start justify-between gap-3 px-0.5 pt-0.5 pb-3",
          visible.length === 0 && "grid-cols-1"
        )}
        role="list"
      >
        {visible.map((file) => {
          const location = formatLocation(file)
          const debitor = file.debitor.trim()
          const inventurDateDe = file.inventurDate
            ? formatInventurDateDe(file.inventurDate)
            : ""
          const groupLabel = formatFileAriaLabel(file)
          const openLabel = formatFileAriaLabel(file, "open")

          return (
            <li key={file.id} className="min-w-0 w-full self-start">
              <div
                className={cn("file-card group w-full", `is-${file.status}`)}
                role="group"
                aria-label={groupLabel}
              >
                <button
                  type="button"
                  onClick={() => onOpenFile?.(file.id)}
                  className="absolute inset-0 z-0 grid grid-rows-[auto_auto_1fr_auto] gap-2 p-[18px_15px_15px] text-left"
                  aria-label={openLabel}
                  tabIndex={0}
                >
                  <span
                    className={cn(
                      "pr-3.5 text-[11.5px] font-semibold tracking-[0.01em] leading-none",
                      statusBadgeClass[file.status]
                    )}
                  >
                    {statusLabel[file.status]}
                  </span>
                  <span className="line-clamp-2 pr-1.5 text-[14.5px] font-bold tracking-[-0.025em] leading-tight">
                    {file.title}
                  </span>
                  <span className="text-muted-foreground flex min-h-0 flex-col gap-0.5 self-start text-[12.5px] leading-snug">
                    {debitor ? (
                      <span className="truncate">Debitor · {debitor}</span>
                    ) : null}
                    {location ? (
                      <span className="truncate">{location}</span>
                    ) : null}
                    {inventurDateDe ? (
                      <span className="truncate">
                        Inventur · {inventurDateDe}
                      </span>
                    ) : null}
                    {file.formats ? (
                      <span className="truncate">
                        Stichprobe · {file.formats}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "text-muted-foreground truncate text-[11.5px] font-semibold",
                      "pb-0 transition-[padding-bottom] duration-200 ease-out",
                      "group-hover:pb-11 group-focus-within:pb-11"
                    )}
                  >
                    Aktualisiert · {file.date}
                  </span>
                </button>

                <div
                  className={cn(
                    "absolute inset-x-0 bottom-0 z-10 flex h-9",
                    "translate-y-full opacity-0 transition-[transform,opacity] duration-200 ease-out",
                    "group-hover:translate-y-0 group-hover:opacity-100",
                    "group-focus-within:translate-y-0 group-focus-within:opacity-100"
                  )}
                >
                  <button
                    type="button"
                    onClick={(event) => handleRequestRename(event, file)}
                    className={cn(
                      "flex h-full flex-1 items-center justify-center gap-1.5",
                      "bg-[#d8d8d8] text-[#555] text-[11.5px] font-bold hover:bg-[#cbcbcb] hover:text-[#333]",
                      "dark:bg-[#3a3a3a] dark:text-[#c8c8c8] dark:hover:bg-[#454545] dark:hover:text-white",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    )}
                    aria-label={`${file.title} umbenennen`}
                    tabIndex={0}
                  >
                    <HugeiconsIcon
                      icon={PencilEdit01Icon}
                      size={14}
                      strokeWidth={2.2}
                    />
                    Umbenennen
                  </button>
                  <button
                    type="button"
                    onClick={(event) => handleRequestDelete(event, file)}
                    className={cn(
                      "flex h-full flex-1 items-center justify-center gap-1.5 border-l border-[#c4c4c4]",
                      "bg-[#d8d8d8] text-[#555] text-[11.5px] font-bold hover:bg-[#cbcbcb] hover:text-[#333]",
                      "dark:border-[#4a4a4a] dark:bg-[#3a3a3a] dark:text-[#c8c8c8] dark:hover:bg-[#454545] dark:hover:text-white",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    )}
                    aria-label={`${file.title} löschen`}
                    tabIndex={0}
                  >
                    <HugeiconsIcon
                      icon={Delete02Icon}
                      size={14}
                      strokeWidth={2.2}
                    />
                    Löschen
                  </button>
                </div>
              </div>
            </li>
          )
        })}
        {visible.length === 0 && (
          <li
            className="text-muted-foreground w-full border border-dashed px-4 py-7 text-center text-[13px]"
            aria-live="polite"
          >
            {emptyMessage}
          </li>
        )}
      </ul>

      <RenameInventurDialog
        open={pendingRename !== null}
        fileTitle={pendingRename?.title ?? ""}
        onOpenChange={handleRenameDialogChange}
        onConfirm={handleConfirmRename}
      />
      <DeleteInventurDialog
        open={pendingDelete !== null}
        fileTitle={pendingDelete?.title ?? ""}
        onOpenChange={handleDeleteDialogChange}
        onConfirm={handleConfirmDelete}
      />
    </section>
  )
}

export default InventurenFileGrid
