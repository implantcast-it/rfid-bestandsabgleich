import { HugeiconsIcon } from "@hugeicons/react"
import {
  MagicWand01Icon,
  PlusSignIcon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/core/ui/button"
import { cn } from "@/core/utils"

type EditorSheetHeadProps = {
  title: string
  showTools?: boolean
  completedStichproben?: number
  requiredStichproben?: number
  onAutoCheck?: () => void
  onAutoFill?: () => void
  isBulkEditOpen?: boolean
  onBulkEditToggle?: () => void
}

const EditorSheetHead = ({
  title,
  showTools = false,
  completedStichproben,
  requiredStichproben = 0,
  onAutoCheck,
  onAutoFill,
  isBulkEditOpen = false,
  onBulkEditToggle,
}: EditorSheetHeadProps) => {
  const sampleTone =
    typeof completedStichproben === "number"
      ? completedStichproben >= requiredStichproben
        ? "text-emerald-600 dark:text-emerald-400"
        : completedStichproben === 0
          ? "text-red-600 dark:text-red-400"
          : "text-amber-600 dark:text-amber-400"
      : ""

  return (
    <div className="border-border flex flex-shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-baseline gap-3">
        <h1 className="font-heading truncate text-xl font-semibold tracking-tight">
          {title}
        </h1>
        {typeof completedStichproben === "number" && (
          <span
            className={cn(
              "text-muted-foreground text-sm font-semibold whitespace-nowrap",
              sampleTone
            )}
          >
            {completedStichproben}/{requiredStichproben} Stichproben
          </span>
        )}
      </div>

      {showTools && (
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-7 rounded-none px-2.5 text-sm"
            onClick={onAutoCheck}
            aria-label="Auto SIEB/INST"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={2} />
            <span className="max-w-[160px] truncate">Auto SIEB/INST</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-7 rounded-none px-2.5 text-sm"
            onClick={onAutoFill}
            aria-label="Auto-Kommentare"
          >
            <HugeiconsIcon icon={MagicWand01Icon} size={16} strokeWidth={2} />
            Auto-Kommentare
          </Button>
          {onBulkEditToggle && (
            <Button
              type="button"
              variant="secondary"
              className="h-7 rounded-none px-2.5 text-sm"
              aria-pressed={isBulkEditOpen}
              aria-controls="bulk-edit-panel"
              aria-label="Massenbearbeitung"
              onClick={onBulkEditToggle}
            >
              <HugeiconsIcon icon={Settings02Icon} size={16} strokeWidth={2} />
              Massenbearbeitung
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default EditorSheetHead
