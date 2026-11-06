import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { FieldSelect } from "@/components/ui/field-select"

type BulkField = {
  id: string
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onValueChange: (value: string) => void
  onApply: () => void
  applyLabel?: string
}

type BulkEditPanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  fields: BulkField[]
}

const BulkEditPanel = ({
  open,
  onOpenChange,
  selectedCount,
  fields,
}: BulkEditPanelProps) => {
  if (!open) return null

  return (
    <div
      className="border-border bg-popover absolute right-[18px] bottom-[18px] z-20 grid w-[min(420px,calc(100%-36px))] border shadow-[0_18px_48px_rgba(0,0,0,0.5)]"
      role="dialog"
      aria-labelledby="bulk-edit-title"
      aria-modal="false"
    >
      <div className="border-border flex items-start justify-between gap-3 border-b px-3.5 py-3">
        <div>
          <strong
            id="bulk-edit-title"
            className="text-sm font-bold tracking-[-0.01em]"
          >
            Massenbearbeitung
          </strong>
          <div className="text-muted-foreground mt-0.5 text-xs font-medium">
            {selectedCount} Zeile{selectedCount === 1 ? "" : "n"} ausgewählt
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-none"
          onClick={() => onOpenChange(false)}
          aria-label="Massenbearbeitung schließen"
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      </div>

      <div className="grid gap-3 p-3.5">
        {fields.map((field) => (
          <div key={field.id} className="grid gap-1.5">
            <label
              htmlFor={field.id}
              className="text-muted-foreground text-xs font-bold tracking-[0.05em] uppercase"
            >
              {field.label}
            </label>
            <div className="flex gap-2">
              <FieldSelect
                id={field.id}
                value={field.value}
                onValueChange={field.onValueChange}
                options={field.options}
                aria-label={field.label}
                triggerClassName="h-8 flex-1 rounded-none px-2 text-sm"
              />
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-none px-3 text-sm font-semibold"
                onClick={field.onApply}
              >
                {field.applyLabel ?? "Anwenden"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { BulkEditPanel }
