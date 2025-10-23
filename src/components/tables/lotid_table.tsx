import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

import { useCallback, useEffect, useState } from "react";

import { AgGridReact } from "ag-grid-react";
import { Button } from "../ui/button";
import { TabsContent } from "../ui/tabs";
import { useToast } from "@/hooks/ToastProvider";

export default function LotIdTable({
  data,
  onChange,
}: {
  data: any;
  onChange: (data: any) => any;
}) {
  const [columns, setColumns] = useState<any[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    const columns = [
      { field: "Index", pinned: "left", headerName: "Zeile" },
      { field: "LotId", pinned: "left", filter: true },
      {
        field: "Artikelnummer",
        pinned: "left",
        filter: true,
      },
      {
        field: "Produktname",
        filter: true,
        pinned: "left",
        wrapText: true,
        width: 300,
      },
      {
        field: "Kennzeichen 3",
        filter: true,
        pinned: "left",
      },
      {
        field: "Ablaufdatum",
        filter: true,
        pinned: "left",
        cellRenderer: (data: { value: string }) => {
          const date = new Date(data.value).toLocaleDateString();
          return date != "Invalid Date" ? date : "-";
        },
        cellDataType: "date",
        headerTooltip: "GELB: Datum läuft bald ab - ROT: Datum ist abgelaufen",
        tooltipValueGetter: () =>
          "GELB: Datum läuft bald ab - ROT: Datum ist abgelaufen",
        cellClassRules: {
          "bg-red-100": (params: { value: string }) =>
            new Date(params.value) < new Date(),
          "bg-amber-100": (params: { value: string }) =>
            new Date(params.value) > new Date() &&
            new Date(params.value) <
              new Date(new Date().setMonth(new Date().getMonth() + 3)),
        },
      },
      {
        field: "Eigenbestand nach ERP",
        filter: true,
        cellClassRules: {
          "bg-amber-100": (params: any) =>
            params.value == 0 && params.data["RFID-Scan"] == 1,
          "bg-red-100": (params: any) =>
            params.value == 1 && params.data["RFID-Scan"] == 0,
          "bg-green-100": (params: any) =>
            params.value == 1 && params.data["RFID-Scan"] == 1,
        },
        width: 150,
        type: "numericColumn",
      },
      {
        field: "RFID-Scan",
        filter: true,
        editable: true,
        cellClassRules: {
          "bg-blue-100": (params: any) => {
            return params.data.isEdited;
          },
          "bg-red-100": (params: any) =>
            params.value == 0 && params.data["Eigenbestand nach ERP"] == 1,
          "bg-amber-100": (params: any) =>
            params.value == 1 && params.data["Eigenbestand nach ERP"] == 0,
          "bg-green-100": (params: any) =>
            params.value == 1 && params.data["Eigenbestand nach ERP"] == 1,
        },
        type: "numericColumn",
      },
      {
        field: "Kommentar",
        filter: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: [
            "",
            "berechnen + liefern",
            "interne Berechnung",
            "interne Gutschrift mit Rückbuchung auf Konsi",
            "NUR berechnen",
            "NUR liefern auf Konsi",
            "Resteriaustausch",
            "über Gutschrift ins Konsi buchen",
          ],
        },
        editable: true,
      },
      {
        field: "Anmerkung",
        filter: true,
        editable: true,
      },
    ];
    setColumns(columns);
  }, [data]);

  const getRowId = useCallback((params: any) => params.data.id, []);

  const onCellEditRequest = useCallback((event: any) => {
    const oldData = event.data;
    const field = event.colDef.field;
    const newData = { ...oldData };
    const uuid = oldData.id;
    newData[field] = event.newValue;

    data.map((row: any) => {
      if (row.id === uuid) {
        row[field] = event.newValue;
        event.data.isEdited = true; // set edit-flag
      }
    });

    onChange([...data]);

    const tx = {
      update: [newData],
    };
    event.api.applyTransaction(tx);
  }, []);

  // -------------------------------
  // 🔁 Autofill "Kommentar" Button
  // -------------------------------
  const handleAutoFillKommentare = () => {
    const updatedData = [...data];
    const grouped: Record<string, any[]> = {};
    updatedData.forEach((row) => {
      const key = row.Artikelnummer;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });

    let affectedArtikelnummern: string[] = [];

    Object.entries(grouped).forEach(([artikelnummer, group]) => {
      const remaining = [...group];

      while (true) {
        const missingIndex = remaining.findIndex(
          (row) => row["RFID-Scan"] == 0 && row["Eigenbestand nach ERP"] == 1
        );
        const scannedIndex = remaining.findIndex(
          (row) => row["RFID-Scan"] == 1 && row["Eigenbestand nach ERP"] == 0
        );

        if (missingIndex === -1 || scannedIndex === -1) break;

        const missing = remaining.splice(missingIndex, 1)[0];
        const scanned = remaining.splice(
          scannedIndex > missingIndex ? scannedIndex - 1 : scannedIndex,
          1
        )[0];

        if (missing && scanned) {
          missing.Kommentar = "interne Berechnung";
          scanned.Kommentar = "interne Gutschrift mit Rückbuchung auf Konsi";
          missing.isEdited = true;
          scanned.isEdited = true;

          affectedArtikelnummern.push(artikelnummer);
        }
      }
    });

    if (affectedArtikelnummern.length > 0) {
      showToast(
        `${[...new Set(affectedArtikelnummern)].length} Artikelnummer(n) automatisch kommentiert.`
      );
    } else {
      showToast("Keine passenden Paare zum Kommentieren gefunden.");
    }

    onChange(updatedData);
  };

  return (
    <TabsContent value='4' className='h-[calc(100vh-110px)] ag-theme-balham'>
      <div className='flex justify-end pb-2'>
        <Button onClick={handleAutoFillKommentare}>
          Auto-Kommentare ausfüllen
        </Button>
      </div>
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
        onCellEditRequest={onCellEditRequest}
      />
    </TabsContent>
  );
}
