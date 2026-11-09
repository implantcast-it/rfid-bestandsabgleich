import { useMemo, useRef, useState } from "react"
import {
  useTable,
  type ColumnFiltersState,
  type ColumnPinningState,
  type ColumnSizingState,
  type OnChangeFn,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table"
import { cn } from "@/core/utils"
import {
  dataTableFeatures,
  type DataTableColumnDef,
  type DataTableFilterFn,
} from "@/core/ui/data-table/features"
import { hasExplicitSize } from "@/core/ui/data-table/column-styles"
import { DataTableBodyRow } from "@/core/ui/data-table/data-table-body-row"
import { DataTableHeader } from "@/core/ui/data-table/data-table-header"
import { DataTablePagination } from "@/core/ui/data-table/data-table-pagination"
import { useColumnSizing } from "@/core/ui/data-table/use-column-sizing"
import { usePinnedOffsets } from "@/core/ui/data-table/use-pinned-offsets"
import { useRowSelectionHandlers } from "@/core/ui/data-table/use-row-selection-handlers"

const DEFAULT_PAGE_SIZE = 50

type DataTableProps<TData extends RowData> = {
  columns: DataTableColumnDef<TData>[]
  data: TData[]
  globalFilter?: string
  onGlobalFilterChange?: (value: string) => void
  /** Limits topbar search to identity fields (LotId / ArtNr / …). */
  globalFilterFn?: DataTableFilterFn<TData>
  /** Restricts the global search to these column ids; omit to search every column. */
  globalFilterColumnIds?: readonly string[]
  enableRowSelection?: boolean
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  getRowId?: (row: TData, index: number) => string
  initialColumnPinning?: Partial<ColumnPinningState>
  className?: string
}

const DataTable = <TData extends RowData>({
  columns,
  data,
  globalFilter,
  onGlobalFilterChange,
  globalFilterFn,
  globalFilterColumnIds,
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
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(
    () => ({
      start: initialColumnPinning?.start ?? [],
      end: initialColumnPinning?.end ?? [],
    })
  )
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
  const [internalSelection, setInternalSelection] = useState<RowSelectionState>(
    {}
  )
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const [pinnedStartOffsets, setPinnedStartOffsets] = useState<
    Record<string, number>
  >({})

  const selectionState = rowSelection ?? internalSelection
  const handleSelectionChange = onRowSelectionChange ?? setInternalSelection

  const memoData = useMemo(() => data, [data])
  const memoColumns = useMemo(() => columns, [columns])

  const table = useTable({
    features: dataTableFeatures,
    data: memoData,
    columns: memoColumns,
    defaultColumn: {
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
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
    onGlobalFilterChange,
    onRowSelectionChange: enableRowSelection
      ? handleSelectionChange
      : undefined,
    enableRowSelection,
    enableMultiRowSelection: true,
    enableColumnPinning: true,
    globalFilterFn,
    getColumnCanGlobalFilter: (column) =>
      !globalFilterColumnIds || globalFilterColumnIds.includes(column.id),
    getRowId,
  })

  const selectedCount = table.getSelectedRowModel().rows.length
  const filteredCount = table.getFilteredRowModel().rows.length
  const pageCount = table.getPageCount()

  useColumnSizing({
    scrollContainerRef,
    getFlatHeaders: () => table.getFlatHeaders(),
    setColumnSizing,
    memoColumns,
    memoData,
    sorting,
    columnFilters,
    globalFilter,
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
  })

  usePinnedOffsets({
    tableRef,
    columnPinning,
    columnSizing,
    memoColumns,
    setPinnedStartOffsets,
  })

  const { handleBodyRowClick, handleBodyRowKeyDown } = useRowSelectionHandlers({
    enableRowSelection,
    handleSelectionChange,
    getFilteredRows: () => table.getFilteredRowModel().rows,
  })

  const autoColumnsReady = table
    .getAllLeafColumns()
    .filter((column) => !hasExplicitSize(column))
    .every((column) => columnSizing[column.id] != null)

  return (
    <div
      className={cn(
        "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
        className
      )}
    >
      <div
        ref={scrollContainerRef}
        className="file-grid-scroll isolate min-h-0 min-w-0 flex-1 overflow-auto"
      >
        <table
          ref={tableRef}
          className="w-max min-w-full border-separate border-spacing-0 text-[12.5px]"
          style={{
            tableLayout: autoColumnsReady ? "fixed" : "auto",
          }}
        >
          <DataTableHeader
            headerGroups={table.getHeaderGroups()}
            columnSizing={columnSizing}
            pinnedStartOffsets={pinnedStartOffsets}
          />
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
              table.getRowModel().rows.map((row, rowIndex) => (
                <DataTableBodyRow
                  key={row.id}
                  row={row}
                  isOddRow={rowIndex % 2 === 1}
                  isSelected={row.getIsSelected()}
                  enableRowSelection={enableRowSelection}
                  columns={memoColumns}
                  columnSizing={columnSizing}
                  columnPinning={columnPinning}
                  pinnedStartOffsets={pinnedStartOffsets}
                  onRowClick={handleBodyRowClick}
                  onRowKeyDown={handleBodyRowKeyDown}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <DataTablePagination
        filteredCount={filteredCount}
        selectedCount={selectedCount}
        enableRowSelection={enableRowSelection}
        pageSize={pagination.pageSize}
        pageIndex={pagination.pageIndex}
        pageCount={pageCount}
        onPageSizeChange={(size) => table.setPageSize(size)}
        onPreviousPage={() => table.previousPage()}
        onNextPage={() => table.nextPage()}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
      />
    </div>
  )
}

export { DataTable }
export type { DataTableProps }
