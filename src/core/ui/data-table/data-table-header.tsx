import { flexRender } from "@tanstack/react-table"
import type { ColumnSizingState, HeaderGroup, RowData } from "@tanstack/react-table"
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/core/utils"
import {
  getColumnMeta,
  getColumnWidthStyle,
  getPinnedOffset,
  getPinnedStyle,
  getPinnedWidthStyle,
} from "@/core/ui/data-table/column-styles"
import type { DataTableFeatures } from "@/core/ui/data-table/features"

type DataTableHeaderProps<TData extends RowData> = {
  headerGroups: HeaderGroup<DataTableFeatures, TData>[]
  columnSizing: ColumnSizingState
  pinnedStartOffsets: Record<string, number>
}

export const DataTableHeader = <TData extends RowData>({
  headerGroups,
  columnSizing,
  pinnedStartOffsets,
}: DataTableHeaderProps<TData>) => (
  <thead>
    {headerGroups.map((headerGroup) => (
      <tr key={headerGroup.id}>
        {headerGroup.headers.map((header) => {
          const isPinned = header.column.getIsPinned()
          const offset = getPinnedOffset(header.column, pinnedStartOffsets)
          const canSort = header.column.getCanSort()
          const sorted = header.column.getIsSorted()
          const canFilter = header.column.getCanFilter()
          const meta = getColumnMeta(header.column)
          const widthStyle = getColumnWidthStyle(header.column, columnSizing)
          const pinnedWidthStyle = getPinnedWidthStyle(
            header.column,
            isPinned,
            widthStyle
          )

          return (
            <th
              key={header.id}
              colSpan={header.colSpan}
              data-column-id={header.column.id}
              style={{
                ...getPinnedStyle(isPinned, offset, true),
                ...pinnedWidthStyle,
              }}
              className={cn(
                "border-border bg-muted text-muted-foreground sticky top-0 z-[2] border-b p-0 text-left align-bottom text-xs font-bold tracking-[0.05em] whitespace-nowrap uppercase",
                isPinned && "bg-muted z-[3]"
              )}
              title={meta.tooltip}
            >
              {isPinned ? (
                <div
                  aria-hidden
                  className="bg-muted pointer-events-none absolute inset-0"
                />
              ) : null}
              {header.isPlaceholder ? null : (
                <div className="relative z-[1] flex flex-col gap-1.5 overflow-hidden px-2.5 py-2">
                  {canSort ? (
                    <button
                      type="button"
                      data-col-label
                      className="hover:text-foreground focus-visible:text-foreground relative z-[1] inline-flex w-max cursor-pointer items-center gap-1 text-left outline-none"
                      onClick={header.column.getToggleSortingHandler()}
                      tabIndex={0}
                      aria-label={`Sortieren: ${String(header.column.columnDef.header)}`}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {sorted === "asc" ? (
                        <HugeiconsIcon
                          icon={ArrowUp01Icon}
                          strokeWidth={2}
                          className="size-3 shrink-0"
                        />
                      ) : null}
                      {sorted === "desc" ? (
                        <HugeiconsIcon
                          icon={ArrowDown01Icon}
                          strokeWidth={2}
                          className="size-3 shrink-0"
                        />
                      ) : null}
                    </button>
                  ) : (
                    <div
                      data-col-label
                      className="relative z-[1] inline-flex w-max items-center gap-1 text-left"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </div>
                  )}
                  {canFilter ? (
                    <input
                      type="search"
                      value={(header.column.getFilterValue() as string) ?? ""}
                      onChange={(event) =>
                        header.column.setFilterValue(event.target.value)
                      }
                      placeholder="Filtern…"
                      aria-label={`Filter ${String(header.column.columnDef.header)}`}
                      className="border-border bg-background text-foreground placeholder:text-muted-foreground relative z-0 h-6 w-full min-w-0 max-w-full rounded-none border px-1.5 text-xs font-medium tracking-normal normal-case outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/30"
                    />
                  ) : null}
                </div>
              )}
            </th>
          )
        })}
      </tr>
    ))}
  </thead>
)
