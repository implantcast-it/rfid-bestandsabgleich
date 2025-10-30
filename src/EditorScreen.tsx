import * as Toast from "@radix-ui/react-toast";

import {
  AllCommunityModule,
  ModuleRegistry,
  iconSetMaterial,
  themeQuartz,
} from "ag-grid-community";
import { ReactNode, useCallback, useEffect, useState } from "react";
import Sidebar, { NavSection } from "./components/editor/Sidebar";
import { handleExcelDownload, handlePdfDownload } from "./lib/utils";

import ArtNrTable from "./components/editor/tables/artNr_table";
import BarcodeTable from "./components/editor/tables/barcode_table";
import DnsOutlinedIcon from "@mui/icons-material/DnsOutlined";
import EditorPage from "./components/editor/EditorPage";
import ErpTable from "./components/editor/tables/erp_table";
import ErrorToast from "@/components/ui/ErrorToast"; // Adjust path as needed
import LotIdTable from "./components/editor/tables/lotid_table";
import PinOutlinedIcon from "@mui/icons-material/PinOutlined";
import QrCodeOutlinedIcon from "@mui/icons-material/QrCodeOutlined";
import RfidTable from "./components/editor/tables/rfid_table";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import ScanTable from "./components/editor/tables/scan_table";
import SensorsOutlinedIcon from "@mui/icons-material/SensorsOutlined";
import SuccessToast from "@/components/ui/SuccessToast"; // Adjust path as needed
import TagOutlinedIcon from "@mui/icons-material/TagOutlined";
import { useLocation } from "wouter";
import { utils } from "xlsx";

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeQuartz.withPart(iconSetMaterial).withParams({
  accentColor: "#005F6B",
  browserColorScheme: "light",
  cellHorizontalPaddingScale: 1,
  columnBorder: false,
  headerFontSize: 14,
  iconSize: 18,
  rowVerticalPaddingScale: 0.7,
});

// --- Type Definitions ---
interface PageConfig {
  title: string;
  hasHeaderButtons: boolean;
}

interface PageConfigMap {
  [key: string]: PageConfig;
}

// --- Navigation Structure ---
const navSections: NavSection[] = [
  {
    title: "Bestände",
    items: [
      { id: "erp", name: "ERP", icon: <DnsOutlinedIcon /> },
      { id: "barcode", name: "Barcode", icon: <QrCodeOutlinedIcon /> },
      { id: "rfid", name: "RFID", icon: <SensorsOutlinedIcon /> },
    ],
  },
  {
    title: "Vergleiche",
    items: [
      { id: "lotId", name: "LotId", icon: <PinOutlinedIcon /> },
      { id: "artikelNr", name: "Artikelnummer", icon: <TagOutlinedIcon /> },
      { id: "scan", name: "Scan", icon: <RuleOutlinedIcon /> },
    ],
  },
];

// --- Page Configurations ---
const pageConfig: PageConfigMap = {
  erp: { title: "ERP Bestände", hasHeaderButtons: false },
  barcode: { title: "Barcode Scan", hasHeaderButtons: false },
  rfid: { title: "RFID Scan", hasHeaderButtons: false },
  scan: { title: "Barcode & RFID Vergleich", hasHeaderButtons: false },
  lotId: { title: "Bestandsabgleich nach LotId", hasHeaderButtons: true },
  artikelNr: {
    title: "Bestandsabgleich nach Artikelnummer",
    hasHeaderButtons: false,
  },
};

