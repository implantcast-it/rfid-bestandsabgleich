import { WorkBook, WorkSheet, utils } from "xlsx";

import type { ProcessingResults } from "./readFiles";
import { v4 as uuidv4 } from "uuid";

// --- Type Definitions for internal data ---

export type DataRow = Record<string, any>; // Defines a generic row object after sheet_to_json

// --- Main Comparison Function ---

/**
 * compareFiles is the main function, called after files are read.
 * It takes the workbook objects, extracts the data, compares the scans,
 * and returns the data in the format of an Excel dataset (workbook).
 */
export async function compareFiles(
  data: ProcessingResults
): Promise<{ masterData: WorkBook | any; debitor: string }> {
  const { masterData, erpData, rfidData, barcodeData } = data;
  try {
    const [erp, debitor] = erpSheet(erpData);
    masterData.Sheets["Ax-Bestand"] = utils.json_to_sheet(erp);

    let barcode: DataRow[] = [];
    if (barcodeData) {
      barcode = bSheet(barcodeData);
      masterData.Sheets["Barcode-Scan"] = utils.json_to_sheet(barcode);
    }

    const rfidDataUnformatted = rfidSheet(rfidData);
    const rfid = removeDuplicatesByLotId(
      formatScanData(masterData, rfidDataUnformatted)
    );
    masterData.Sheets["RFID-Scan"] = utils.json_to_sheet(rfid);

    if (barcode.length > 0) {
      masterData.Sheets["Vergleich der Scans"] = utils.json_to_sheet(
        compScans(barcode, rfid)
      );
    }

    masterData.Sheets["Bestandsabgleich Artikelnummer"] = utils.json_to_sheet(
      compareArtNr(erp, rfid)
    );

    masterData.Sheets["Bestandsabgleich LotId"] = utils.json_to_sheet(
      compareLotId(erp, rfid)
    );

    return { masterData, debitor };
  } catch (error) {
    console.error("Error comparing files:", error);
    throw error;
  }
}

// ----------------- Helper Functions ----------------- //

/**
 * Processes the ERP data workbook.
 * @param erp Workbook object for ERP data
 * @returns A tuple containing the data as JSON and the debitor string
 */
const erpSheet = (erp: WorkBook): [DataRow[], string] => {
  const erpList: WorkSheet = erp.Sheets[erp.SheetNames[0]];

  // Ensure 'v' (value) exists, copying from 'w' (formatted text) if needed
  if (erpList["!data"]) {
    erpList["!data"].forEach((row: any[]) => {
      row.map((cell: any) => {
        if (cell && cell.w) cell.v = cell.w;
      });
    });
  }

  let data: DataRow[] = utils.sheet_to_json(erpList, { header: 0 });

  // Rename "Physischer Bestand" to "Eigenbestand nach ERP"
  data = data.map((item) => {
    if ("Physischer Bestand" in item) {
      item["Eigenbestand nach ERP"] = item["Physischer Bestand"];
      delete item["Physischer Bestand"];
    }
    return item;
  });

  const debitor: string = data[0]?.["Debitorenkonto"] || "Unbekannt";
  return [data, debitor];
};

/**
 * Processes the Barcode data workbook.
 * @param barcode Workbook object for Barcode data
 * @returns Data as JSON
 */
const bSheet = (barcode: WorkBook): DataRow[] => {
  const barcodeList: WorkSheet = barcode.Sheets[barcode.SheetNames[0]];

  // Extract GTIN, LOT, and MHD from the EAN string
  if (barcodeList["!data"]) {
    barcodeList["!data"].forEach((item: any[]) => {
      item.map((obj: any) => {
        if (obj && obj.w) obj.v = obj.w;
      });

      const lastCell = item.pop();
      const obj = lastCell?.v;

      if (typeof obj === "string" && obj.length === 37) {
        item.push({ w: obj.substring(3, 17), t: "s", v: obj.substring(3, 17) }); // GTIN
        const date = new Date(
          2000 + parseInt(obj.substring(18, 20)), // Year
          parseInt(obj.substring(20, 22)) - 1, // Month
          parseInt(obj.substring(22, 24)) // Day
        ).toLocaleDateString();
        item.push({ w: date, t: "s", v: date }); // MHD
        item.push({
          w: obj.substring(26, obj.length - 1), // LotId
          t: "s",
          v: obj.substring(26, obj.length - 1),
        });
      }
    });
  }

  // Update sheet reference range if columns were added
  if (barcodeList["!ref"]) {
    barcodeList["!ref"] = barcodeList["!ref"].replace("D", "F");
  }

  return utils.sheet_to_json(barcodeList, {
    header: [
      "Debitorenkonto",
      "Inventurdatum",
      "Methode",
      "GTIN",
      "MHD",
      "LotId",
    ],
  });
};

