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
        field: "To Do",
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
            "Storno / offener Posten",
          ],
        },
        editable: true,
        cellClassRules: {
          "bg-yellow-100": (params: any) => {
            if (!params.data) return false;
            const hasDifference =
              params.data["RFID-Scan"] != params.data["Eigenbestand nach ERP"];
            const isEmpty = !params.value || params.value.trim() === "";
            return hasDifference && isEmpty;
          },
        },
      },
      {
        field: "Anmerkung",
        filter: true,
        editable: true,
      },
    ];
    setColumns(columns);
  }, []);

  const getRowId = useCallback((params: any) => params.data.id, []);

  const onCellValueChanged = useCallback(
    (event: any) => {
      const updatedRow = event.data;
      const uuid = updatedRow.id;

      const updatedData = data.map((row: any) => {
        if (row.id === uuid) {
          return { ...updatedRow, isEdited: true };
        }
        return row;
      });

      onChange(updatedData);
    },
    [data, onChange]
  );

  // Autofill "Kommentar" Button
  const handleAutoFillKommentare = useCallback(() => {
    const grouped: Record<string, any[]> = {};
    data.forEach((row: { Artikelnummer: any }) => {
      const key = row.Artikelnummer;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });

    let affectedArtikelnummern: string[] = [];
    const changesToApply = new Map<string, any>(); // <row.id, { änderungen... }>

    Object.entries(grouped).forEach(([artikelnummer, group]) => {
      const missingItems = group.filter(
        (row) => row["RFID-Scan"] == 0 && row["Eigenbestand nach ERP"] == 1
      );
      const scannedItems = group.filter(
        (row) => row["RFID-Scan"] == 1 && row["Eigenbestand nach ERP"] == 0
      );

      const numPairs = Math.min(missingItems.length, scannedItems.length);

      if (numPairs > 0) {
        affectedArtikelnummern.push(artikelnummer);

        for (let i = 0; i < numPairs; i++) {
          const missing = missingItems[i];
          const scanned = scannedItems[i];

          changesToApply.set(missing.id, {
            "To Do": "interne Berechnung",
            isEdited: true,
          });
          changesToApply.set(scanned.id, {
            "To Do": "interne Gutschrift mit Rückbuchung auf Konsi",
            isEdited: true,
          });
        }
      }
    });

    if (affectedArtikelnummern.length > 0) {
      showToast(
        `${[...new Set(affectedArtikelnummern)].length} Artikelnummer(n) automatisch kommentiert.`
      );

      onChange((prevData: any[]) => {
        return prevData.map((row) => {
          if (changesToApply.has(row.id)) {
            return { ...row, ...changesToApply.get(row.id) };
          }
          return row;
        });
      });
    } else {
      showToast("Keine passenden Paare zum Kommentieren gefunden.");
    }
  }, [data, onChange, showToast]);

  const handleSetSiebScanToOne = useCallback(() => {
    const changesToApply = new Map<string, any>();
    let affectedRowCount = 0;

    data.forEach((row: any) => {
      if (row["Kennzeichen 3"] === "SIEB" && row["RFID-Scan"] == 0) {
        changesToApply.set(row.id, {
          "RFID-Scan": 1,
          isEdited: true,
        });
        affectedRowCount++;
      }
    });

    if (affectedRowCount > 0) {
      onChange((prevData: any[]) => {
        return prevData.map((row) => {
          if (changesToApply.has(row.id)) {
            return { ...row, ...changesToApply.get(row.id) };
          }
          return row;
        });
      });
      showToast(`${affectedRowCount} 'SIEB' Zeile(n) auf '1' gesetzt.`);
    } else {
      showToast("Keine 'SIEB' Zeilen mit RFID-Scan '0' gefunden.");
    }
  }, [data, onChange, showToast]);

  const handleSetOffenePosten = useCallback(() => {
    const changesToApply = new Map<string, any>();
    let affectedRowCount = 0;

    data.forEach((row: any) => {
      if (row["RFID-Scan"] == 0 && row["Eigenbestand nach ERP"] == 0) {
        changesToApply.set(row.id, {
          Anmerkung: "offener Posten",
          isEdited: true,
        });
        affectedRowCount++;
      }
    });

    if (affectedRowCount > 0) {
      onChange((prevData: any[]) => {
        return prevData.map((row) => {
          if (changesToApply.has(row.id)) {
            return { ...row, ...changesToApply.get(row.id) };
          }
          return row;
        });
      });
      showToast(`${affectedRowCount} Zeile(n) als 'offener Posten' markiert.`);
    } else {
      showToast("Keine Zeilen für 'offener Posten' gefunden.");
    }
  }, [data, onChange, showToast]);

  return (
    <TabsContent value='4' className='h-[calc(100vh-110px)] ag-theme-balham'>
      <div className='flex justify-end gap-2 pb-2'>
        <Button onClick={handleSetOffenePosten}>Offene Posten</Button>
        <Button onClick={handleSetSiebScanToOne}>
          'SIEB' Scan auf 1 setzen
        </Button>
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
        getRowId={getRowId}
        onCellValueChanged={onCellValueChanged}
      />
    </TabsContent>
  );
}
