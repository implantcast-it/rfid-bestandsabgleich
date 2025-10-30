import { DataRow, compareFiles } from "./compare";
import { WorkBook, read, utils } from "xlsx"; // Import Workbook type
import { readFile, readTextFile } from "@tauri-apps/plugin-fs";

// --- Type Definitions ---

/**
 * Defines the structure for the file path inputs.
 */
interface FilePaths {
  master?: string;
  erp?: string;
  rfid?: string;
  barcode?: string;
}

/**
 * Defines the structure for the progress update object.
 */
interface ProgressUpdate {
  percent: number;
  message: string;
}

/**
 * Defines the structure for the successful result object.
 * The 'any' type is used here because the structure of the workbook
 * depends on the 'dense' option from xlsx.
 */
export interface ProcessingResults {
  masterData?: WorkBook | any;
  erpData?: WorkBook | any;
  rfidData?: WorkBook | any;
  barcodeData?: WorkBook | any | null;
}

/**
 * Defines the props for the processFiles function.
 */
interface ProcessFilesArgs {
  filePaths: FilePaths;
  onProgress: (progress: ProgressUpdate) => void;
  onSuccess: (results: any) => void;
  onError: (error: Error) => void;
}

// --- Function Implementation ---

/**
 * Simulates a delay for asynchronous operations.
 * @param {number} ms - The number of milliseconds to wait.
 */
const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Processes the provided files.
 * @param {ProcessFilesArgs} args - The arguments object.
 */
export async function processFiles({
  filePaths,
  onProgress,
  onSuccess,
  onError,
}: ProcessFilesArgs): Promise<void> {
  try {
    const { master, erp, rfid, barcode } = filePaths;
    const results: ProcessingResults = {};

    onProgress({ percent: 0, message: "Starte Verarbeitung..." });
    await wait(200);

    // 1. Read Inventur-Master (.xlsx - binary)
    if (!master) throw new Error("Inventur-Master-Datei fehlt.");
    onProgress({ percent: 10, message: "Lese Inventur-Master..." });
    results.masterData = await readFile(master).then((binaryData) =>
      read(binaryData, { dense: true, type: "buffer" })
    );
    onProgress({ percent: 25, message: "Inventur-Master geladen." });

    // 2. Read ERP-Daten (.xlsx - binary)
    if (!erp) throw new Error("ERP-Datei fehlt.");
    onProgress({ percent: 35, message: "Lese ERP-Daten..." });
    results.erpData = await readFile(erp).then((binaryData) =>
      read(binaryData, { dense: true, sheets: 0, type: "buffer" })
    );
    onProgress({ percent: 50, message: "ERP-Daten geladen." });

    // 3. Read RFID-Scan Daten (.txt - text)
    if (!rfid) throw new Error("RFID-Scan-Datei fehlt.");
    onProgress({ percent: 60, message: "Lese RFID-Scan Daten..." });
    results.rfidData = await readTextFile(rfid).then((textContent) =>
      read(textContent, { dense: true, type: "string" })
    );
    onProgress({ percent: 75, message: "RFID-Scans geladen." });

    // 4. Read Barcode-Scan Daten (optional .txt - text)
    results.barcodeData = null;
    if (barcode) {
      onProgress({ percent: 85, message: "Lese Barcode-Scan Daten..." });
      results.barcodeData = await readTextFile(barcode).then((textContent) =>
        read(textContent, { dense: true, type: "string" })
      );
    }

    // 5. Final Comparison
    onProgress({ percent: 95, message: "Vergleiche Daten..." });
    console.log("Starting comparison with results:", results);
    const comparedData = await compareFiles(results);

    // Done
    onProgress({ percent: 100, message: "Fertig." });
    onSuccess(comparedData);
  } catch (err: unknown) {
    console.error("File processing error:", err);
    if (err instanceof Error) {
      onError(err);
    } else {
      onError(new Error("Ein unbekannter Fehler ist aufgetreten."));
    }
  }
}

/**
 * loadComparisonFile is used to load a previously saved comparison file.
 * It checks if the file contains the required sheets and extracts the debitor.
 */
export async function loadComparisonFile(path: string): Promise<{
  masterData: WorkBook;
  debitor: string;
}> {
  try {
    const buffer = await readFile(path);
    const workbook = read(buffer, { dense: true }); // Validation check

    const hasRequiredSheets =
      workbook.SheetNames.includes("Bestandsabgleich Artikelnummer") &&
      workbook.SheetNames.includes("Bestandsabgleich LotId");

    if (!hasRequiredSheets) {
      throw new Error(
        "Ungültige Vergleichsdatei. Erforderliche Sheets fehlen."
      );
    }

    // Get debitor from the Ax-Bestand sheet
    const axBestandSheet = workbook.Sheets["Ax-Bestand"];
    let debitor: string | undefined = undefined;

    if (axBestandSheet) {
      const rows: DataRow[] = utils.sheet_to_json(axBestandSheet);
      debitor = rows?.[0]?.["Debitorenkonto"];
    }

    return {
      masterData: workbook,
      debitor: debitor || "Unbekannt",
    };
  } catch (error) {
    console.error("Fehler beim Laden des Vergleichs:", error);
    throw error;
  }
}