/**
 * Processes the RFID data workbook.
 * @param rfid Workbook object for RFID data
 * @returns Data as JSON
 */
const rfidSheet = (rfid: WorkBook): DataRow[] => {
  let rfidList: WorkSheet = rfid.Sheets[rfid.SheetNames[0]];

  // Helper to remove cells containing "["
  const removeObjectsWithInvSubstring = (list: any[][]): any[][] => {
    const result: any[][] = [];
    for (let i = 0; i < list.length; i++) {
      const filteredArr: any[] = [];
      for (let j = 0; j < list[i].length; j++) {
        const cell = list[i][j];
        if (cell) {
          if (cell.w) cell.v = cell.w; // ensure v exists
          if (cell.v && !cell.v.toString().includes("[")) {
            filteredArr.push(cell);
          }
        }
      }
      result.push(filteredArr);
    }
    return result;
  };

  if (rfidList["!data"]) {
    rfidList["!data"] = removeObjectsWithInvSubstring(rfidList["!data"]);
  }

  return utils.sheet_to_json(rfidList, {
    header: ["GTIN", "LotId", "Kennung 1", "Debitorennummer", "Erfasst um"],
  });
};

/**
 * Formats the raw RFID data by mapping it to the master data.
 * @param master Master workbook object
 * @param rfid RFID data as JSON
 * @returns Formatted RFID data
 */
const formatScanData = (master: WorkBook, rfid: DataRow[]): DataRow[] => {
  const gtinList: WorkSheet = master.Sheets[master.SheetNames[0]];
  const gtins: DataRow[] = utils.sheet_to_json(gtinList);

  return rfid.map((item) => {
    const gtin = gtins.find((g) => g.GTIN === item.GTIN);
    if (gtin) {
      item["Artikelnummer"] = gtin["Artikelnummer"];
      item["Produktname"] = gtin["Produktname"];
      item["Kennzeichen 3"] = gtin["Kennzeichen 3"];
    } else {
      item["Artikelnummer"] = "Unbekannt";
      item["Produktname"] = "Unbekannt";
      item["Kennzeichen 3"] = "Unbekannt";
    }
    // Clean LotId: valid characters are A-Z, a-z, 0-9, "/" and "-"
    if (typeof item["LotId"] === "string") {
      item["LotId"] = item["LotId"].replace(/[^a-zA-Z0-9-]+/, "");
    }
    return item;
  });
};

/**
 * Compares Barcode and RFID scans by LotId.
 * @param barcode Barcode data as JSON
 * @param rfid RFID data as JSON
 * @returns Comparison result
 */
const compScans = (barcode: DataRow[], rfid: DataRow[]): DataRow[] => {
  const mapbarcode = new Map<string, DataRow>();
  barcode.forEach((item) => {
    mapbarcode.set(item["LotId"], item);
  });

  const resultMap = new Map<string, DataRow>();

  // Add all RFID items
  rfid.forEach((item) => {
    const itembarcode = mapbarcode.get(item["LotId"]);
    resultMap.set(item["LotId"], {
      LotId: item["LotId"],
      "Barcode-Scan": itembarcode ? 1 : 0,
      "RFID-Scan": 1,
    });
  });

  // Add Barcode items that were not in RFID
  barcode.forEach((item) => {
    if (!resultMap.has(item["LotId"])) {
      resultMap.set(item["LotId"], {
        LotId: item["LotId"],
        "Barcode-Scan": 1,
        "RFID-Scan": 0,
      });
    }
  });

  return Array.from(resultMap.values());
};

/**
 * Compares ERP and RFID data by Artikelnummer.
 * @param erp ERP data as JSON
 * @param rfid RFID data as JSON
 * @returns Comparison result
 */
