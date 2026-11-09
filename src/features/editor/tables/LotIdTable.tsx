import { memo, useCallback, useMemo, useState } from "react"
import type { RowSelectionState } from "@tanstack/react-table"
import { DataTable } from "@/core/ui/data-table"
import { BulkEditPanel } from "@/features/editor/BulkEditPanel"
import type { LotIdGridRow } from "@/domains/inventur"
import {
  createSearchTextGlobalFilterFn,
  matchesLotIdStatus,
  type LotIdStatusFilter,
} from "@/domains/inventur/search"
import type { LotIdEditableField } from "@/features/editor/lot-id/LotIdSelectCell"
import { useLotIdBulkEdit } from "@/features/editor/lot-id/use-lot-id-bulk-edit"
import { useLotIdColumns } from "@/features/editor/lot-id/use-lot-id-columns"

type LotIdTableProps = {
  data: LotIdGridRow[]
  globalFilter?: string
  statusFilter?: LotIdStatusFilter
  isBulkEditOpen?: boolean
  onBulkEditOpenChange?: (open: boolean) => void
  onChange: (
    data: LotIdGridRow[] | ((prev: LotIdGridRow[]) => LotIdGridRow[])
  ) => void
}

const lotIdSearchFilterFn = createSearchTextGlobalFilterFn<LotIdGridRow>()

/** Only LotId is globally searchable, so the search runs once per row. */
const LOT_ID_GLOBAL_SEARCH_COLUMN_IDS = ["LotId"]

const LotIdTable = ({
  data,
  globalFilter,
  statusFilter = "all",
  isBulkEditOpen = false,
  onBulkEditOpenChange,
  onChange,
}: LotIdTableProps) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

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

  const columns = useLotIdColumns(handleCellEdit)
  const { selectedCount, fields } = useLotIdBulkEdit({
    onChange,
    rowSelection,
    setRowSelection,
  })

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <DataTable
        columns={columns}
        data={statusRows}
        globalFilter={globalFilter}
        globalFilterFn={lotIdSearchFilterFn}
        globalFilterColumnIds={LOT_ID_GLOBAL_SEARCH_COLUMN_IDS}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        initialColumnPinning={{
          start: [
            "select",
            "Index",
            "LotId",
            "Artikelnummer",
            "Produktname",
            "Kennzeichen 3",
          ],
        }}
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
