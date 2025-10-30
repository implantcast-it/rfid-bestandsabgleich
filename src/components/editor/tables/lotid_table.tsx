import * as Collapsible from "@radix-ui/react-collapsible";
import * as Toast from "@radix-ui/react-toast";

import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AG_GRID_LOCALE_DE } from "@ag-grid-community/locale";
import { AgGridReact } from "ag-grid-react";
import ErrorToast from "@/components/ui/ErrorToast";
import { RowSelectionOptions } from "ag-grid-community";
import SuccessToast from "@/components/ui/SuccessToast";

// --- 'To Do' OPTIONS ---
const TODO_OPTIONS = [
  "",
  "berechnen + liefern",
  "interne Berechnung",
  "interne Gutschrift mit Rückbuchung auf Konsi",
  "NUR berechnen",
  "NUR liefern auf Konsi",
  "Resteriaustausch",
  "über Gutschrift ins Konsi buchen",
  "Storno / offener Posten",
];

// --- 'Anmerkung' OPTIONS ---
const ANMERKUNG_OPTIONS = [
  "",
  "AWS",
  "bereits unterwegs",
  "Ersatzartikel",
  "geht zurück",
  "in Klärung",
  "Kaufware",
  "kein RFID Chip",
  "Klinik bestellt",
  "Mitnahme",
  "nicht scanbar / Lot korrekt",
  "offener Posten",
];

