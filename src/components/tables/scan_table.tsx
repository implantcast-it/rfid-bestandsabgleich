import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

import { useEffect, useState } from "react";

import { AgGridReact } from "ag-grid-react";
import { TabsContent } from "../ui/tabs";
import { utils } from "xlsx";

export default function ScanTable({ data }: { data: any }) {
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);

  useEffect(() => {
    const rows = utils.sheet_to_json(data);
    const columns = [
      { field: "LotId", filter: true, pinned: "left" },
      { field: "Barcode-Scan", filter: true },
      { field: "RFID-Scan", filter: true },
    ];

    setColumns(columns);
    setRows(rows);
  }, [data]);

  return (
    <TabsContent value='3' className='h-[calc(100vh-65px)] ag-theme-balham'>
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
