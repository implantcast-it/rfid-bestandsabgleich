import * as Toast from "@radix-ui/react-toast"
import { useCallback, useMemo, useState } from "react"
import {
  createColumnHelper,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table"
import { DataTable, SelectionCheckbox } from "@/components/ui/data-table"
import { FieldSelect } from "@/components/ui/field-select"
import ErrorToast from "@/components/feedback/ErrorToast"
import SuccessToast from "@/components/feedback/SuccessToast"
import { BulkEditPanel } from "@/components/editor/BulkEditPanel"
import {
  EXPIRY_TOOLTIP,
  emptyTodoDiffClass,
  erpRfidCompareClass,
  expiryCellClass,
  formatAblaufdatum,
  sortAblaufdatum,
} from "./cell-styles"
import type { LotIdGridRow } from "@/lib/inventur"
import {
  createIdentityGlobalFilterFn,
  matchesLotIdStatus,
  type LotIdStatusFilter,
} from "@/lib/search"

const TODO_OPTIONS = [
  "",
  "berechnen + liefern",
  "interne Berechnung",
  "interne Gutschrift mit Rückbuchung auf Konsi",
  "NUR berechnen",
  "NUR liefern auf Konsi",
  "Resteriaustausch",
  "über Gutschrift ins Konsi buchen",
  "Storno / offener Posten",
]

const ANMERKUNG_OPTIONS = [
  "",
  "AWS",
  "bereits unterwegs",
  "Ersatzartikel",
  "Fremdprodukt",
  "geht zurück",
  "in Klärung",
  "INST liegt auf Sieb",
  "Kaufware",
  "kein RFID Chip",
  "Klinik bestellt",
  "Mitnahme",
  "nicht scanbar / Lot korrekt",
  "offener Posten",
]

const STICHPROBE_OPTIONS = ["", "X"]

const columnHelper = createColumnHelper<LotIdGridRow>()

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

const lotIdIdentityFilter = createIdentityGlobalFilterFn<LotIdGridRow>([
  "LotId",
  "Artikelnummer",
  "Produktname",
  "Kennzeichen 3",
])

const toSelectOptions = (values: string[], emptyLabel: string) =>
  values.map((value) => ({
    value,
    label: value || emptyLabel,
  }))

const cellSelectTriggerClass =
  "h-7 min-w-[96px] rounded-none px-1.5 text-sm"

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
  const [toastInfo, setToastInfo] = useState<{
    open: boolean
    type: "success" | "error"
    title: string
    description: string
  } | null>(null)

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
        setToastInfo({
          type: "error",
          open: true,
          title: "Keine Zeilen ausgewählt",
          description: "Bitte wählen Sie Zeilen aus, die Sie ändern möchten.",
        })
        return
      }

      if (options?.requireValue && value === "") {
        setToastInfo({
          type: "error",
          open: true,
          title: "Kein Wert ausgewählt",
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

      setToastInfo({
        type: "success",
        open: true,
        title: `'${field}' aktualisiert`,
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
      [
        columnHelper.display({
          id: "select",
          header: ({ table }) => (
            <SelectionCheckbox
              checked={table.getIsAllPageRowsSelected()}
              indeterminate={table.getIsSomePageRowsSelected()}
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
          sortingFn: (rowA, rowB, columnId) =>
            sortAblaufdatum(rowA.getValue(columnId), rowB.getValue(columnId)),
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
          cell: ({ row, getValue }) => (
            <FieldSelect
              value={String(getValue() ?? "")}
              onValueChange={(next) =>
                handleCellEdit(row.original.id, "RFID-Scan", next)
              }
              aria-label="RFID-Scan bearbeiten"
              triggerClassName={cellSelectTriggerClass}
              options={[
                { value: "0", label: "0" },
                { value: "1", label: "1" },
              ]}
            />
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
          cell: ({ row, getValue }) => (
            <FieldSelect
              value={String(getValue() ?? "")}
              onValueChange={(next) =>
                handleCellEdit(String(row.original.id), "To Do", next)
              }
              aria-label="To Do bearbeiten"
              triggerClassName={cellSelectTriggerClass}
              options={toSelectOptions(TODO_OPTIONS, "—")}
            />
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
          cell: ({ row, getValue }) => (
            <FieldSelect
              value={String(getValue() ?? "")}
              onValueChange={(next) =>
                handleCellEdit(String(row.original.id), "Anmerkung", next)
              }
              aria-label="Anmerkung bearbeiten"
              triggerClassName={cellSelectTriggerClass}
              options={toSelectOptions(ANMERKUNG_OPTIONS, "—")}
            />
          ),
        }),
        columnHelper.accessor((row) => row["Stichprobe"], {
          id: "Stichprobe",
          header: "Stichprobe",
          filterFn: "includesString",
          size: 140,
          minSize: 140,
          maxSize: 140,
          cell: ({ row, getValue }) => (
            <FieldSelect
              value={String(getValue() ?? "")}
              onValueChange={(next) =>
                handleCellEdit(String(row.original.id), "Stichprobe", next)
              }
              aria-label="Stichprobe bearbeiten"
              triggerClassName={cellSelectTriggerClass}
              options={toSelectOptions(STICHPROBE_OPTIONS, "—")}
            />
          ),
        }),
      ] as ColumnDef<LotIdGridRow, unknown>[],
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
    <Toast.Provider>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <DataTable
          columns={columns}
          data={statusRows}
          globalFilter={globalFilter}
          globalFilterFn={lotIdIdentityFilter}
          enableRowSelection
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          initialColumnPinning={{
            left: [
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
                options: toSelectOptions(TODO_OPTIONS, "--- Leeren ---"),
                onValueChange: setBulkToDo,
                onApply: handleApplyBulkToDo,
              },
              {
                id: "bulk-anmerkung",
                label: "Anmerkung setzen",
                value: bulkAnmerkung,
                options: toSelectOptions(ANMERKUNG_OPTIONS, "--- Leeren ---"),
                onValueChange: setBulkAnmerkung,
                onApply: handleApplyBulkAnmerkung,
              },
              {
                id: "bulk-rfid",
                label: "RFID-Scan setzen",
                value: bulkRfidScan,
                options: [
                  { value: "", label: "--- Auswählen ---" },
                  { value: "0", label: "0" },
                  { value: "1", label: "1" },
                ],
                onValueChange: setBulkRfidScan,
                onApply: handleApplyBulkRfidScan,
              },
            ]}
          />
        </div>
      </div>

      {toastInfo?.type === "success" ? (
        <SuccessToast
          open={toastInfo.open}
          onOpenChange={(isOpen) => !isOpen && setToastInfo(null)}
          title={toastInfo.title}
          description={toastInfo.description}
        />
      ) : null}
      {toastInfo?.type === "error" ? (
        <ErrorToast
          open={toastInfo.open}
          onOpenChange={(isOpen) => !isOpen && setToastInfo(null)}
          title={toastInfo.title}
          description={toastInfo.description}
        />
      ) : null}
      <Toast.Viewport className="[--viewport-padding:_25px] fixed right-0 bottom-0 z-[2147483647] m-0 flex w-[390px] max-w-[100vw] list-none flex-col gap-[10px] p-[var(--viewport-padding)] outline-none" />
    </Toast.Provider>
  )
}

export default LotIdTable
