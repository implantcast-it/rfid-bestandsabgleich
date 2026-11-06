import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  type ColumnSizingState,
  type FilterFn,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { FieldSelect } from "@/components/ui/field-select"

const PAGE_SIZE_OPTIONS = [20, 50, 100, 500, 1000, 2000] as const
const DEFAULT_PAGE_SIZE = 50
const FILTER_MIN_WIDTH = 72
/** Sort icon (size-3) + gap — reserved even when unsorted so the header never clips. */
const SORT_ICON_RESERVE = 16

type ColumnMeta = {
  cellClassName?:
    | string
    | ((row: unknown, value: unknown) => string)
  numeric?: boolean
  tooltip?: string
  /** Absorb leftover viewport width under min-w-full (no maxWidth). */
  flex?: boolean
}

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  globalFilter?: string
  onGlobalFilterChange?: (value: string) => void
  /** Limits topbar search to identity fields (LotId / ArtNr / …). */
  globalFilterFn?: FilterFn<TData>
  enableRowSelection?: boolean
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  getRowId?: (row: TData, index: number) => string
  initialColumnPinning?: ColumnPinningState
  className?: string
}

const getColumnMeta = <TData,>(column: Column<TData, unknown>): ColumnMeta => {
  const meta = column.columnDef.meta
  if (typeof meta !== "object" || meta == null) return {}
  return meta as ColumnMeta
}

const hasExplicitSize = <TData,>(column: Column<TData, unknown>) =>
  column.columnDef.size !== undefined

const getPinnedStyle = (
  isPinned: false | "left" | "right",
  offset: number,
  isHeader: boolean
): CSSProperties | undefined => {
  if (!isPinned) return undefined

  // Later left-pinned columns (higher offset) stack above earlier ones.
  // Keep this well above header filters (z-0) and plain sticky headers (z-2).
  const fill = isHeader ? "var(--muted)" : "var(--card)"
  const stackBase = isHeader ? 30 : 10

  return {
    position: "sticky",
    left: isPinned === "left" ? `${offset}px` : undefined,
    right: isPinned === "right" ? `${offset}px` : undefined,
    zIndex: stackBase + Math.round(offset),
    backgroundColor: fill,
  }
}