const compareArtNr = (erp: DataRow[], rfid: DataRow[]): DataRow[] => {
  const counts: Record<string, DataRow> = {};

  // Count items from ERP
  erp.forEach((item) => {
    const key = item["Artikelnummer"];
    if (!counts[key]) {
      counts[key] = {
        Artikelnummer: key,
        Produktname: item["Produktname"],
        "Eigenbestand nach ERP": 0,
        "RFID-Scan": 0,
        id: uuidv4(), // ID for frontend editing
      };
    }
    counts[key]["Eigenbestand nach ERP"]++;
  });

  // Count items from RFID
  rfid.forEach((item) => {
    const key = item["Artikelnummer"];
    if (!counts[key]) {
      counts[key] = {
        Artikelnummer: key,
        Produktname: item["Produktname"],
        "Eigenbestand nach ERP": 0,
        "RFID-Scan": 0,
        id: uuidv4(),
      };
    }
    counts[key]["RFID-Scan"]++;
  });

  const result = Object.values(counts);

  // Calculate difference
  result.forEach((item) => {
    item["Differenz"] = item["Eigenbestand nach ERP"] - item["RFID-Scan"];
  });

  return result;
};

/**
 * Compares ERP and RFID data by LotId.
 * @param erp ERP data as JSON
 * @param rfid RFID data as JSON
 * @returns Comparison result
 */
const compareLotId = (erp: DataRow[], rfid: DataRow[]): DataRow[] => {
  const maperp = new Map<string, DataRow>();
  erp.forEach((item) => {
    const lotId = String(item["LotId"] || "").trim();
    if (lotId) maperp.set(lotId, item);
  });

  const maprfid = new Map<string, DataRow>();
  rfid.forEach((item) => {
    maprfid.set(item["LotId"], item);
  });

  const allLotIds = new Set([...maperp.keys(), ...maprfid.keys()]);
  const lotComparison: DataRow[] = [];

  for (const lotId of allLotIds) {
    const itemErp = maperp.get(lotId);
    const itemRfid = maprfid.get(lotId);

    const existsInErp = !!itemErp;
    const existsInRfid = !!itemRfid;
    const baseItem = itemErp || itemRfid; // Get common data from either source

    const finalItem = {
      Artikelnummer: baseItem?.["Artikelnummer"] || "Unbekannt",
      Produktname: baseItem?.["Produktname"] || "Unbekannt",
      "Kennzeichen 3": baseItem?.["Kennzeichen 3"] || "Unbekannt",
      LotId: lotId,
      "Eigenbestand nach ERP": existsInErp ? "1" : "0",
      "RFID-Scan": existsInRfid ? "1" : "0",
      Ablaufdatum: itemErp?.["Ablaufdatum"] || "-",
      "To Do": "",
      Anmerkung: "",
      id: uuidv4(),
    };
    lotComparison.push(finalItem);
  }

  // --- Sorting Logic ---
  const customOrder = ["IMP", "INST", "SIEB"];
  const sortedData = lotComparison.sort((a, b) => {
    const orderA = customOrder.indexOf(a["Kennzeichen 3"]);
    const orderB = customOrder.indexOf(b["Kennzeichen 3"]);
    const groupA = orderA === -1 ? customOrder.length : orderA;
    const groupB = orderB === -1 ? customOrder.length : orderB;

    if (groupA !== groupB) {
      return groupA - groupB;
    }

    const artA = a["Artikelnummer"];
    const artB = b["Artikelnummer"];
    const numA = Number(artA);
    const numB = Number(artB);

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return String(artA).localeCompare(String(artB));
  });

  // Assign new index starting from 1
  sortedData.forEach((item, idx) => {
    item.Index = idx + 1;
  });

  return sortedData;
};

// ----------------- Remove Duplicates ----------------- //

/**
 * Removes duplicate items from an array based on the 'LotId' property.
 * @param data Array of data rows
 * @returns A new array with duplicates removed
 */
function removeDuplicatesByLotId(data: DataRow[]): DataRow[] {
  const seenLotIds = new Set<string>();
  const result: DataRow[] = [];

  for (const item of data) {
    if (item.LotId && !seenLotIds.has(item.LotId)) {
      seenLotIds.add(item.LotId);
      result.push(item);
    }
  }
  return result;
}