// --- Main Component ---
export default function EditorScreen() {
  const [activeTab, setActiveTab] = useState<string>("lotId");

  const currentPageConfig = pageConfig[activeTab] || {
    title: "Editor",
    hasHeaderButtons: false,
  };

  const comparisonData = history.state || null;
  const [, setLocation] = useLocation();

  if (!comparisonData) {
    setLocation("/");
    return null;
  }

  // --- ARTNR STATE ---
  const [artNrData, setArtNrData] = useState<any[]>(
    utils.sheet_to_json(
      comparisonData.masterData.Sheets["Bestandsabgleich Artikelnummer"],
      {
        header: 0,
      }
    )
  );

  // --- LOTID STATE & HISTORY STATE ---
  const [lotIdData, setLotIdData] = useState<any[]>(
    utils.sheet_to_json(
      comparisonData.masterData.Sheets["Bestandsabgleich LotId"],
      {
        header: 0,
      }
    )
  );

  // --- Listener for changes on the lotId table for changing rfid-scan amounts ---
  useEffect(() => {
    if (!lotIdData) return; // Don't run if data isn't loaded

    // 1. Group data by 'Artikelnummer'
    const groupedData = lotIdData.reduce(
      (acc, row) => {
        const artikelNr = row["Artikelnummer"];
        if (!artikelNr) return acc; // Skip rows without an Artikelnummer

        if (!acc[artikelNr]) {
          // Initialize the group if it doesn't exist
          acc[artikelNr] = {
            Artikelnummer: artikelNr,
            Produktname: row["Produktname"], // Assume Produktname is the same for all
            "Eigenbestand nach ERP": 0,
            "RFID-Scan": 0,
            id: artikelNr, // Use Artikelnummer as a unique ID for the ArtNrTable
          };
        }

        // 2. Sum the values
        acc[artikelNr]["Eigenbestand nach ERP"] +=
          Number(row["Eigenbestand nach ERP"]) || 0;
        acc[artikelNr]["RFID-Scan"] += Number(row["RFID-Scan"]) || 0;

        return acc;
      },
      {} as Record<string, any>
    );

    // 3. Convert the grouped object back to an array and calculate 'Differenz'
    const newArtNrData = Object.values(groupedData).map((group) => {
      const g = group as {
        [key: string]: any;
        "Eigenbestand nach ERP": number;
        "RFID-Scan": number;
      };
      const differenz = g["Eigenbestand nach ERP"] - g["RFID-Scan"];
      return {
        ...g,
        Differenz: differenz,
      };
    });

    // 4. Update the artNrData state
    setArtNrData(newArtNrData);
  }, [lotIdData]); // listens for changes on the lotIdData

  // --- TOAST STATE ---
  const [toastInfo, setToastInfo] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    comparisonData.masterData.Sheets["Bestandsabgleich Artikelnummer"] =
      utils.json_to_sheet(artNrData);
  }, [artNrData]);

  useEffect(() => {
    comparisonData.masterData.Sheets["Bestandsabgleich LotId"] =
      utils.json_to_sheet(lotIdData);
  }, [lotIdData]);

  // Autofill "Kommentar" Button
  const handleAutoFillKommentare = useCallback(() => {
    const grouped: Record<string, any[]> = {};
    lotIdData.forEach((row: { Artikelnummer: any }) => {
      const key = row.Artikelnummer;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });

    let affectedArtikelnummern: string[] = [];
    const changesToApply = new Map<string, any>(); // <row.id, { änderungen... }>

    const isToDoEmpty = (row: any) => {
      if (!row) return true; // Safety check
      const todo = row["To Do"];
      // Check if the value is null, undefined, or an empty/whitespace string
      return !todo || todo.trim() === "";
    };

    Object.entries(grouped).forEach(([artikelnummer, group]) => {
      const missingItems = group.filter(
        (row) => row["RFID-Scan"] == 0 && row["Eigenbestand nach ERP"] == 1
      );
      const scannedItems = group.filter(
        (row) => row["RFID-Scan"] == 1 && row["Eigenbestand nach ERP"] == 0
      );

      const numPairs = Math.min(missingItems.length, scannedItems.length);

      if (numPairs > 0) {
        let changesMadeForThisArticle = false; // Flag to track if we apply comments

        for (let i = 0; i < numPairs; i++) {
          const missing = missingItems[i];
          const scanned = scannedItems[i];

          // Only apply comments if BOTH "To Do" fields in the pair are empty
          if (isToDoEmpty(missing) && isToDoEmpty(scanned)) {
            changesToApply.set(missing.id, {
              "To Do": "interne Berechnung",
              isEdited: true,
            });
            changesToApply.set(scanned.id, {
              "To Do": "interne Gutschrift mit Rückbuchung auf Konsi",
              isEdited: true,
            });

            changesMadeForThisArticle = true; // Mark that we made a change
          }
        }

        // Only add the article to the toast message if we actually made a change
        if (changesMadeForThisArticle) {
          affectedArtikelnummern.push(artikelnummer);
        }
      }
    });

    if (affectedArtikelnummern.length > 0) {
      setToastInfo({
        open: true,
        type: "success",
        title: "Kommentare automatisch ausgefüllt",
        description: `${[...new Set(affectedArtikelnummern)].length} Artikelnummer(n) automatisch kommentiert.`,
      });

      // Use the 'setLotIdData' state updater function
      setLotIdData((prevData: any[]) => {
        return prevData.map((row) => {
          if (changesToApply.has(row.id)) {
            return { ...row, ...changesToApply.get(row.id) };
          }
          return row;
        });
      });
    } else {
      setToastInfo({
        open: true,
        type: "error",
        title: "Keine passenden Paare gefunden",
        description: "Keine passenden Paare zum Kommentieren gefunden.",
      });
    }
  }, [lotIdData, setLotIdData]); // Depend on lotIdData and setLotIdData

  const handleAutoSiebeAndOffenePosten = useCallback(() => {
    const changesToApply = new Map<string, any>();
    let siebRowCount = 0;
    let offenePostenRowCount = 0;

    lotIdData.forEach((row: any) => {
      // Logic for "Auto-Siebe"
      if (row["Kennzeichen 3"] === "SIEB" && row["RFID-Scan"] == 0) {
        // Get existing changes in case the row also matches the other condition
        const existingChanges = changesToApply.get(row.id) || {};
        changesToApply.set(row.id, {
          ...existingChanges,
          "RFID-Scan": 1,
          isEdited: true,
        });
        siebRowCount++;
      }

      // Logic for "Offene Posten"
      if (row["RFID-Scan"] == 0 && row["Eigenbestand nach ERP"] == 0) {
        const existingChanges = changesToApply.get(row.id) || {};
        changesToApply.set(row.id, {
          ...existingChanges,
          Anmerkung: "offener Posten",
          isEdited: true,
        });
        // Only increment if we didn't already count it as a "Sieb"
        // to avoid double-counting rows, though 'offenePostenRowCount'
        offenePostenRowCount++;
      }
    });

    if (siebRowCount > 0 || offenePostenRowCount > 0) {
      setLotIdData((prevData: any[]) => {
        return prevData.map((row) => {
          if (changesToApply.has(row.id)) {
            return { ...row, ...changesToApply.get(row.id) };
          }
          return row;
        });
      });

      const descriptions = [];
      if (siebRowCount > 0) {
        descriptions.push(`${siebRowCount} 'SIEB' Zeile(n)`);
      }
      if (offenePostenRowCount > 0) {
        descriptions.push(`${offenePostenRowCount} 'Offene Posten'`);
      }

      setToastInfo({
        open: true,
        type: "success",
        title: "Aktionen ausgeführt",
        description: `${descriptions.join(" und ")} aktualisiert.`,
      });
    } else {
      setToastInfo({
        open: true,
        type: "error",
        title: "Keine Aktionen ausgeführt",
        description: "Keine Zeilen für 'SIEB' oder 'Offene Posten' gefunden.",
      });
    }
  }, [lotIdData, setLotIdData]); // Depend on lotIdData and setLotIdData

  const renderPageContent = (): ReactNode => {
    switch (activeTab) {
      case "erp":
        return (
          <ErpTable
            theme={theme}
            data={comparisonData.masterData.Sheets["Ax-Bestand"]}
          />
        );
      case "barcode":
        return (
          <BarcodeTable
            theme={theme}
            data={comparisonData.masterData.Sheets["Barcode-Scan"]}
          />
        );
      case "rfid":
        return (
          <RfidTable
            theme={theme}
            data={comparisonData.masterData.Sheets["RFID-Scan"]}
          />
        );
      case "lotId":
        return (
          <LotIdTable theme={theme} data={lotIdData} onChange={setLotIdData} />
        );
      case "artikelNr":
        return <ArtNrTable theme={theme} data={artNrData} />;
      case "scan":
        return (
          <ScanTable
            theme={theme}
            data={comparisonData.masterData.Sheets["Vergleich der Scans"]}
          />
        );

      default:
        return (
          <div>
            Fehler: Keine Daten gefunden - du befindest dich auf der falschen
            Seite! Wähle eine Seite aus dem Menü.
          </div>
        );
    }
  };

  return (
    <Toast.Provider>
      <div className='flex bg-background-light dark:bg-background-dark w-full h-screen overflow-hidden font-display text-gray-800 dark:text-gray-200'>
        {/* ... (Sidebar) ... */}
        <Sidebar
          navSections={navSections}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onDownloadExcel={() =>
            handleExcelDownload(comparisonData, setToastInfo)
          }
          onDownloadPdf={() => handlePdfDownload(comparisonData, setToastInfo)}
          onRestart={() => setLocation("/")}
        />
        <main className='flex flex-col flex-1 overflow-hidden'>
          <EditorPage
            title={currentPageConfig.title}
            hasHeaderButtons={currentPageConfig.hasHeaderButtons}
            onAutoCheck={handleAutoSiebeAndOffenePosten}
            onAutoFill={handleAutoFillKommentare}
          >
            {renderPageContent()}
          </EditorPage>
        </main>
      </div>

      {/* --- TOAST RENDER LOGIC --- */}
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
    </Toast.Provider>
  );
}
