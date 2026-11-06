import { useMemo } from "react"
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { createIdentityGlobalFilterFn } from "@/lib/search"
import { differenzCellClass } from "./cell-styles"

type ArtNrRow = Record<string, unknown>

const columnHelper = createColumnHelper<ArtNrRow>()

const artNrIdentityFilter = createIdentityGlobalFilterFn<ArtNrRow>([
  "Artikelnummer",
  "Produktname",
])

type ArtNrTableProps = {
  data: ArtNrRow[]
  globalFilter?: string
}

const ArtNrTable = ({ data, globalFilter }: ArtNrTableProps) => {
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
        columnHelper.accessor((row) => row["Eigenbestand nach ERP"], {
          id: "Eigenbestand nach ERP",
          header: "Eigenbestand nach ERP",
          filterFn: "includesString",
          meta: { numeric: true },
        }),
        columnHelper.accessor((row) => row["RFID-Scan"], {
          id: "RFID-Scan",
          header: "RFID-Scan",
          filterFn: "includesString",
          meta: { numeric: true },
        }),
        columnHelper.accessor((row) => row["Differenz"], {
          id: "Differenz",
          header: "Differenz",
          filterFn: "includesString",
          meta: {
            numeric: true,
            cellClassName: (_row: ArtNrRow, value: unknown) =>
              differenzCellClass(value),
          },
        }),
      ] as ColumnDef<ArtNrRow, unknown>[],
    []
  )

  return (
    <DataTable
      columns={columns}
      data={rows}
      globalFilter={globalFilter}
      globalFilterFn={artNrIdentityFilter}
      initialColumnPinning={{
        left: ["Artikelnummer", "Produktname"],
      }}
      getRowId={(row, index) => String(row.id ?? index)}
    />
  )
}

export default ArtNrTable
