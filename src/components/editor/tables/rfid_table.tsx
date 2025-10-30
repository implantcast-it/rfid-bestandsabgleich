import { useEffect, useState } from "react";

import { AG_GRID_LOCALE_DE } from "@ag-grid-community/locale";
import { AgGridReact } from "ag-grid-react";
import { utils } from "xlsx";

export default function RfidTable({ data, theme }: { data: any; theme: any }) {
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);

  useEffect(() => {
    const rows = utils.sheet_to_json(data);
    const columns = [
      { field: "Artikelnummer", pinned: "left", filter: true },
      { field: "LotId", pinned: "left", filter: true, width: 120 },
      { field: "Produktname", filter: true },
      { field: "GTIN", filter: true },
      { field: "Erfasst um" },
    ];

    setColumns(columns);
    setRows(rows);
  }, [data]);

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
