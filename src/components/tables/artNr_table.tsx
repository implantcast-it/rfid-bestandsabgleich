import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

import { useCallback, useEffect, useState } from "react";

import { AgGridReact } from "ag-grid-react";
import { TabsContent } from "../ui/tabs";

export default function ArtNrTable({ data }: { data: any }) {
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
          "bg-green-100": (params: any) => params.value == 0,
          "bg-amber-100": (params: any) => params.value < 0,
          "bg-red-100": (params: any) => params.value > 0,
        },
      },
    ];
    setColumns(columns);
  }, [data]);

  const getRowId = useCallback((params: any) => params.data.id, []);

  return (
    <TabsContent value='5' className='h-[calc(100vh-65px)] ag-theme-balham'>
      <AgGridReact
        rowData={data}
        columnDefs={columns}
        paginationPageSize={50}
        paginationPageSizeSelector={[20, 50, 100, 500, 1000, 2000]}
        pagination
        animateRows={false}
        autoSizeStrategy={{ type: "fitCellContents" }}
        readOnlyEdit
        getRowId={getRowId}
      />
    </TabsContent>
  );
}
