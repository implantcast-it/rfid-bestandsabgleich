import { memo, type KeyboardEvent, type MouseEvent } from "react"
import { flexRender, type ColumnPinningState, type ColumnSizingState, type RowData } from "@tanstack/react-table"
import { cn } from "@/core/utils"
import {
  getColumnMeta,
  getColumnWidthStyle,
  getPinnedOffset,
  getPinnedStyle,
  getPinnedWidthStyle,
} from "@/core/ui/data-table/column-styles"
import type {
  DataTableColumnDef,
  DataTableRow,
} from "@/core/ui/data-table/features"

export type DataTableBodyRowProps<TData extends RowData> = {
  row: DataTableRow<TData>
  isOddRow: boolean
  isSelected: boolean
  enableRowSelection: boolean
  /** Only compared: a new column set rebuilds the cell renderers. */
  columns: DataTableColumnDef<TData>[]
  columnSizing: ColumnSizingState
  /** Only compared: cells read pinning through their column at render time. */
  columnPinning: ColumnPinningState
  pinnedStartOffsets: Record<string, number>
  onRowClick: (
    event: MouseEvent<HTMLTableRowElement>,
    row: DataTableRow<TData>
  ) => void
  onRowKeyDown: (
    event: KeyboardEvent<HTMLTableRowElement>,
    row: DataTableRow<TData>
  ) => void
}

const DataTableBodyRowView = <TData extends RowData>({
  row,
  isOddRow,
  isSelected,
  enableRowSelection,
  columnSizing,
  pinnedStartOffsets,
  onRowClick,
  onRowKeyDown,
}: DataTableBodyRowProps<TData>) => (
  <tr
    className={cn(
      "border-border border-b transition-colors",
      isOddRow && "bg-foreground/[0.015]",
      "hover:bg-foreground/[0.03]",
      isSelected && "bg-primary/10 hover:bg-primary/15",
      enableRowSelection && "cursor-pointer"
    )}
    data-selected={isSelected || undefined}
    onClick={
      enableRowSelection ? (event) => onRowClick(event, row) : undefined
    }
    onKeyDown={
      enableRowSelection ? (event) => onRowKeyDown(event, row) : undefined
    }
    tabIndex={enableRowSelection ? -1 : undefined}
    aria-selected={enableRowSelection ? isSelected : undefined}
  >
    {row.getAllCells().map((cell) => {
      const isPinned = cell.column.getIsPinned()
      const offset = getPinnedOffset(cell.column, pinnedStartOffsets)
      const meta = getColumnMeta(cell.column)
      const value = cell.getValue()
      const dynamicClass =
        typeof meta.cellClassName === "function"
          ? meta.cellClassName(row.original, value)
          : typeof meta.cellClassName === "string"
            ? meta.cellClassName
            : ""
      const pinnedStyle = getPinnedStyle(isPinned, offset, false)
      const widthStyle = getColumnWidthStyle(cell.column, columnSizing)
      const pinnedWidthStyle = getPinnedWidthStyle(
        cell.column,
        isPinned,
        widthStyle
      )

      return (
        <td
          key={cell.id}
          data-cell-column-id={cell.column.id}
          style={{
            ...(isPinned && isSelected
              ? {
                  ...pinnedStyle,
                  backgroundColor:
                    "color-mix(in oklch, var(--primary) 10%, var(--card))",
                }
              : pinnedStyle),
            ...pinnedWidthStyle,
          }}
          className={cn(
            "relative h-9 overflow-hidden px-2.5 align-middle whitespace-nowrap",
            isPinned && "bg-card",
            isSelected && isPinned && "bg-primary/10",
            meta.numeric && "text-center font-bold tabular-nums",
            dynamicClass
          )}
        >
          {isPinned ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundColor: isSelected
                  ? "color-mix(in oklch, var(--primary) 10%, var(--card))"
                  : "var(--card)",
              }}
            />
          ) : null}
          <div className="relative z-[1]">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        </td>
      )
    })}
  </tr>
)

/** Keeps unchanged rows from re-rendering on edits, searches, and selection of other rows. */
const areBodyRowPropsEqual = <TData extends RowData>(
  prev: DataTableBodyRowProps<TData>,
  next: DataTableBodyRowProps<TData>
) =>
  prev.row.original === next.row.original &&
  prev.isOddRow === next.isOddRow &&
  prev.isSelected === next.isSelected &&
  prev.enableRowSelection === next.enableRowSelection &&
  prev.columns === next.columns &&
  prev.columnSizing === next.columnSizing &&
  prev.columnPinning === next.columnPinning &&
  prev.pinnedStartOffsets === next.pinnedStartOffsets

export const DataTableBodyRow = memo(
  DataTableBodyRowView,
  areBodyRowPropsEqual
) as typeof DataTableBodyRowView
