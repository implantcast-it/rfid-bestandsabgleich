import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

import { useEffect, useState } from "react";

import { AgGridReact } from "ag-grid-react";
import { TabsContent } from "../ui/tabs";
import { utils } from "xlsx";

export default function BarcodeTable({ data }: { data: any }) {
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
    <TabsContent value='1' className='h-[calc(100vh-65px)] ag-theme-balham'>
      <AgGridReact
        rowData={rows}
        columnDefs={columns}
        paginationPageSize={50}
        paginationPageSizeSelector={[20, 50, 100, 500, 1000, 2000]}
        pagination
        animateRows={false}
        autoSizeStrategy={{ type: "fitCellContents" }}
      />
    </TabsContent>
  );
}
