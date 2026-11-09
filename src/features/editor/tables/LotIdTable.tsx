import { memo, useCallback, useMemo, useState } from "react"
import {
  createColumnHelper,
  type RowSelectionState,
} from "@tanstack/react-table"
import { toast } from "sonner"
import { DataTable, SelectionCheckbox } from "@/core/ui/data-table"
import type { DataTableFeatures } from "@/core/ui/data-table/features"
import { BulkEditPanel } from "@/features/editor/BulkEditPanel"
import {
  EXPIRY_TOOLTIP,
  emptyTodoDiffClass,
  erpRfidCompareClass,
  expiryCellClass,
  formatAblaufdatum,
} from "./cell-styles"
import type { LotIdGridRow } from "@/domains/inventur"
import {
  createSearchTextGlobalFilterFn,
  matchesLotIdStatus,
  type LotIdStatusFilter,
} from "@/domains/inventur/search"
import {
  ANMERKUNG_OPTIONS,
  STICHPROBE_OPTIONS,
  TODO_OPTIONS,
  toSelectOptions,
} from "@/features/editor/lot-id/lot-id-options"
import { renderLotIdSelectCell } from "@/features/editor/lot-id/LotIdSelectCell"

const columnHelper = createColumnHelper<DataTableFeatures, LotIdGridRow>()

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

const RFID_SELECT_OPTIONS = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
]
const TODO_SELECT_OPTIONS = toSelectOptions(TODO_OPTIONS, "—")
const ANMERKUNG_SELECT_OPTIONS = toSelectOptions(ANMERKUNG_OPTIONS, "—")
const STICHPROBE_SELECT_OPTIONS = toSelectOptions(STICHPROBE_OPTIONS, "—")
const BULK_TODO_OPTIONS = toSelectOptions(TODO_OPTIONS, "--- Leeren ---")
const BULK_ANMERKUNG_OPTIONS = toSelectOptions(
  ANMERKUNG_OPTIONS,
  "--- Leeren ---"
)
const BULK_RFID_OPTIONS = [
  { value: "", label: "--- Auswählen ---" },
  { value: "0", label: "0" },
  { value: "1", label: "1" },
]

