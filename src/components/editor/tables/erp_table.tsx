import { useEffect, useState } from "react";

import { AG_GRID_LOCALE_DE } from "@ag-grid-community/locale";
import { AgGridReact } from "ag-grid-react";
import { utils } from "xlsx";

export default function ErpTable({ data, theme }: { data: any; theme: any }) {
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);

  useEffect(() => {
    const rows = utils.sheet_to_json(data);
    const columns = [
      {
        field: "Artikelnummer",
        pinned: "left",
        filter: true,
      },
      { field: "LotId", pinned: "left", filter: true },
      {
        field: "Kennzeichen 3",
        headerName: "Kz 3",
        filter: true,
        pinned: "left",
      },
      {
        field: "Produktname",
        filter: true,
      },
      {
        field: "Ablaufdatum",
        cellRenderer: (data: { value: string }) => {
          const date = new Date(data.value).toLocaleDateString();
          return date != "Invalid Date" ? date : "-";
        },
        cellDataType: "date",
        headerTooltip: "GELB: Datum läuft bald ab - ROT: Datum ist abgelaufen",
        tooltipValueGetter: () =>
          "GELB: Datum läuft bald ab - ROT: Datum ist abgelaufen",
        cellClassRules: {
          "bg-red-100 dark:bg-red-400/30 dark:text-red-400 text-red-800":
            (params: { value: string }) => new Date(params.value) < new Date(),
          "bg-amber-100 dark:bg-amber-400/30 dark:text-amber-400 text-amber-800":
            (params: { value: string }) =>
              new Date(params.value) > new Date() &&
              new Date(params.value) <
                new Date(new Date().setMonth(new Date().getMonth() + 3)),
        },
      },
      {
        field: "Eigenbestand nach ERP",
        filter: true,
      },
    ];

    setRows(rows);
    setColumns(columns);
  }, []);

  return (
    <AgGridReact
      theme={theme}
      rowData={rows}
      columnDefs={columns}
      paginationPageSize={50}
      paginationPageSizeSelector={[20, 50, 100, 500, 1000, 2000]}
      pagination
      animateRows={false}
      autoSizeStrategy={{ type: "fitCellContents" }}
      localeText={AG_GRID_LOCALE_DE}
    />
  );
}
