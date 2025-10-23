// necessary imports for file handling and data manipulation
// xlsx is a library to read and write Excel files
// fs is a library to read files from the file system - necessary because of Tauri's security model
// uuid is a library to generate unique identifiers - IDs - used to allow editing in the editor

import { read, utils, writeFile } from "xlsx";

import { readBinaryFile } from "@tauri-apps/api/fs";
import { v4 as uuidv4 } from "uuid";

// compareFiles is the main function of this file, called in the frontend by passing the file paths of the master file and the scans
// the function reads the files, extracts the data, compares the scans and returns the data in the format of an Excel dataset (workbook)

export async function compareFiles(paths) {
  if (paths.master && paths.erp && paths.rfid) {
    try {
      const [master, erp, rfid, barcode] = await Promise.all([
        // Master
        readBinaryFile(paths.master).then((f) => read(f, { dense: true })),
        // ERP
        readBinaryFile(paths.erp).then((f) =>
          read(f, { dense: true, sheets: 0 })
        ),
        // RFID (required)
        readBinaryFile(paths.rfid).then((f) => read(f, { dense: true })),
        // Barcode (optional)
        paths.barcode
          ? readBinaryFile(paths.barcode).then((f) => read(f, { dense: true }))
          : Promise.resolve(null),
      ]);

      // ----------------- Data Extraction ----------------- //

      const [erpData, debitor] = erpSheet(erp);
      master.Sheets["Ax-Bestand"] = utils.json_to_sheet(erpData);

      let barcodeData = [];
      if (barcode) {
        barcodeData = bSheet(barcode);
        master.Sheets["Barcode-Scan"] = utils.json_to_sheet(barcodeData);
      }

      const rfidDataUnformatted = rfidSheet(rfid);
      const rfidData = removeDuplicatesByLotId(
        formatScanData(master, rfidDataUnformatted)
      );
      master.Sheets["RFID-Scan"] = utils.json_to_sheet(rfidData);

      if (barcodeData.length > 0) {
        master.Sheets["Vergleich der Scans"] = utils.json_to_sheet(
          compScans(barcodeData, rfidData)
        );
      }

      master.Sheets["Bestandsabgleich Artikelnummer"] = utils.json_to_sheet(
        compareArtNr(erpData, rfidData)
      );

      master.Sheets["Bestandsabgleich LotId"] = utils.json_to_sheet(
        compareLotId(erpData, rfidData)
      );

      return { data: { master, debitor } };
    } catch (error) {
      console.error("Error comparing files:", error);
      throw error;
    }
  } else {
    throw new Error("Missing required file(s): master, erp, or rfid.");
  }
}

// loadComparisonFile is used to load a previously saved comparison file
// it checks if the file contains the required sheets and extracts the debitor from the Ax-Bestand sheet
export async function loadComparisonFile(path) {
  try {
    const buffer = await readBinaryFile(path);
    const workbook = read(buffer, { dense: true });

    // Validierungs-Check: Enthält die Datei die richtigen Vergleichs-Sheets?
    const hasRequiredSheets =
      workbook.SheetNames.includes("Bestandsabgleich Artikelnummer") &&
      workbook.SheetNames.includes("Bestandsabgleich LotId");

    if (!hasRequiredSheets) {
      throw new Error(
        "Ungültige Vergleichsdatei. Erforderliche Sheets fehlen."
      );
    }

    // Hole Debitor aus irgendeinem Sheet, z. B. Ax-Bestand
    const axBestandSheet = workbook.Sheets["Ax-Bestand"];
    let debitor = undefined;

    if (axBestandSheet) {
      const rows = utils.sheet_to_json(axBestandSheet);
      debitor = rows?.[0]?.["Debitorenkonto"];
    }

    return {
      master: workbook,
      debitor: debitor || "Unbekannt",
    };
  } catch (error) {
    console.error("Fehler beim Laden des Vergleichs:", error);
    throw error;
  }
}

// ----------------- Helper Functions ----------------- //

// ERP Data
const erpSheet = (erp) => {
  const erpList = erp.Sheets[erp.SheetNames[0]]; // retrives the first sheet of the workbook

  // iterate through the data and replace the w key with the v key -> w value is a string, v values is often a number - string is needed for the frontend
  erpList["!data"].forEach((item) => {
    item.map((obj) => {
      if (obj.w) obj.v = obj.w;
    });
  });

  let data = utils.sheet_to_json(erpList, { header: 0 }); // convert the sheet to a json object

  // Rename "Physischer Bestand" to "Eigenbestand nach ERP"
  data = data.map((item) => {
    if ("Physischer Bestand" in item) {
      item["Eigenbestand nach ERP"] = item["Physischer Bestand"];
      delete item["Physischer Bestand"];
    }
    return item;
  });

  const debitor = data[0]["Debitorenkonto"]; // extract the debitor number from the first row

  return [data, debitor]; // return the data and the debitor number
};

