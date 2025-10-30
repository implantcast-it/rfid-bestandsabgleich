import { useEffect, useState } from "react";

import { AG_GRID_LOCALE_DE } from "@ag-grid-community/locale";
import { AgGridReact } from "ag-grid-react";
import { utils } from "xlsx";

export default function BarcodeTable({
  data,
  theme,
}: {
  data: any;
  theme: any;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);

  useEffect(() => {
    const rows = utils.sheet_to_json(data);
    const columns = [
      { field: "Debitorenkonto", pinned: "left", filter: true },
      { field: "GTIN", filter: true },
      { field: "LotId", filter: true },
      { field: "MHD", headerName: "Ablaufdatum", filter: true },
      { field: "Inventurdatum", filter: true },
      { field: "Methode", filter: true },
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
