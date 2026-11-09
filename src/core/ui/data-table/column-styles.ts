import type { CSSProperties } from "react"
import type {
  ColumnPinningPosition,
  ColumnSizingState,
  RowData,
} from "@tanstack/react-table"
import type { DataTableColumn } from "@/core/ui/data-table/features"

export type ColumnMeta = {
  cellClassName?:
    | string
    | ((row: unknown, value: unknown) => string)
  numeric?: boolean
  tooltip?: string
  /** Absorb leftover viewport width under min-w-full (no maxWidth). */
  flex?: boolean
}

export const getColumnMeta = <TData extends RowData>(
  column: DataTableColumn<TData>
): ColumnMeta => {
  const meta = column.columnDef.meta
  if (typeof meta !== "object" || meta == null) return {}
  return meta as ColumnMeta
}

export const hasExplicitSize = <TData extends RowData>(
  column: DataTableColumn<TData>
) => column.columnDef.size !== undefined

export const getPinnedStyle = (
  isPinned: ColumnPinningPosition,
  offset: number,
  isHeader: boolean
): CSSProperties | undefined => {
  if (!isPinned) return undefined

  // Later start-pinned columns (higher offset) stack above earlier ones.
  // Keep this well above header filters (z-0) and plain sticky headers (z-2).
  const fill = isHeader ? "var(--muted)" : "var(--card)"
  const stackBase = isHeader ? 30 : 10

  return {
    position: "sticky",
    insetInlineStart: isPinned === "start" ? `${offset}px` : undefined,
    insetInlineEnd: isPinned === "end" ? `${offset}px` : undefined,
    zIndex: stackBase + Math.round(offset),
    backgroundColor: fill,
  }
}

/** Lock pinned cell width to getSize() so pinned columns keep their declared width. */
export const getPinnedWidthStyle = <TData extends RowData>(
  column: DataTableColumn<TData>,
  isPinned: ColumnPinningPosition,
  widthStyle: CSSProperties
): CSSProperties => {
  if (!isPinned) return widthStyle

  const size = column.getSize()
  if (size <= 0) return widthStyle

  return {
    ...widthStyle,
    width: size,
    minWidth: size,
    maxWidth: size,
  }
}

export const getColumnWidthStyle = <TData extends RowData>(
  column: DataTableColumn<TData>,
  columnSizing: ColumnSizingState
): CSSProperties => {
  const def = column.columnDef
  const meta = getColumnMeta(column)
  const explicit = hasExplicitSize(column)
  const measured = columnSizing[column.id]
  const raw = explicit
    ? column.getSize()
    : measured != null
      ? measured
      : undefined

  if (raw == null && def.minSize == null) return {}

  const size = Math.max(raw ?? 0, def.minSize ?? 0)
  if (size <= 0) return {}

  const style: CSSProperties = {
    width: size,
    minWidth: def.minSize ?? size,
  }

  if (meta.flex) {
    if (def.maxSize != null) style.maxWidth = def.maxSize
    return style
  }

  style.maxWidth = def.maxSize ?? size
  return style
}

export const sizingChanged = (
  prev: ColumnSizingState,
  next: ColumnSizingState
): boolean => {
  const prevKeys = Object.keys(prev)
  const nextKeys = Object.keys(next)
  if (prevKeys.length !== nextKeys.length) return true
  for (const key of nextKeys) {
    if (Math.abs((prev[key] ?? 0) - (next[key] ?? 0)) >= 1) return true
  }
  return false
}

export const pinnedOffsetsChanged = (
  prev: Record<string, number>,
  next: Record<string, number>
): boolean => {
  const prevKeys = Object.keys(prev)
  const nextKeys = Object.keys(next)
  if (prevKeys.length !== nextKeys.length) return true
  for (const key of nextKeys) {
    if (Math.abs((prev[key] ?? 0) - (next[key] ?? 0)) >= 0.5) return true
  }
  return false
}

/** Sticky offset for a column: end-pinned offsets come from TanStack, start offsets from measured headers. */
export const getPinnedOffset = <TData extends RowData>(
  column: DataTableColumn<TData>,
  pinnedStartOffsets: Record<string, number>
) =>
  column.getIsPinned() === "end"
    ? column.getAfter("end")
    : (pinnedStartOffsets[column.id] ?? 0)