// Barcode Data
const bSheet = (barcode) => {
  const barcodeList = barcode.Sheets[barcode.SheetNames[0]]; // retrieves the first sheet of the barcode workbook

  // extract GTIN, LOT and MHD from the EAN:GTIN+MHD+LOT string
  barcodeList["!data"].forEach((item) => {
    // iterate through the data and replace the w key with the v key
    item.map((obj) => {
      if (obj.w) obj.v = obj.w;
    });
    const obj = item.pop().v;
    if (obj.length === 37) {
      item.push({ w: obj.substring(3, 17), t: "s", v: obj.substring(3, 17) });
      const date = new Date(
        20 + obj.substring(18, 20),
        parseInt(obj.substring(20, 22)) - 1,
        obj.substring(22, 24)
      ).toLocaleDateString();
      item.push({ w: date, t: "s", v: date });
      item.push({
        w: obj.substring(26, obj.length - 1),
        t: "s",
        v: obj.substring(26, obj.length - 1),
      });
    }
  });

  // replace the D in the !ref string with an F to avoid errors in the frontend
  barcodeList["!ref"] = barcodeList["!ref"].replace("D", "F");

  // returns sheets as json object, adds data headers to data
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

// RFID Data
const rfidSheet = (rfid) => {
  let rfidList = rfid.Sheets[rfid.SheetNames[0]]; // retrieves the first sheet of the RFID workbook

  // remove cells wich contain "[" -> [ comes from rfid scanner and is not needed for the comparison
  const removeObjectsWithInvSubstring = (list) => {
    const result = [];
    for (let i = 0; i < list.length; i++) {
      const filteredArr = [];
      for (let j = 0; j < list[i].length; j++) {
        if (list[i][j].w) list[i][j].v = list[i][j].w; // replace the w key with the v key
        if (!list[i][j].v.toString().includes("[")) {
          filteredArr.push(list[i][j]);
        }
      }
      result.push(filteredArr);
    }
    return result;
  };

  rfidList["!data"] = removeObjectsWithInvSubstring(rfidList["!data"]);

  // returns sheets as json object, adds data headers to data
  return utils.sheet_to_json(rfidList, {
    header: ["GTIN", "LotId", "Kennung 1", "Debitorennummer", "Erfasst um"],
  });
};

// Format Scan Data
const formatScanData = (master, rfid) => {
  const gtinList = master.Sheets[master.SheetNames[0]]; // retrieves the first sheet of the master workbook
  const gtins = utils.sheet_to_json(gtinList); // converts the sheet to a json object

  // map GTIN to RFID data -> returns Artikelnummer and Produktname for each GTIN, adds it to the RFID data
  return rfid.map((item) => {
    const gtin = gtins.find((gtin) => gtin.GTIN === item.GTIN);
    if (gtin) {
      item["Artikelnummer"] = gtin["Artikelnummer"];
      item["Produktname"] = gtin["Produktname"];
      item["Kennzeichen 3"] = gtin["Kennzeichen 3"];
    } else {
      item["Artikelnummer"] = "Unbekannt";
      item["Produktname"] = "Unbekannt";
      item["Kennzeichen 3"] = "Unbekannt";
    }
    // removes all invalid characters that may be present in rfid scan data
    // valid characters are: A - Z, a - z, 0 - 9, "/" and "-"
    item["LotId"] = item["LotId"].replace(/[^a-zA-Z0-9-]+/, "");
    return item;
  });
};

// Scan-Abgleich LotId
const compScans = (barcode, rfid) => {
  // map LotId to Barcode data
  const mapbarcode = new Map();
  barcode.forEach((item) => {
    mapbarcode.set(item["LotId"], item);
  });

  // compare the data sets and store the result in a new array (only data that is in the rfid data set)
  const result = rfid.map((item) => {
    const itembarcode = mapbarcode.get(item["LotId"]);
    return {
      LotId: item["LotId"],
      "Barcode-Scan": itembarcode ? 1 : 0,
      "RFID-Scan": 1,
    };
  });

  // add data that is only in the barcode data set to the result array
  barcode.forEach((item) => {
    if (!result.some((compItem) => compItem["LotId"] == item["LotId"])) {
      result.push({
        LotId: item["LotId"],
        "Barcode-Scan": 1,
        "RFID-Scan": 0,
      });
    }
  });

  return result;
};

// Bestandsblgeich ArtNr
const compareArtNr = (erp, rfid) => {
  const counts = {}; // object with Artikelnummer being the key

  // for each item add Artikelnummer to the counts object as the key with a value of the following attributes
  erp.forEach((item) => {
    const key = item["Artikelnummer"];
    if (!counts[key])
      counts[key] = {
        Artikelnummer: key,
        Produktname: item["Produktname"],
        "Eigenbestand nach ERP": 0,
        "RFID-Scan": 0,
        id: uuidv4(), // used to allow editing in the frontend
      };
    counts[key]["Eigenbestand nach ERP"]++; // counter for occurrences of the Artikelnummer
  });

  // same thing, but for the rfid data set
  rfid.forEach((item) => {
    const key = item["Artikelnummer"];
    if (!counts[key])
      counts[key] = {
        Artikelnummer: key,
        Produktname: item["Produktname"],
        "Eigenbestand nach ERP": 0,
        "RFID-Scan": 0,
        id: uuidv4(),
      };
    counts[key]["RFID-Scan"]++;
  });

  const result = Object.values(counts); // store the result in an array

  // calculate the difference between the erp and rfid occurences
  result.forEach((item) => {
    item["Differenz"] = item["Eigenbestand nach ERP"] - item["RFID-Scan"];
  });

  return result;
};

// Bestandsabgleich LotId
const compareLotId = (erp, rfid) => {
  // Create maps for quick lookups of ERP and RFID data
  const maperp = new Map();
  erp.forEach((item) => {
    // Ensure the LotId is a string and handle potential trimming issues
    const lotId = String(item["LotId"]).trim();
    maperp.set(lotId, item);
  });

  const maprfid = new Map();
  rfid.forEach((item) => {
    maprfid.set(item["LotId"], item);
  });

  // Combine all unique Lot IDs from both datasets
  const allLotIds = new Set([...maperp.keys(), ...maprfid.keys()]);
  const lotComparison = [];

  // Iterate over the combined set of Lot IDs to ensure every item is compared
  for (const lotId of allLotIds) {
    const itemErp = maperp.get(lotId);
    const itemRfid = maprfid.get(lotId);

    // Check if the item exists in ERP and/or RFID data
    const existsInErp = !!itemErp;
    const existsInRfid = !!itemRfid;

    // Create a base item with common properties from either source
    const baseItem = existsInErp ? itemErp : itemRfid;

    // Construct the final comparison object for this Lot ID
    const finalItem = {
      // Get the 'Artikelnummer' and 'Produktname' from the base item
      Artikelnummer: baseItem?.["Artikelnummer"] || "Unbekannt",
      Produktname: baseItem?.["Produktname"] || "Unbekannt",
      "Kennzeichen 3": baseItem?.["Kennzeichen 3"] || "Unbekannt",
      LotId: lotId,
      "Eigenbestand nach ERP": existsInErp ? "1" : "0",
      "RFID-Scan": existsInRfid ? "1" : "0",
      Ablaufdatum: itemErp?.["Ablaufdatum"] || "-",
      Kommentar: "",
      Anmerkung: "",
      id: uuidv4(),
    };

    lotComparison.push(finalItem);
  }

  // --- Sorting Logic ---
  // (This part remains the same)

  // Defines the custom order for Kennzeichen 3
  const customOrder = ["IMP", "INST", "SIEB"];

  // Sorts the array by the custom order and then by Artikelnummer
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

    return artA.localeCompare(artB);
  });

  // Assigns new index starting from 1
  sortedData.forEach((item, idx) => {
    item.Index = idx + 1;
  });

  return sortedData;
};

