import { useCallback, useEffect, useState } from "react";

import { AG_GRID_LOCALE_DE } from "@ag-grid-community/locale";
import { AgGridReact } from "ag-grid-react";

export default function ArtNrTable({ data, theme }: { data: any; theme: any }) {
  const [columns, setColumns] = useState<any[]>([]);

  useEffect(() => {
    const columns = [
      {
        field: "Artikelnummer",
        pinned: "left",
        filter: true,
      },
      {
        field: "Produktname",
        pinned: "left",
        filter: true,
      },
      {
        field: "Eigenbestand nach ERP",
        filter: true,
      },
      {
        field: "RFID-Scan",
        filter: true,
      },
      {
        field: "Differenz",
        filter: true,
        cellClassRules: {
          "bg-green-100 dark:bg-green-400/30 dark:text-green-400 text-green-800":
            (params: any) => params.value == 0,
          "bg-amber-100 dark:bg-amber-400/30 dark:text-amber-400 text-amber-800":
            (params: any) => params.value < 0,
          "bg-red-100 dark:bg-red-400/30 dark:text-red-400 text-red-800": (
            params: any
          ) => params.value > 0,
        },
      },
    ];
    setColumns(columns);
  }, []);

  const getRowId = useCallback((params: any) => params.data.id, []);

  return (
    <AgGridReact
      theme={theme}
      rowData={data}
      columnDefs={columns}
      paginationPageSize={50}
      paginationPageSizeSelector={[20, 50, 100, 500, 1000, 2000]}
      pagination
      animateRows={false}
      autoSizeStrategy={{ type: "fitCellContents" }}
      readOnlyEdit
      getRowId={getRowId}
      localeText={AG_GRID_LOCALE_DE}
    />
  );
}