/** Lock pinned cell width to getSize() so pinned columns keep their declared width. */
const getPinnedWidthStyle = <TData,>(
  column: Column<TData, unknown>,
  isPinned: false | "left" | "right",
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

const getColumnWidthStyle = <TData,>(
  column: Column<TData, unknown>,
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

const sizingChanged = (
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

const pinnedOffsetsChanged = (
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

const DataTable = <TData,>({
  columns,
  data,
  globalFilter,
  onGlobalFilterChange,
  globalFilterFn,
  enableRowSelection = false,
  rowSelection,
  onRowSelectionChange,
  getRowId,
  initialColumnPinning,
  className,
}: DataTableProps<TData>) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })
  const [columnPinning] = useState<ColumnPinningState>(
    initialColumnPinning ?? { left: [], right: [] }
  )
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
  const [internalSelection, setInternalSelection] = useState<RowSelectionState>(
    {}
  )
  const lastSelectedRowIdRef = useRef<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const [pinnedLeftOffsets, setPinnedLeftOffsets] = useState<
    Record<string, number>
  >({})

  const selectionState = rowSelection ?? internalSelection
  const handleSelectionChange = onRowSelectionChange ?? setInternalSelection

  const memoData = useMemo(() => data, [data])
  const memoColumns = useMemo(() => columns, [columns])

  const table = useReactTable({
    data: memoData,
    columns: memoColumns,
    defaultColumn: {
      // Avoid TanStack's 150px default for unsized columns; measured sizes
      // land in columnSizing and drive getSize / sticky offsets.
      size: 0,
      minSize: 0,
    },
    state: {
      sorting,
      columnFilters,
      pagination,
      columnPinning,
      columnSizing,
      globalFilter: globalFilter ?? "",
      rowSelection: selectionState,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onColumnSizingChange: setColumnSizing,
    onGlobalFilterChange,
    onRowSelectionChange: enableRowSelection
      ? handleSelectionChange
      : undefined,
    enableRowSelection,
    enableMultiRowSelection: true,
    enableColumnPinning: true,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId,
  })

  const selectedCount = table.getSelectedRowModel().rows.length
  const filteredCount = table.getFilteredRowModel().rows.length
  const pageCount = table.getPageCount()

  useLayoutEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const measure = () => {
      setColumnSizing((prev) => {
        const next: ColumnSizingState = { ...prev }

        for (const header of table.getFlatHeaders()) {
          if (hasExplicitSize(header.column)) continue

          const th = container.querySelector(
            `th[data-column-id="${header.column.id}"]`
          )
          if (!(th instanceof HTMLElement)) continue

          const label = th.querySelector("[data-col-label]")
          const labelWidth =
            label instanceof HTMLElement ? label.scrollWidth : th.scrollWidth
          const canFilter = header.column.getCanFilter()
          const canSort = header.column.getCanSort()
          const sorted = header.column.getIsSorted()
          let width = Math.max(labelWidth, canFilter ? FILTER_MIN_WIDTH : 0)

          // Reserve sort icon space when unsorted (icon is not in the DOM yet)
          if (canSort && !sorted) width += SORT_ICON_RESERVE

          // Header horizontal padding (px-2.5 * 2)
          width += 20

          const cells = container.querySelectorAll(
            `td[data-cell-column-id="${header.column.id}"]`
          )
          cells.forEach((cell) => {
            if (!(cell instanceof HTMLElement)) return
            // Cell scrollWidth already includes horizontal padding
            width = Math.max(width, cell.scrollWidth)
          })

          const minSize = header.column.columnDef.minSize ?? 0
          next[header.column.id] = Math.ceil(Math.max(width, minSize))
        }

        if (!sizingChanged(prev, next)) return prev
        return next
      })
    }

    measure()

    const observer = new ResizeObserver(() => {
      measure()
    })
    observer.observe(container)

    return () => observer.disconnect()
    // table.getFlatHeaders() is read at measure time; depend on layout drivers only
    // so we do not re-subscribe every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    memoColumns,
    memoData,
    sorting,
    columnFilters,
    globalFilter,
    pagination.pageIndex,
    pagination.pageSize,
  ])

  // Sticky left offsets must equal the rendered widths of the pinned columns
  // before them. TanStack's getStart() sums getSize(), which is 0 for columns
  // without an explicit size, so the offsets are measured from the header.
  const measurePinnedLeftOffsets = useCallback(() => {
    const tableElement = tableRef.current
    if (!tableElement) return

    const headerCells = Array.from(
      tableElement.querySelectorAll<HTMLElement>("thead th")
    )
    const nextOffsets: Record<string, number> = {}
    let runningOffset = 0

    for (const columnId of columnPinning.left ?? []) {
      nextOffsets[columnId] = runningOffset
      const headerCell = headerCells.find(
        (cell) => cell.dataset.columnId === columnId
      )
      runningOffset += headerCell?.getBoundingClientRect().width ?? 0
    }

    setPinnedLeftOffsets((prev) =>
      pinnedOffsetsChanged(prev, nextOffsets) ? nextOffsets : prev
    )
  }, [columnPinning])

  const getPinnedOffset = (column: Column<TData, unknown>) =>
    column.getIsPinned() === "right"
      ? column.getAfter("right")
      : (pinnedLeftOffsets[column.id] ?? 0)

  // Re-measure after every render so offsets follow header width changes.
  // The state update is skipped when nothing moved.
  useLayoutEffect(() => {
    measurePinnedLeftOffsets()
  })

  useLayoutEffect(() => {
    const tableElement = tableRef.current
    if (!tableElement) return

    const observer = new ResizeObserver(measurePinnedLeftOffsets)
    observer.observe(tableElement)
    return () => observer.disconnect()
  }, [measurePinnedLeftOffsets])

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false
    return Boolean(
      target.closest(
        'button, input, textarea, select, a, label, [role="checkbox"], [role="combobox"], [data-slot="checkbox"]'
      )
    )
  }

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, row: Row<TData>) => {
    if (!enableRowSelection) return

    // Checkbox / control clicks own their toggle; still update the Shift anchor.
    if (isInteractiveTarget(event.target)) {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('[data-slot="checkbox"], [role="checkbox"]')
      ) {
        lastSelectedRowIdRef.current = row.id
      }
      return
    }

    const rowId = row.id
    const isToggle = event.ctrlKey || event.metaKey
    const isRange = event.shiftKey

    if (isRange && lastSelectedRowIdRef.current) {
      const visibleRows = table.getFilteredRowModel().rows
      const anchorIndex = visibleRows.findIndex(
        (item) => item.id === lastSelectedRowIdRef.current
      )
      const currentIndex = visibleRows.findIndex((item) => item.id === rowId)

      if (anchorIndex === -1 || currentIndex === -1) {
        handleSelectionChange({ [rowId]: true })
        lastSelectedRowIdRef.current = rowId
        return
      }

      const start = Math.min(anchorIndex, currentIndex)
      const end = Math.max(anchorIndex, currentIndex)
      const rangeSelection: RowSelectionState = {}
      for (let index = start; index <= end; index += 1) {
        rangeSelection[visibleRows[index].id] = true
      }
      handleSelectionChange(rangeSelection)
      return
    }

    if (isToggle) {
      row.toggleSelected(!row.getIsSelected())
      lastSelectedRowIdRef.current = rowId
      return
    }

    handleSelectionChange({ [rowId]: true })
    lastSelectedRowIdRef.current = rowId
  }

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    row: Row<TData>
  ) => {
    if (!enableRowSelection) return
    if (event.key !== " " && event.key !== "Enter") return
    if (isInteractiveTarget(event.target)) return

    event.preventDefault()
    const isToggle = event.ctrlKey || event.metaKey
    if (isToggle) {
      row.toggleSelected(!row.getIsSelected())
    } else {
      handleSelectionChange({ [row.id]: true })
    }
    lastSelectedRowIdRef.current = row.id
  }

  const autoColumnsReady = table
    .getAllLeafColumns()
    .filter((column) => !hasExplicitSize(column))
    .every((column) => columnSizing[column.id] != null)

  return (
    <div
      className={cn(
        // min-w-0: allow shrinking in a flex parent so THIS table scrolls
        // horizontally (sticky left only works on the scrolling ancestor).
        "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
        className
      )}
    >
      <div
        ref={scrollContainerRef}
        className="file-grid-scroll min-h-0 min-w-0 flex-1 overflow-auto"
      >
        <table
          ref={tableRef}
          className="w-max min-w-full border-separate border-spacing-0 text-[12.5px]"
          style={{
            tableLayout: autoColumnsReady ? "fixed" : "auto",
          }}
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isPinned = header.column.getIsPinned()
                  const offset = getPinnedOffset(header.column)
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  const canFilter = header.column.getCanFilter()
                  const meta = getColumnMeta(header.column)
                  const widthStyle = getColumnWidthStyle(
                    header.column,
                    columnSizing
                  )
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
                        // Do not combine `relative` with `sticky` — Tailwind
                        // order can make `relative` win and kill sticky pinning.
                        // Do not use `contain: paint` on this cell — it breaks sticky.
                        "border-border bg-muted text-muted-foreground sticky top-0 z-[2] border-b p-0 text-left align-bottom text-xs font-bold tracking-[0.05em] whitespace-nowrap uppercase",
                        isPinned && "bg-muted z-[3]"
                      )}
                      title={meta.tooltip}
                    >
                      {/* Opaque plate in the sticky cell's layer — covers filter
                          inputs from columns underneath (inputs otherwise win). */}
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
                              value={
                                (header.column.getFilterValue() as string) ??
                                ""
                              }
                              onChange={(event) =>
                                header.column.setFilterValue(
                                  event.target.value
                                )
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
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-muted-foreground px-2.5 py-8 text-center text-[12.5px]"
                >
                  Keine Zeilen gefunden
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, rowIndex) => {
                const isSelected = row.getIsSelected()
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-border border-b transition-colors",
                      rowIndex % 2 === 1 && "bg-foreground/[0.015]",
                      "hover:bg-foreground/[0.03]",
                      isSelected && "bg-primary/10 hover:bg-primary/15",
                      enableRowSelection && "cursor-pointer"
                    )}
                    data-selected={isSelected || undefined}
                    onClick={
                      enableRowSelection
                        ? (event) => handleRowClick(event, row)
                        : undefined
                    }
                    onKeyDown={
                      enableRowSelection
                        ? (event) => handleRowKeyDown(event, row)
                        : undefined
                    }
                    tabIndex={enableRowSelection ? -1 : undefined}
                    aria-selected={
                      enableRowSelection ? isSelected : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isPinned = cell.column.getIsPinned()
                      const offset = getPinnedOffset(cell.column)
                      const meta = getColumnMeta(cell.column)
                      const value = cell.getValue()
                      const dynamicClass =
                        typeof meta.cellClassName === "function"
                          ? meta.cellClassName(row.original, value)
                          : typeof meta.cellClassName === "string"
                            ? meta.cellClassName
                            : ""
                      const pinnedStyle = getPinnedStyle(
                        isPinned,
                        offset,
                        false
                      )
                      const widthStyle = getColumnWidthStyle(
                        cell.column,
                        columnSizing
                      )
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
                            meta.numeric &&
                              "text-center font-bold tabular-nums",
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
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2">
        <div className="text-muted-foreground flex items-center gap-3 text-xs font-medium">
          <span>
            {filteredCount} Zeile{filteredCount === 1 ? "" : "n"}
          </span>
          {enableRowSelection ? (
            <span>
              {selectedCount} ausgewählt
            </span>
          ) : null}
          <label className="flex items-center gap-1.5">
            <span className="sr-only">Seitengröße</span>
            <FieldSelect
              value={String(pagination.pageSize)}
              onValueChange={(next) => table.setPageSize(Number(next))}
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
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Vorherige Seite"
          >
            Zurück
          </Button>
          <span className="text-muted-foreground px-2 text-[11px] font-bold tabular-nums">
            Seite {pageCount === 0 ? 0 : pagination.pageIndex + 1} / {pageCount}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 rounded-full px-2.5 text-[11px] font-bold"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Nächste Seite"
          >
            Weiter
          </Button>
        </div>
      </div>
    </div>
  )
}

const SelectionCheckbox = ({
  checked,
  indeterminate,
  onCheckedChange,
  ariaLabel,
}: {
  checked: boolean
  indeterminate?: boolean
  onCheckedChange: (checked: boolean) => void
  ariaLabel: string
}) => {
  return (
    <Checkbox
      checked={checked}
      indeterminate={indeterminate}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      aria-label={ariaLabel}
      className="mx-auto"
    />
  )
}

export { DataTable, SelectionCheckbox }