// ----------------- ----------------- //

// ----------------- Download Function ----------------- //

export const downloadFile = (data) => {
  // downloadFile function is used to download the master workbook as an Excel file
  // changes values for the Artikelnummer and LotId comparison sheets to only include the relevant data (removes for example the id)
  const artNr = utils.json_to_sheet(
    utils
      .sheet_to_json(data.Sheets["Bestandsabgleich Artikelnummer"])
      .map((item) => {
        return {
          Artikelnummer: item["Artikelnummer"],
          Produktname: item["Produktname"],
          "Eigenbestand nach ERP": item["Eigenbestand nach ERP"],
          "RFID-Scan": item["RFID-Scan"],
          Differenz: item["Differenz"],
        };
      })
  );
  const lotId = utils.json_to_sheet(
    utils.sheet_to_json(data.Sheets["Bestandsabgleich LotId"]).map((item) => {
      return {
        Index: item["Index"],
        LotId: item["LotId"],
        Artikelnummer: item["Artikelnummer"],
        Produktname: item["Produktname"],
        "Kennzeichen 3": item["Kennzeichen 3"],
        Ablaufdatum: item["Ablaufdatum"],
        "Eigenbestand nach ERP": item["Eigenbestand nach ERP"],
        "RFID-Scan": item["RFID-Scan"],
        Kommentar: item["Kommentar"],
        Anmerkung: item["Anmerkung"],
      };
    })
  );

  const master = structuredClone(data);
  // replace the sheets in the master workbook with the new sheets
  master.Sheets["Bestandsabgleich Artikelnummer"] = artNr;
  master.Sheets["Bestandsabgleich LotId"] = lotId;

  return master;
};

// ----------------- ----------------- //

// ----------------- Remove Duplicates from LotId Function ----------------- //
function removeDuplicatesByLotId(data) {
  const seenLotIds = new Set();
  const result = [];

  for (const item of data) {
    if (!seenLotIds.has(item.LotId)) {
      seenLotIds.add(item.LotId);
      result.push(item);
    }
  }

  return result;
}

// ----------------- ----------------- //
