import { useEffect, useState } from "react";

import { AG_GRID_LOCALE_DE } from "@ag-grid-community/locale";
import { AgGridReact } from "ag-grid-react";
import { utils } from "xlsx";

export default function ErpTable({ data, theme }: { data: any; theme: any }) {
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);

  useEffect(() => {
    const nextRows = Array.isArray(data) ? data : utils.sheet_to_json(data);
    const hasBestelltColumn = nextRows.some((row) =>
      Object.prototype.hasOwnProperty.call(row, "Insgesamt bestellt"),
    );
    const bestellField = hasBestelltColumn ? "Insgesamt bestellt" : "Eigenbestand nach ERP";

    const nextColumns = [
      {
        field: "Artikelnummer",
        pinned: "left",
        filter: true,
      },
      {
        field: "Produktname",
        filter: true,
      },
      {
        field: bestellField,
        headerName: "Insgesamt bestellt",
        filter: true,
      },
    ];

    setRows(nextRows);
    setColumns(nextColumns);
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
