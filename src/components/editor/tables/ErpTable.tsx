import { useMemo } from "react"
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { createIdentityGlobalFilterFn } from "@/lib/search"
import {
  EXPIRY_TOOLTIP,
  expiryCellClass,
  formatAblaufdatum,
  sortAblaufdatum,
} from "./cell-styles"

type ErpRow = Record<string, unknown>

const columnHelper = createColumnHelper<ErpRow>()

const erpIdentityFilter = createIdentityGlobalFilterFn<ErpRow>([
  "LotId",
  "Artikelnummer",
  "Produktname",
  "Kennzeichen 3",
])

type ErpTableProps = {
  data: ErpRow[]
  globalFilter?: string
}

const ErpTable = ({ data, globalFilter }: ErpTableProps) => {
  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data])

  const columns = useMemo(
    () =>
      [
        columnHelper.accessor((row) => row["Artikelnummer"], {
          id: "Artikelnummer",
          header: "Artikelnummer",
          filterFn: "includesString",
        }),
        columnHelper.accessor((row) => row["LotId"], {
          id: "LotId",
          header: "LotId",
          filterFn: "includesString",
        }),
        columnHelper.accessor((row) => row["Kennzeichen 3"], {
          id: "Kennzeichen 3",
          header: "Kz 3",
          filterFn: "includesString",
        }),
        columnHelper.accessor((row) => row["Produktname"], {
          id: "Produktname",
          header: "Produktname",
          filterFn: "includesString",
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
            cellClassName: (_row: ErpRow, value: unknown) =>
              expiryCellClass(value),
          },
        }),
        columnHelper.accessor((row) => row["Eigenbestand nach ERP"], {
          id: "Eigenbestand nach ERP",
          header: "Eigenbestand nach ERP",
          filterFn: "includesString",
          meta: { numeric: true },
        }),
      ] as ColumnDef<ErpRow, unknown>[],
    []
  )

  return (
    <DataTable
      columns={columns}
      data={rows}
      globalFilter={globalFilter}
      globalFilterFn={erpIdentityFilter}
      initialColumnPinning={{
        left: ["Artikelnummer", "LotId", "Kennzeichen 3"],
      }}
      getRowId={(row, index) =>
        String(row.id ?? `${row["Artikelnummer"]}-${row["LotId"]}-${index}`)
      }
    />
  )
}

export default ErpTable
