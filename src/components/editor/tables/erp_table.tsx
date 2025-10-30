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
        field: "Produktname",
        filter: true,
      },
      {
        field: "Ablaufdatum",
        filter: true,
        cellRenderer: (data: { value: string }) => {
          return new Date(data.value).toLocaleDateString();
        },
        cellDataType: "date",
        headerTooltip: "GELB: Datum läuft bald ab - ROT: Datum ist abgelaufen",
        tooltipValueGetter: () =>
          "GELB: Datum läuft bald ab - ROT: Datum ist abgelaufen",
        cellClassRules: {
          // apply bg-red-100 where params.value is smaller than the current date
          "bg-red-100": (params: { value: string }) =>
            new Date(params.value) < new Date(),
          // apply bg-amber-100 where params.value is greater than the current date but not more than 3 months
          "bg-amber-100": (params: { value: string }) =>
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
