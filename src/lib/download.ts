import { WorkBook, utils } from "xlsx";

import { DataRow } from "./compare";

/**
 * Prepares the workbook for download by cleaning up comparison sheets.
 * @param data The master workbook
 * @returns A new workbook formatted for download
 */
export const downloadFile = (data: WorkBook): WorkBook => {
  // Create clean sheet for 'Bestandsabgleich Artikelnummer'
  const artNrData = utils
    .sheet_to_json(data.Sheets["Bestandsabgleich Artikelnummer"])
    .map((item: DataRow) => ({
      Artikelnummer: item["Artikelnummer"],
      Produktname: item["Produktname"],
      "Eigenbestand nach ERP": item["Eigenbestand nach ERP"],
      "RFID-Scan": item["RFID-Scan"],
      Differenz: item["Differenz"],
      id: item["id"],
    }));
  const artNrSheet = utils.json_to_sheet(artNrData);

  // Create clean sheet for 'Bestandsabgleich LotId'
  const lotIdData = utils
    .sheet_to_json(data.Sheets["Bestandsabgleich LotId"])
    .map((item: DataRow) => ({
      Index: item["Index"],
      LotId: item["LotId"],
      Artikelnummer: item["Artikelnummer"],
      Produktname: item["Produktname"],
      "Kennzeichen 3": item["Kennzeichen 3"],
      Ablaufdatum: item["Ablaufdatum"],
      "Eigenbestand nach ERP": item["Eigenbestand nach ERP"],
      "RFID-Scan": item["RFID-Scan"],
      "To Do": item["To Do"],
      Anmerkung: item["Anmerkung"],
      id: item["id"],
    }));
  const lotIdSheet = utils.json_to_sheet(lotIdData);

  // Deep clone the workbook to avoid mutating the original
  const master = structuredClone(data);
  master.Sheets["Bestandsabgleich Artikelnummer"] = artNrSheet;
  master.Sheets["Bestandsabgleich LotId"] = lotIdSheet;

  return master;
};
