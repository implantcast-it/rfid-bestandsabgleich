import { useMemo } from "react"
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { createIdentityGlobalFilterFn } from "@/lib/search"

type RfidRow = Record<string, unknown>

const columnHelper = createColumnHelper<RfidRow>()

const rfidIdentityFilter = createIdentityGlobalFilterFn<RfidRow>([
  "LotId",
  "Artikelnummer",
  "Produktname",
  "GTIN",
])

type RfidTableProps = {
  data: RfidRow[]
  globalFilter?: string
}

const RfidTable = ({ data, globalFilter }: RfidTableProps) => {
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
          size: 120,
          filterFn: "includesString",
        }),
        columnHelper.accessor((row) => row["Produktname"], {
          id: "Produktname",
          header: "Produktname",
          filterFn: "includesString",
        }),
        columnHelper.accessor((row) => row["GTIN"], {
          id: "GTIN",
          header: "GTIN",
          filterFn: "includesString",
        }),
        columnHelper.accessor((row) => row["Erfasst um"], {
          id: "Erfasst um",
          header: "Erfasst um",
          enableColumnFilter: false,
        }),
      ] as ColumnDef<RfidRow, unknown>[],
    []
  )

  return (
    <DataTable
      columns={columns}
      data={rows}
      globalFilter={globalFilter}
      globalFilterFn={rfidIdentityFilter}
      initialColumnPinning={{
        left: ["Artikelnummer", "LotId"],
      }}
      getRowId={(row, index) =>
        String(row.id ?? `${row["Artikelnummer"]}-${row["LotId"]}-${index}`)
      }
    />
  )
}

export default RfidTable