export default function LotIdTable({
  data,
  theme,
  onChange,
}: {
  data: any;
  theme: any;
  onChange: (data: any) => any;
}) {
  const [columns, setColumns] = useState<any[]>([]);

  // --- REF FOR THE GRID API ---
  const gridRef = useRef<AgGridReact>(null);

  // --- STATE FOR BULK INPUTS ---
  const [bulkToDo, setBulkTodDo] = useState("");
  const [bulkAnmerkung, setBulkAnmerkung] = useState("");
  const [bulkRfidScan, setBulkRfidScan] = useState("");
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(true);
  const [toastInfo, setToastInfo] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    description: string;
  } | null>(null);

  console.log(data);

  useEffect(() => {
    const columns = [
      {
        field: "Index",
        pinned: "left",
        width: 100,
        checkboxSelection: true,
      },
      { field: "LotId", pinned: "left", filter: true, headerName: "LotID" },
      {
        field: "Artikelnummer",
        headerName: "Artikelnr.",
        pinned: "left",
        filter: true,
      },
      {
        field: "Produktname",
        pinned: "left",
        filter: true,
        wrapText: true,
      },
      {
        field: "Kennzeichen 3",
        headerName: "Kz 3",
        filter: true,
        pinned: "left",
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
          "bg-red-100 dark:bg-red-400/80": (params: { value: string }) =>
            new Date(params.value) < new Date(),
          "bg-amber-100 dark:bg-amber-400/80": (params: { value: string }) =>
            new Date(params.value) > new Date() &&
            new Date(params.value) <
              new Date(new Date().setMonth(new Date().getMonth() + 3)),
        },
      },
      {
        field: "Eigenbestand nach ERP",
        headerName: "ERP",
        filter: true,
        cellClassRules: {
          "bg-amber-100 dark:bg-amber-400/80": (params: any) =>
            params.value == 0 && params.data["RFID-Scan"] == 1,
          "bg-red-100 dark:bg-red-400/80": (params: any) =>
            params.value == 1 && params.data["RFID-Scan"] == 0,
          "bg-green-100 dark:bg-green-400/60": (params: any) =>
            params.value == 1 && params.data["RFID-Scan"] == 1,
        },
        width: 150,
        type: "numericColumn",
      },
      {
        field: "RFID-Scan",
        headerName: "RFID",
        filter: true,
        editable: true,
        cellClassRules: {
          "bg-red-100 dark:bg-red-400/80": (params: any) =>
            params.value == 0 && params.data["Eigenbestand nach ERP"] == 1,
          "bg-amber-100 dark:bg-amber-400/80": (params: any) =>
            params.value == 1 && params.data["Eigenbestand nach ERP"] == 0,
          "bg-green-100 dark:bg-green-400/60": (params: any) =>
            params.value == 1 && params.data["Eigenbestand nach ERP"] == 1,
        },
        type: "numericColumn",
      },
      {
        field: "To Do",
        filter: true,
        cellEditor: "agSelectCellEditor",
        singleClickEdit: true,
        cellEditorParams: {
          values: TODO_OPTIONS,
        },
        editable: true,
        cellClassRules: {
          "bg-yellow-100 dark:bg-yellow-400/80": (params: any) => {
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
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: ANMERKUNG_OPTIONS,
        },
        singleClickEdit: true,
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

  // --- HANDLER FOR BULK 'To Do' ---
  const handleApplyBulkTodDo = () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || selectedNodes.length === 0) {
      setToastInfo({
        type: "error",
        open: true,
        title: "Keine Zeilen ausgewählt",
        description: "Bitte wählen Sie Zeilen aus, die Sie ändern möchten.",
      });
      return;
    }

    const selectedIds = new Set(selectedNodes.map((node) => node.data.id));

    console.log("Selected IDs for bulk 'To Do':", selectedIds);

    onChange((prevData: any[]) =>
      prevData.map((row) => {
        if (selectedIds.has(row.id)) {
          return {
            ...row,
            "To Do": bulkToDo, // Apply the new value from state
            isEdited: true,
          };
        }
        return row;
      })
    );

    setToastInfo({
      type: "success",
      open: true,
      title: "'To Do' aktualisiert",
      description: `${selectedIds.size} Zeile(n) wurden aktualisiert.`,
    });

    setBulkTodDo(""); // Reset input
    gridRef.current?.api.deselectAll(); // Deselect rows
  };

  // --- HANDLER FOR BULK 'Anmerkung' ---
  const handleApplyBulkAnmerkung = () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || selectedNodes.length === 0) {
      setToastInfo({
        type: "error",
        open: true,
        title: "Keine Zeilen ausgewählt",
        description: "Bitte wählen Sie Zeilen aus, die Sie ändern möchten.",
      });
      return;
    }

    const selectedIds = new Set(selectedNodes.map((node) => node.data.id));

    onChange((prevData: any[]) =>
      prevData.map((row) => {
        if (selectedIds.has(row.id)) {
          return {
            ...row,
            Anmerkung: bulkAnmerkung, // Apply the new value from state
            isEdited: true,
          };
        }
        return row;
      })
    );

    setToastInfo({
      type: "success",
      open: true,
      title: "'Anmerkung' aktualisiert",
      description: `${selectedIds.size} Zeile(n) wurden aktualisiert.`,
    });

    setBulkAnmerkung(""); // Reset input
    gridRef.current?.api.deselectAll(); // Deselect rows
  };

  // --- HANDLER FOR BULK 'RFID-Scan' ---
  const handleApplyBulkRfidScan = () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || selectedNodes.length === 0) {
      setToastInfo({
        type: "error",
        open: true,
        title: "Keine Zeilen ausgewählt",
        description: "Bitte wählen Sie Zeilen aus, die Sie ändern möchten.",
      });
      return;
    }

    // Check if a value is selected
    if (bulkRfidScan === "") {
      setToastInfo({
        type: "error",
        open: true,
        title: "Kein Wert ausgewählt",
        description: "Bitte wählen Sie einen 'RFID-Scan' Wert (0 oder 1) aus.",
      });
      return;
    }

    const selectedIds = new Set(selectedNodes.map((node) => node.data.id));
    const scanValue = parseInt(bulkRfidScan, 10); // Convert "0" or "1" to number

    onChange((prevData: any[]) =>
      prevData.map((row) => {
        if (selectedIds.has(row.id)) {
          return {
            ...row,
            "RFID-Scan": scanValue, // Apply the new numeric value
            isEdited: true,
          };
        }
        return row;
      })
    );

    setToastInfo({
      type: "success",
      open: true,
      title: "'RFID-Scan' aktualisiert",
      description: `${selectedIds.size} Zeile(n) wurden auf '${scanValue}' gesetzt.`,
    });

    setBulkRfidScan(""); // Reset input
    gridRef.current?.api.deselectAll(); // Deselect rows
  };

  const rowSelection = useMemo<RowSelectionOptions>(() => {
    return {
      mode: "multiRow",
      enableClickSelection: true, // CRTL+Click to select
      headerCheckbox: false,
      checkboxes: false,
    };
  }, []);

  return (
    // --- WRAPPER FOR FLEX LAYOUT ---
    <Toast.Provider>
      <div className='flex flex-col h-full'>
        {/* --- COLLAPSIBLE BULK UPDATE UI --- */}
        <Collapsible.Root
          open={isBulkEditOpen}
          onOpenChange={setIsBulkEditOpen}
          className='flex-shrink-0 mb-4'
        >
          <div className='flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 px-4 py-2 border dark:border-gray-700 rounded-t-lg'>
            <h3 className='font-semibold text-gray-800 dark:text-gray-200 text-lg'>
              Massenbearbeitung (für ausgewählte Zeilen)
            </h3>
            <Collapsible.Trigger asChild>
              <button className='inline-flex justify-center items-center bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 disabled:opacity-50 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-500 ring-offset-white focus-visible:ring-offset-2 dark:ring-offset-zinc-950 w-9 h-9 font-medium hover:text-zinc-900 dark:hover:text-zinc-50 text-sm whitespace-nowrap transition-colors disabled:pointer-events-none'>
                {isBulkEditOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                <span className='sr-only'>
                  {isBulkEditOpen ? "Einklappen" : "Ausklappen"}
                </span>
              </button>
            </Collapsible.Trigger>
          </div>

          <Collapsible.Content className='CollapsibleContentAnimation'>
            <div className='flex flex-wrap items-end gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 border-x dark:border-gray-700 border-b rounded-b-lg'>
              {/* To Do Bulk Edit */}
              <div className='flex-1 min-w-[250px]'>
                <label
                  htmlFor='bulk-todo'
                  className='block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm'
                >
                  'To Do' setzen:
                </label>
                <div className='flex gap-2'>
                  <div className='relative flex-grow'>
                    <select
                      id='bulk-todo'
                      value={bulkToDo}
                      onChange={(e) => setBulkTodDo(e.target.value)}
                      className='block bg-white dark:bg-gray-900 shadow-sm py-2 pr-8 pl-3 border border-gray-300 focus:border-accent-500 dark:border-gray-700 rounded-lg focus:outline-none w-full sm:text-sm appearance-none'
                    >
                      {TODO_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option || "--- Leeren ---"}
                        </option>
                      ))}
                    </select>
                    <div className='right-0 absolute inset-y-0 flex items-center pr-2 pointer-events-none'>
                      <ExpandMoreIcon className='text-gray-400' />
                    </div>
                  </div>
                  <button
                    onClick={handleApplyBulkTodDo}
                    className='inline-flex justify-center items-center bg-zinc-900 hover:bg-zinc-900/90 dark:bg-gray-600 dark:hover:bg-gray-500 disabled:opacity-50 px-4 py-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-500 ring-offset-white focus-visible:ring-offset-2 dark:ring-offset-zinc-950 h-10 font-medium text-zinc-50 dark:text-gray-300 text-sm whitespace-nowrap transition-colors disabled:pointer-events-none shrink-0'
                  >
                    Anwenden
                  </button>
                </div>
              </div>

              {/* Anmerkung Bulk Edit */}
              <div className='flex-1 min-w-[250px]'>
                <label
                  htmlFor='bulk-anmerkung'
                  className='block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm'
                >
                  'Anmerkung' setzen:
                </label>
                <div className='flex gap-2'>
                  <div className='relative flex-grow'>
                    <select
                      id='bulk-anmerkung'
                      value={bulkAnmerkung}
                      onChange={(e) => setBulkAnmerkung(e.target.value)}
                      className='block bg-white dark:bg-gray-900 shadow-sm py-2 pr-8 pl-3 border border-gray-300 focus:border-accent-500 dark:border-gray-700 rounded-lg focus:outline-none w-full sm:text-sm appearance-none'
                    >
                      {ANMERKUNG_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option || "--- Leeren ---"}
                        </option>
                      ))}
                    </select>
                    <div className='right-0 absolute inset-y-0 flex items-center pr-2 pointer-events-none'>
                      <ExpandMoreIcon className='text-gray-400' />
                    </div>
                  </div>
                  <button
                    onClick={handleApplyBulkAnmerkung}
                    className='inline-flex justify-center items-center bg-zinc-900 hover:bg-zinc-900/90 dark:bg-gray-600 dark:hover:bg-gray-500 disabled:opacity-50 px-4 py-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-500 ring-offset-white focus-visible:ring-offset-2 dark:ring-offset-zinc-950 h-10 font-medium text-zinc-50 dark:text-gray-300 text-sm whitespace-nowrap transition-colors disabled:pointer-events-none shrink-0'
                  >
                    Anwenden
                  </button>
                </div>
              </div>

              {/* --- RFID-Scan Bulk Edit --- */}
              <div className='flex-1 min-w-[250px]'>
                <label
                  htmlFor='bulk-rfid'
                  className='block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm'
                >
                  'RFID-Scan' setzen:
                </label>
                <div className='flex gap-2'>
                  <div className='relative flex-grow'>
                    <select
                      id='bulk-rfid'
                      value={bulkRfidScan}
                      onChange={(e) => setBulkRfidScan(e.target.value)}
                      className='block bg-white dark:bg-gray-900 shadow-sm py-2 pr-8 pl-3 border border-gray-300 focus:border-accent-500 dark:border-gray-700 rounded-lg focus:outline-none w-full sm:text-sm appearance-none'
                    >
                      <option value=''>--- Auswählen ---</option>
                      <option value='0'>0</option>
                      <option value='1'>1</option>
                    </select>
                    <div className='right-0 absolute inset-y-0 flex items-center pr-2 pointer-events-none'>
                      <ExpandMoreIcon className='text-gray-400' />
                    </div>
                  </div>
                  <button
                    onClick={handleApplyBulkRfidScan}
                    className='inline-flex justify-center items-center bg-zinc-900 hover:bg-zinc-900/90 dark:bg-gray-600 dark:hover:bg-gray-500 disabled:opacity-50 px-4 py-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-500 ring-offset-white focus-visible:ring-offset-2 dark:ring-offset-zinc-950 h-10 font-medium text-zinc-50 dark:text-gray-300 text-sm whitespace-nowrap transition-colors disabled:pointer-events-none shrink-0'
                  >
                    Anwenden
                  </button>
                </div>
              </div>
            </div>
          </Collapsible.Content>
        </Collapsible.Root>

        {/* --- WRAPPER FOR GRID TO FILL REMAINING SPACE --- */}
        <div className='flex-1 w-full overflow-hidden'>
          <AgGridReact
            ref={gridRef}
            theme={theme}
            rowData={data}
            columnDefs={columns}
            paginationPageSize={50}
            paginationPageSizeSelector={[20, 50, 100, 500, 1000, 2000]}
            pagination
            animateRows={false}
            autoSizeStrategy={{ type: "fitCellContents" }}
            getRowId={getRowId}
            onCellValueChanged={onCellValueChanged}
            rowSelection={rowSelection}
            localeText={AG_GRID_LOCALE_DE}
            className='h-full'
            processUnpinnedColumns={() => []}
            defaultColDef={{ enableCellChangeFlash: true }}
          />
        </div>

        {/* --- Toast Components & Viewport --- */}
        {toastInfo?.type === "success" && (
          <SuccessToast
            open={toastInfo.open}
            onOpenChange={(isOpen) => !isOpen && setToastInfo(null)}
            title={toastInfo.title}
            description={toastInfo.description}
          />
        )}
        {toastInfo?.type === "error" && (
          <ErrorToast
            open={toastInfo.open}
            onOpenChange={(isOpen) => !isOpen && setToastInfo(null)}
            title={toastInfo.title}
            description={toastInfo.description}
          />
        )}
        <Toast.Viewport className='right-0 bottom-0 z-[2147483647] fixed flex flex-col gap-[10px] m-0 p-[var(--viewport-padding)] outline-none w-[390px] max-w-[100vw] list-none [--viewport-padding:_25px]' />
      </div>
    </Toast.Provider>
  );
}
