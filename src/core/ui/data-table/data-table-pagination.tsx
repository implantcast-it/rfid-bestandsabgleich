import { Button } from "@/core/ui/button"
import { FieldSelect } from "@/core/ui/field-select"

const PAGE_SIZE_OPTIONS = [20, 50, 100, 500, 1000, 2000] as const

type DataTablePaginationProps = {
  filteredCount: number
  selectedCount: number
  enableRowSelection: boolean
  pageSize: number
  pageIndex: number
  pageCount: number
  onPageSizeChange: (size: number) => void
  onPreviousPage: () => void
  onNextPage: () => void
  canPreviousPage: boolean
  canNextPage: boolean
}

export const DataTablePagination = ({
  filteredCount,
  selectedCount,
  enableRowSelection,
  pageSize,
  pageIndex,
  pageCount,
  onPageSizeChange,
  onPreviousPage,
  onNextPage,
  canPreviousPage,
  canNextPage,
}: DataTablePaginationProps) => (
  <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2">
    <div className="text-muted-foreground flex items-center gap-3 text-xs font-medium">
      <span>
        {filteredCount} Zeile{filteredCount === 1 ? "" : "n"}
      </span>
      {enableRowSelection ? <span>{selectedCount} ausgewählt</span> : null}
      <label className="flex items-center gap-1.5">
        <span className="sr-only">Seitengröße</span>
        <FieldSelect
          value={String(pageSize)}
          onValueChange={(next) => onPageSizeChange(Number(next))}
          aria-label="Seitengröße"
          triggerClassName="h-6 w-auto min-w-[7.5rem] rounded-none px-1.5 text-[11px] font-semibold"
          options={PAGE_SIZE_OPTIONS.map((size) => ({
            value: String(size),
            label: `${size} / Seite`,
          }))}
        />
      </label>
    </div>

    <div className="inline-flex items-center gap-1 rounded-full border bg-background p-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 rounded-full px-2.5 text-[11px] font-bold"
        onClick={onPreviousPage}
        disabled={!canPreviousPage}
        aria-label="Vorherige Seite"
      >
        Zurück
      </Button>
      <span className="text-muted-foreground px-2 text-[11px] font-bold tabular-nums">
        Seite {pageCount === 0 ? 0 : pageIndex + 1} / {pageCount}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 rounded-full px-2.5 text-[11px] font-bold"
        onClick={onNextPage}
        disabled={!canNextPage}
        aria-label="Nächste Seite"
      >
        Weiter
      </Button>
    </div>
  </div>
)

export { PAGE_SIZE_OPTIONS }
