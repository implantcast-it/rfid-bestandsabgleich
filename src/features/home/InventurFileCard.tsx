import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon, PencilEdit01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/core/utils"
import type { InventurFile } from "@/domains/projects"
import {
  formatFileAriaLabel,
  formatInventurDateDe,
  formatLocation,
  statusBadgeClass,
  statusLabel,
} from "@/features/home/inventur-file-format"

type InventurFileCardProps = {
  file: InventurFile
  onOpen?: (id: string) => void
  onRename?: (
    event: React.MouseEvent<HTMLButtonElement>,
    file: InventurFile
  ) => void
  onDelete?: (
    event: React.MouseEvent<HTMLButtonElement>,
    file: InventurFile
  ) => void
}

export const InventurFileCard = ({
  file,
  onOpen,
  onRename,
  onDelete,
}: InventurFileCardProps) => {
  const location = formatLocation(file)
  const debitor = file.debitor.trim()
  const inventurDateDe = file.inventurDate
    ? formatInventurDateDe(file.inventurDate)
    : ""
  const groupLabel = formatFileAriaLabel(file)
  const openLabel = formatFileAriaLabel(file, "open")

  return (
    <div
      className={cn("file-card group w-full", `is-${file.status}`)}
      role="group"
      aria-label={groupLabel}
    >
      <button
        type="button"
        onClick={() => onOpen?.(file.id)}
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
          {location ? <span className="truncate">{location}</span> : null}
          {inventurDateDe ? (
            <span className="truncate">Inventur · {inventurDateDe}</span>
          ) : null}
          {file.formats ? (
            <span className="truncate">Stichprobe · {file.formats}</span>
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
          onClick={(event) => onRename?.(event, file)}
          className={cn(
            "flex h-full flex-1 items-center justify-center gap-1.5",
            "bg-[#d8d8d8] text-[#555] text-[11.5px] font-bold hover:bg-[#cbcbcb] hover:text-[#333]",
            "dark:bg-[#3a3a3a] dark:text-[#c8c8c8] dark:hover:bg-[#454545] dark:hover:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          )}
          aria-label={`${file.title} umbenennen`}
          tabIndex={0}
        >
          <HugeiconsIcon icon={PencilEdit01Icon} size={14} strokeWidth={2.2} />
          Umbenennen
        </button>
        <button
          type="button"
          onClick={(event) => onDelete?.(event, file)}
          className={cn(
            "flex h-full flex-1 items-center justify-center gap-1.5 border-l border-[#c4c4c4]",
            "bg-[#d8d8d8] text-[#555] text-[11.5px] font-bold hover:bg-[#cbcbcb] hover:text-[#333]",
            "dark:border-[#4a4a4a] dark:bg-[#3a3a3a] dark:text-[#c8c8c8] dark:hover:bg-[#454545] dark:hover:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          )}
          aria-label={`${file.title} löschen`}
          tabIndex={0}
        >
          <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={2.2} />
          Löschen
        </button>
      </div>
    </div>
  )
}
