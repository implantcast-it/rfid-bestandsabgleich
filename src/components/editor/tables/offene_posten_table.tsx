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

type OffenePostenRow = Record<string, unknown>

const columnHelper = createColumnHelper<OffenePostenRow>()

const offenePostenIdentityFilter = createIdentityGlobalFilterFn<OffenePostenRow>(
  ["LotId", "Artikelnummer", "Produktname"]
)

type OffenePostenTableProps = {
  data: OffenePostenRow[]
  globalFilter?: string
}

/** Read-only list of ordered positions that are not on site (outside the Abgleich). */
const OffenePostenTable = ({ data, globalFilter }: OffenePostenTableProps) => {
  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data])

  const columns = useMemo(
    () =>
      [
        columnHelper.accessor((row) => row["Artikelnummer"], {
          id: "Artikelnummer",
          header: "Artikelnummer",
          filterFn: "includesString",
        }),
        columnHelper.accessor((row) => row["Produktname"], {
          id: "Produktname",
          header: "Produktname",
          filterFn: "includesString",
        }),
        columnHelper.accessor((row) => row["LotId"], {
          id: "LotId",
          header: "LotId",
          filterFn: "includesString",
        }),
        columnHelper.accessor((row) => row["Ablaufdatum"], {
          id: "Ablaufdatum",
          header: "MHD",
          cell: (info) => formatAblaufdatum(info.getValue()),
          sortingFn: (rowA, rowB, columnId) =>
            sortAblaufdatum(rowA.getValue(columnId), rowB.getValue(columnId)),
          enableColumnFilter: false,
          meta: {
            tooltip: EXPIRY_TOOLTIP,
            cellClassName: (_row: OffenePostenRow, value: unknown) =>
              expiryCellClass(value),
          },
        }),
        columnHelper.accessor((row) => row["Offen"], {
          id: "Offen",
          header: "Offen",
          filterFn: "includesString",
          meta: { numeric: true },
        }),
      ] as ColumnDef<OffenePostenRow, unknown>[],
    []
  )

  return (
    <DataTable
      columns={columns}
      data={rows}
      globalFilter={globalFilter}
      globalFilterFn={offenePostenIdentityFilter}
      initialColumnPinning={{
        left: ["Artikelnummer", "LotId"],
      }}
      getRowId={(row, index) =>
        String(row.id ?? `${row["Artikelnummer"]}-${row["LotId"]}-${index}`)
      }
    />
  )
}

export default OffenePostenTable
