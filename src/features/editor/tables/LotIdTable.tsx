import { memo, useCallback, useEffect, useMemo, useState } from "react"
import type { RefObject } from "react"
import type {
  ColumnPinningState,
  ColumnSizingState,
  OnChangeFn,
  RowSelectionState,
} from "@tanstack/react-table"
import { DataTable } from "@/core/ui/data-table"
import { BulkEditPanel } from "@/features/editor/BulkEditPanel"
import type { LotIdGridRow } from "@/domains/inventur"
import {
  createSearchTextGlobalFilterFn,
  matchesLotIdStatus,
  type LotIdStatusFilter,
} from "@/domains/inventur/search"
import type { LotIdEditableField } from "@/features/editor/lot-id/LotIdSelectCell"
import {
  DEFAULT_LOT_ID_PINNED_COLUMNS,
  LOT_ID_DISPLAY_COLUMNS,
  LotIdTableDisplaySettingsDialog,
} from "@/features/editor/lot-id/LotIdTableDisplaySettingsDialog"
import { DEFAULT_PRODUCT_NAME_SIZE } from "@/features/editor/lot-id/product-name-size-options"
import { useLotIdBulkEdit } from "@/features/editor/lot-id/use-lot-id-bulk-edit"
import { useLotIdColumns } from "@/features/editor/lot-id/use-lot-id-columns"

type LotIdTableProps = {
  data: LotIdGridRow[]
  globalFilter?: string
  statusFilter?: LotIdStatusFilter
  isBulkEditOpen?: boolean
  onBulkEditOpenChange?: (open: boolean) => void
  isDisplaySettingsOpen: boolean
  onDisplaySettingsOpenChange: (open: boolean) => void
  displaySettingsTriggerRef: RefObject<HTMLButtonElement | null>
  onChange: (
    data: LotIdGridRow[] | ((prev: LotIdGridRow[]) => LotIdGridRow[])
  ) => void
}

const lotIdSearchFilterFn = createSearchTextGlobalFilterFn<LotIdGridRow>()

/** Only LotId is globally searchable, so the search runs once per row. */
const LOT_ID_GLOBAL_SEARCH_COLUMN_IDS = ["LotId"]
const PRODUCT_NAME_SIZE_STORAGE_KEY = "lot-id-product-name-column-size"
const COLUMN_PINNING_STORAGE_KEY = "lot-id-table-pinned-columns"

const getInitialProductNameSize = () => {
  const storedSize = Number(localStorage.getItem(PRODUCT_NAME_SIZE_STORAGE_KEY))
  if (!Number.isInteger(storedSize) || storedSize < 160 || storedSize > 640) {
    return DEFAULT_PRODUCT_NAME_SIZE
  }
  return Math.min(600, Math.max(180, storedSize))
}

const getInitialColumnPinning = (): ColumnPinningState => {
  const storedColumns = localStorage.getItem(COLUMN_PINNING_STORAGE_KEY)
  if (storedColumns === null) {
    return {
      start: [...DEFAULT_LOT_ID_PINNED_COLUMNS],
      end: [],
    }
  }

  const savedColumnIds = new Set(storedColumns.split("|"))
  return {
    start: [
      "select",
      "Index",
      ...LOT_ID_DISPLAY_COLUMNS.map(({ id }) => id).filter((id) =>
        savedColumnIds.has(id)
      ),
    ],
    end: [],
  }
}

const LotIdTable = ({
  data,
  globalFilter,
  statusFilter = "all",
  isBulkEditOpen = false,
  onBulkEditOpenChange,
  isDisplaySettingsOpen,
  onDisplaySettingsOpenChange,
  displaySettingsTriggerRef,
  onChange,
}: LotIdTableProps) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnPinning, setColumnPinning] =
    useState<ColumnPinningState>(getInitialColumnPinning)
  const [productNameSize, setProductNameSize] = useState(
    getInitialProductNameSize
  )
  const [tableReloadKey, setTableReloadKey] = useState(0)

  useEffect(() => {
    localStorage.setItem(
      PRODUCT_NAME_SIZE_STORAGE_KEY,
      String(productNameSize)
    )
  }, [productNameSize])

  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data])
  const statusRows = useMemo(
    () =>
      statusFilter === "all"
        ? rows
        : rows.filter((row) => matchesLotIdStatus(row, statusFilter)),
    [rows, statusFilter]
  )

  const handleCellEdit = useCallback(
    (rowId: string, field: LotIdEditableField, value: string) => {
      onChange((prevData) =>
        prevData.map((row) => {
          if (row.id !== rowId) return row
          return { ...row, [field]: value, isEdited: true }
        })
      )
    },
    [onChange]
  )

  const handleColumnSizingChange: OnChangeFn<ColumnSizingState> = (updater) => {
    setProductNameSize((previousSize) => {
      const nextSizing =
        typeof updater === "function"
          ? updater({ Produktname: previousSize })
          : updater
      return nextSizing.Produktname ?? previousSize
    })
  }

  const columns = useLotIdColumns(handleCellEdit, productNameSize)
  const { selectedCount, fields } = useLotIdBulkEdit({
    onChange,
    rowSelection,
    setRowSelection,
  })

  const handleSaveDisplaySettings = ({
    columnPinning: nextColumnPinning,
    productNameSize: nextProductNameSize,
  }: {
    columnPinning: ColumnPinningState
    productNameSize: number
  }) => {
    setColumnPinning(nextColumnPinning)
    setProductNameSize(nextProductNameSize)
    localStorage.setItem(
      COLUMN_PINNING_STORAGE_KEY,
      (nextColumnPinning.start ?? [])
        .filter((id) => LOT_ID_DISPLAY_COLUMNS.some((column) => column.id === id))
        .join("|")
    )
    localStorage.setItem(
      PRODUCT_NAME_SIZE_STORAGE_KEY,
      String(nextProductNameSize)
    )
    setTableReloadKey((key) => key + 1)
  }

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <LotIdTableDisplaySettingsDialog
        open={isDisplaySettingsOpen}
        onOpenChange={onDisplaySettingsOpenChange}
        columnPinning={columnPinning}
        productNameSize={productNameSize}
        onSave={handleSaveDisplaySettings}
        triggerRef={displaySettingsTriggerRef}
      />
      <DataTable
        key={tableReloadKey}
        columns={columns}
        data={statusRows}
        globalFilter={globalFilter}
        autoResetPageIndex={false}
        paginationResetKey={statusFilter}
        globalFilterFn={lotIdSearchFilterFn}
        globalFilterColumnIds={LOT_ID_GLOBAL_SEARCH_COLUMN_IDS}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        columnPinning={columnPinning}
        onColumnPinningChange={setColumnPinning}
        onColumnSizingChange={handleColumnSizingChange}
        getRowId={(row, index) => String(row.id ?? index)}
      />

      <div id="bulk-edit-panel">
        <BulkEditPanel
          open={isBulkEditOpen}
          onOpenChange={(open) => onBulkEditOpenChange?.(open)}
          selectedCount={selectedCount}
          fields={fields}
        />
      </div>
    </div>
  )
}

export default memo(LotIdTable)
