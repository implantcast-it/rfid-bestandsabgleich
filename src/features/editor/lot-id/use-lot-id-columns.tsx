import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { SelectionCheckbox } from "@/core/ui/data-table";
import type { DataTableFeatures } from "@/core/ui/data-table/features";
import type { LotIdGridRow } from "@/domains/inventur";
import {
  EXPIRY_TOOLTIP,
  emptyTodoDiffClass,
  erpRfidCompareClass,
  expiryCellClass,
  formatAblaufdatum,
} from "@/features/editor/tables/cell-styles";
import {
  ANMERKUNG_SELECT_OPTIONS,
  RFID_SELECT_OPTIONS,
  STICHPROBE_SELECT_OPTIONS,
  TODO_SELECT_OPTIONS,
} from "@/features/editor/lot-id/lot-id-options";
import {
  renderLotIdSelectCell,
  type LotIdEditableField,
} from "@/features/editor/lot-id/LotIdSelectCell";

const columnHelper = createColumnHelper<DataTableFeatures, LotIdGridRow>();

type CellEditHandler = (
  rowId: string,
  field: LotIdEditableField,
  value: string,
) => void;

export const useLotIdColumns = (handleCellEdit: CellEditHandler) =>
  useMemo(
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
              ariaLabel='Alle Zeilen auf der Seite auswählen'
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
          size: 60,
          enableColumnFilter: false,
          meta: { numeric: true },
        }),
        columnHelper.accessor((row) => row["LotId"], {
          id: "LotId",
          header: "LotID",
          filterFn: "includesString",
          size: 125,
        }),
        columnHelper.accessor((row) => row["Artikelnummer"], {
          id: "Artikelnummer",
          header: "Artikelnr.",
          filterFn: "includesString",
          size: 90,
        }),
        columnHelper.accessor((row) => row["Produktname"], {
          id: "Produktname",
          header: "Produktname",
          filterFn: "includesString",
          enableResizing: true,
        }),
        columnHelper.accessor((row) => row["Kennzeichen 3"], {
          id: "Kennzeichen 3",
          header: "Kz 3",
          filterFn: "includesString",
          size: 60,
          minSize: 60,
          maxSize: 60,
        }),
        columnHelper.accessor((row) => row["Ablaufdatum"], {
          id: "Ablaufdatum",
          header: "Ablaufdatum",
          size: 90,
          minSize: 90,
          maxSize: 90,
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
          minSize: 56,
          maxSize: 56,
          size: 56,
          meta: {
            numeric: true,
            cellClassName: (row: LotIdGridRow) =>
              erpRfidCompareClass(
                row["Eigenbestand nach ERP"],
                row["RFID-Scan"],
                "erp",
              ),
          },
        }),
        columnHelper.accessor((row) => row["RFID-Scan"], {
          id: "RFID-Scan",
          header: "RFID",
          filterFn: "includesString",
          minSize: 66,
          maxSize: 66,
          size: 66,
          cell: renderLotIdSelectCell(
            handleCellEdit,
            "RFID-Scan",
            "RFID-Scan bearbeiten",
            RFID_SELECT_OPTIONS,
          ),
          meta: {
            numeric: true,
            cellClassName: (row: LotIdGridRow) =>
              erpRfidCompareClass(
                row["Eigenbestand nach ERP"],
                row["RFID-Scan"],
                "rfid",
              ),
          },
        }),
        columnHelper.accessor((row) => row["To Do"], {
          id: "To Do",
          header: "To Do",
          filterFn: "includesString",
          minSize: 80,
          maxSize: 220,
          cell: renderLotIdSelectCell(
            handleCellEdit,
            "To Do",
            "To Do bearbeiten",
            TODO_SELECT_OPTIONS,
          ),
          meta: {
            cellClassName: (row: LotIdGridRow) =>
              emptyTodoDiffClass(
                row["To Do"],
                row["Eigenbestand nach ERP"],
                row["RFID-Scan"],
              ),
          },
        }),
        columnHelper.accessor((row) => row["Anmerkung"], {
          id: "Anmerkung",
          header: "Anmerkung",
          filterFn: "includesString",
          minSize: 80,
          maxSize: 220,
          cell: renderLotIdSelectCell(
            handleCellEdit,
            "Anmerkung",
            "Anmerkung bearbeiten",
            ANMERKUNG_SELECT_OPTIONS,
          ),
        }),
        columnHelper.accessor((row) => row["Stichprobe"], {
          id: "Stichprobe",
          header: "Stichprobe",
          filterFn: "includesString",
          size: 60,
          cell: renderLotIdSelectCell(
            handleCellEdit,
            "Stichprobe",
            "Stichprobe bearbeiten",
            STICHPROBE_SELECT_OPTIONS,
          ),
        }),
      ]),
    [handleCellEdit],
  );
