import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/ui/select"
import { cn } from "@/core/utils"
import type { InventurFile } from "@/domains/projects"
import DeleteInventurDialog from "@/features/home/DeleteInventurDialog"
import { InventurFileCard } from "@/features/home/InventurFileCard"
import { matchesInventurSearch } from "@/features/home/inventur-file-format"
import RenameInventurDialog from "@/features/home/RenameInventurDialog"

export type { InventurFile }

type InventurenFileGridProps = {
  files?: InventurFile[]
  inventurjahr?: string
  yearOptions?: string[]
  searchQuery: string
  onInventurjahrChange?: (year: string) => void
  onOpenFile?: (id: string) => void
  onRenameFile?: (id: string, title: string) => void
  onDeleteFile?: (id: string) => void
}

const FILTERS = [
  { value: "all", label: "Alle" },
  { value: "open", label: "Offen" },
  { value: "exported", label: "Exportiert" },
  { value: "done", label: "Fertig" },
] as const

const InventurenFileGrid = ({
  files = [],
  inventurjahr = String(new Date().getFullYear()),
  yearOptions,
  searchQuery,
  onInventurjahrChange,
  onOpenFile,
  onRenameFile,
  onDeleteFile,
}: InventurenFileGridProps) => {
  const [filter, setFilter] = useState<string>("all")
  const [pendingRename, setPendingRename] = useState<InventurFile | null>(null)
  const [pendingDelete, setPendingDelete] = useState<InventurFile | null>(null)

  const years = useMemo(() => {
    const options = yearOptions?.length ? [...yearOptions] : [inventurjahr]
    if (!options.includes(inventurjahr)) options.unshift(inventurjahr)
    return options
  }, [inventurjahr, yearOptions])

  const handleInventurjahrChange = (value: string | null) => {
    if (!value || value === inventurjahr) return
    onInventurjahrChange?.(value)
  }

  const visible = useMemo(() => {
    return files.filter((file) => {
      if (!file.inventurDate.startsWith(inventurjahr)) return false
      if (filter !== "all" && file.status !== filter) return false
      return matchesInventurSearch(file, searchQuery)
    })
  }, [filter, files, inventurjahr, searchQuery])

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

  const yearFiles = useMemo(
    () => files.filter((file) => file.inventurDate.startsWith(inventurjahr)),
    [files, inventurjahr]
  )

  const emptyMessage =
    yearFiles.length === 0
      ? `Noch keine Inventuren für ${inventurjahr}. Starte einen Abgleich oder lies eine bestehende Datei ein.`
      : "Keine Inventuren gefunden."

  return (
    <section
      className="flex min-w-0 max-w-full flex-col gap-2.5"
      aria-labelledby="libraryTitle"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h2
            id="libraryTitle"
            className="text-sm font-bold tracking-[-0.01em]"
          >
            Inventuren
          </h2>
          <Select
            value={inventurjahr}
            onValueChange={handleInventurjahrChange}
          >
            <SelectTrigger
              size="sm"
              className="h-7 rounded-none px-2 text-[12px] font-semibold"
              aria-label="Inventurjahr wählen"
              aria-controls="fileGrid"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
        className="grid w-full min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3"
      >
        {visible.map((file) => (
          <li key={file.id} className="min-w-0 w-full self-start">
            <InventurFileCard
              file={file}
              onOpen={onOpenFile}
              onRename={handleRequestRename}
              onDelete={handleRequestDelete}
            />
          </li>
        ))}
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