const LotIdTable = ({
  data,
  globalFilter,
  statusFilter = "all",
  isBulkEditOpen = false,
  onBulkEditOpenChange,
  onChange,
}: LotIdTableProps) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [bulkToDo, setBulkToDo] = useState("")
  const [bulkAnmerkung, setBulkAnmerkung] = useState("")
  const [bulkRfidScan, setBulkRfidScan] = useState("")

  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data])
  const statusRows = useMemo(
    () =>
      statusFilter === "all"
        ? rows
        : rows.filter((row) => matchesLotIdStatus(row, statusFilter)),
    [rows, statusFilter]
  )
  const selectedCount = Object.keys(rowSelection).filter(
    (key) => rowSelection[key]
  ).length

  const handleCellEdit = useCallback(
    (
      rowId: string,
      field: "RFID-Scan" | "To Do" | "Anmerkung" | "Stichprobe",
      value: string
    ) => {
      onChange((prevData) =>
        prevData.map((row) => {
          if (row.id !== rowId) return row
          return { ...row, [field]: value, isEdited: true }
        })
      )
    },
    [onChange]
  )

  const applyBulkField = useCallback(
    (
      field: "RFID-Scan" | "To Do" | "Anmerkung",
      value: string,
      options?: { requireValue?: boolean; valueLabel?: string }
    ) => {
      const selectedIds = new Set(
        Object.keys(rowSelection).filter((key) => rowSelection[key])
      )

      if (selectedIds.size === 0) {
        toast.error("Keine Zeilen ausgewählt", {
          description: "Bitte wählen Sie Zeilen aus, die Sie ändern möchten.",
        })
        return
      }

      if (options?.requireValue && value === "") {
        toast.error("Kein Wert ausgewählt", {
          description: `Bitte wählen Sie einen '${options.valueLabel ?? field}' Wert aus.`,
        })
        return
      }

      onChange((prevData) =>
        prevData.map((row) => {
          if (!selectedIds.has(row.id)) return row
          return { ...row, [field]: value, isEdited: true }
        })
      )

      toast.success(`'${field}' aktualisiert`, {
        description:
          field === "RFID-Scan"
            ? `${selectedIds.size} Zeile(n) wurden auf '${value}' gesetzt.`
            : `${selectedIds.size} Zeile(n) wurden aktualisiert.`,
      })

      setRowSelection({})
    },
    [onChange, rowSelection]
  )

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "select",
          header: ({ table }) => (
            <SelectionCheckbox
              checked={table.getIsAllPageRowsSelected()}
              indeterminate={
                table.getIsSomePageRowsSelected() &&
                !table.getIsAllPageRowsSelected()
              }
              onCheckedChange={(checked) =>
                table.toggleAllPageRowsSelected(checked)
              }
              ariaLabel="Alle Zeilen auf der Seite auswählen"
            />
          ),
          cell: ({ row }) => (
            <SelectionCheckbox
              checked={row.getIsSelected()}
              onCheckedChange={(checked) => row.toggleSelected(checked)}
              ariaLabel={`Zeile ${String(row.original.Index ?? row.id)} auswählen`}
            />
          ),
          size: 44,
          minSize: 44,
          maxSize: 44,
          enableSorting: false,
          enableColumnFilter: false,
        }),
        columnHelper.accessor((row) => row["Index"], {
          id: "Index",
          header: "Index",
          enableColumnFilter: false,
          minSize: 80,
          meta: { numeric: true },
        }),
        columnHelper.accessor((row) => row["LotId"], {
          id: "LotId",
          header: "LotID",
          filterFn: "includesString",
        }),
        columnHelper.accessor((row) => row["Artikelnummer"], {
          id: "Artikelnummer",
          header: "Artikelnr.",
          filterFn: "includesString",
        }),
        columnHelper.accessor((row) => row["Produktname"], {
          id: "Produktname",
          header: "Produktname",
          filterFn: "includesString",
          minSize: 160,
          meta: { flex: true },
        }),
        columnHelper.accessor((row) => row["Kennzeichen 3"], {
          id: "Kennzeichen 3",
          header: "Kz 3",
          filterFn: "includesString",
          size: 88,
          minSize: 72,
        }),
        columnHelper.accessor((row) => row["Ablaufdatum"], {
          id: "Ablaufdatum",
          header: "Ablaufdatum",
          cell: (info) => formatAblaufdatum(info.getValue()),
          sortFn: (rowA, rowB) =>
            rowA.original.ablaufdatumTimestamp -
            rowB.original.ablaufdatumTimestamp,
          enableColumnFilter: false,
          meta: {
            tooltip: EXPIRY_TOOLTIP,
            cellClassName: (_row: LotIdGridRow, value: unknown) =>
              expiryCellClass(value),
          },
        }),
        columnHelper.accessor((row) => row["Eigenbestand nach ERP"], {
          id: "Eigenbestand nach ERP",
          header: "ERP",
          filterFn: "includesString",
          meta: {
            numeric: true,
            cellClassName: (row: LotIdGridRow) =>
              erpRfidCompareClass(
                row["Eigenbestand nach ERP"],
                row["RFID-Scan"],
                "erp"
              ),
          },
        }),
        columnHelper.accessor((row) => row["RFID-Scan"], {
          id: "RFID-Scan",
          header: "RFID",
          filterFn: "includesString",
          cell: renderLotIdSelectCell(
            handleCellEdit,
            "RFID-Scan",
            "RFID-Scan bearbeiten",
            RFID_SELECT_OPTIONS
          ),
          meta: {
            numeric: true,
            cellClassName: (row: LotIdGridRow) =>
              erpRfidCompareClass(
                row["Eigenbestand nach ERP"],
                row["RFID-Scan"],
                "rfid"
              ),
          },
        }),
        columnHelper.accessor((row) => row["To Do"], {
          id: "To Do",
          header: "To Do",
          filterFn: "includesString",
          cell: renderLotIdSelectCell(
            handleCellEdit,
            "To Do",
            "To Do bearbeiten",
            TODO_SELECT_OPTIONS
          ),
          meta: {
            cellClassName: (row: LotIdGridRow) =>
              emptyTodoDiffClass(
                row["To Do"],
                row["Eigenbestand nach ERP"],
                row["RFID-Scan"]
              ),
          },
        }),
        columnHelper.accessor((row) => row["Anmerkung"], {
          id: "Anmerkung",
          header: "Anmerkung",
          filterFn: "includesString",
          cell: renderLotIdSelectCell(
            handleCellEdit,
            "Anmerkung",
            "Anmerkung bearbeiten",
            ANMERKUNG_SELECT_OPTIONS
          ),
        }),
        columnHelper.accessor((row) => row["Stichprobe"], {
          id: "Stichprobe",
          header: "Stichprobe",
          filterFn: "includesString",
          size: 140,
          minSize: 140,
          maxSize: 140,
          cell: renderLotIdSelectCell(
            handleCellEdit,
            "Stichprobe",
            "Stichprobe bearbeiten",
            STICHPROBE_SELECT_OPTIONS
          ),
        }),
      ]),
    [handleCellEdit]
  )

  const handleApplyBulkToDo = () => {
    applyBulkField("To Do", bulkToDo)
    setBulkToDo("")
  }

  const handleApplyBulkAnmerkung = () => {
    applyBulkField("Anmerkung", bulkAnmerkung)
    setBulkAnmerkung("")
  }

  const handleApplyBulkRfidScan = () => {
    applyBulkField("RFID-Scan", bulkRfidScan, {
      requireValue: true,
      valueLabel: "RFID-Scan",
    })
    setBulkRfidScan("")
  }

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
          fields={[
            {
              id: "bulk-todo",
              label: "To Do setzen",
              value: bulkToDo,
              options: BULK_TODO_OPTIONS,
              onValueChange: setBulkToDo,
              onApply: handleApplyBulkToDo,
            },
            {
              id: "bulk-anmerkung",
              label: "Anmerkung setzen",
              value: bulkAnmerkung,
              options: BULK_ANMERKUNG_OPTIONS,
              onValueChange: setBulkAnmerkung,
              onApply: handleApplyBulkAnmerkung,
            },
            {
              id: "bulk-rfid",
              label: "RFID-Scan setzen",
              value: bulkRfidScan,
              options: BULK_RFID_OPTIONS,
              onValueChange: setBulkRfidScan,
              onApply: handleApplyBulkRfidScan,
            },
          ]}
        />
      </div>
    </div>
  )
}

export default memo(LotIdTable)
