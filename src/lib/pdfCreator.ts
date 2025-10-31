// necessary imports for jsPDF and xlsx

import { WorkSheet, utils } from "xlsx";
import autoTable, { RowInput } from "jspdf-autotable";

import jsPDF from "jspdf";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

let doc = new jsPDF({ orientation: "landscape", compress: true }); // Creates a new jsPDF instance with landscape orientation and A4 format
// function to add the table to the PDF
const addTable = (data: RowInput[]) => {
  // adds the table to the PDF
  autoTable(doc, {
    body: data, // row data
    headStyles: {
      // column styles
      fontSize: 8,
      fontStyle: "bold",
      cellWidth: "wrap",
      fillColor: "#006860",
    },
    bodyStyles: {
      // row styles
      fontSize: 6,
      cellWidth: "wrap",
    },
    columnStyles: {
      // changes wrapping for Produkname column to no-wrap
      Produktname: {
        cellWidth: "auto",
        overflow: "linebreak",
        minCellWidth: 60,
      },
      "To Do": { cellWidth: "auto", overflow: "linebreak", minCellWidth: 40 },
      Anmerkung: { cellWidth: "auto", overflow: "linebreak" },
      "Kennzeichen 3": { cellWidth: "auto" },
      Index: { cellWidth: "auto" },
      LotId: { cellWidth: "auto", minCellWidth: 20 },
      Artikelnummer: { cellWidth: "auto" },
      Ablaufdatum: { cellWidth: "auto" },
      "Eigenbestand nach ERP": { cellWidth: "auto" },
      "RFID-Scan": { cellWidth: "auto" },
    },
    margin: { vertical: 12, horizontal: 8 }, // margin for table
    startY: 50, // starting Y position for the table
    columns: [
      // column definitions
      { dataKey: "Index", header: "Index" },
      { dataKey: "LotId", header: "LotId" },
      { dataKey: "Artikelnummer", header: "Artikelnummer" },
      { dataKey: "Produktname", header: "Produktname" },
      { dataKey: "Kennzeichen 3", header: "Kennzeichen 3" },
      { dataKey: "Ablaufdatum", header: "Ablaufdatum" },
      { header: "Bestand ERP", dataKey: "Eigenbestand nach ERP" },
      { header: "Bestand RFID", dataKey: "RFID-Scan" },
      { dataKey: "To Do", header: "To Do" },
      { dataKey: "Anmerkung", header: "Anmerkung" },
    ],
  });
};

// function to export the PDF
export const exporToPDF = async (data: {
  debitor: any;
  masterData: { Sheets: { [x: string]: WorkSheet } };
}): Promise<{
  success: boolean;
  filePath?: string;
  error?: Error;
  cancelled?: boolean;
}> => {
  try {
    // --- All your PDF generation logic ---
    doc.addImage(icLogo, "PNG", 268, 10, 16, 16, "implantcast", "NONE", 0);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(`Bestandsabgleich ${data.debitor}`, 8, 20);
    doc.line(8, 25, 200, 25);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Datum: " + new Date().toLocaleDateString("de-DE"), 8, 30);
    doc.text("Uhrzeit: " + new Date().toLocaleTimeString("de-DE"), 8, 35);
    doc.text("Außendienstmitarbeiter:", 8, 40);

    type ComparisonRow = RowInput & {
      "Eigenbestand nach ERP": string;
      "RFID-Scan": string;
      "To Do": string;
      "Kennzeichen 3": string;
      Anmerkung: string;
      Index: string;
      LotId: string;
      Artikelnummer: string;
      Ablaufdatum: string;
      Produktname: string;
    };

    const comparisonData = utils.sheet_to_json(
      data.masterData.Sheets["Bestandsabgleich LotId"]
    ) as ComparisonRow[];

    let rfidSum = 0;
    let erpSum = 0;
    comparisonData.forEach((e) => {
      const erpValue = Number(e["Eigenbestand nach ERP"]);
      const rfidValue = Number(e["RFID-Scan"]);
      erpSum += Number.isFinite(erpValue) ? erpValue : 0;
      rfidSum += Number.isFinite(rfidValue) ? rfidValue : 0;
    });

    doc.text(`Anzahl Positionen: ${comparisonData.length}`, 150, 30);
    doc.text(`Gesamtbestand SOLL: ${erpSum}`, 150, 35);
    doc.text(`Gesamtbestand IST: ${rfidSum}`, 150, 40);
    doc.text(`Abweichung: ${rfidSum - erpSum}`, 150, 45);
    doc.text(`Debitorenkonto: ${data.debitor}`, 8, 45);

    addTable(comparisonData);
    doc.addPage();
    doc.addImage(icLogo, "PNG", 268, 10, 16, 16, "implantcast", "NONE", 0);
    doc.setFontSize(18);
    doc.setFont("helvetica", "normal");
    doc.text("Bestätigung", 8, 20);
    doc.line(8, 25, 200, 25);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setDrawColor("#A0A0A0");
    doc.line(8, 36, 36, 36);
    doc.text("Kundennummer", 8, 41);
    doc.line(48, 36, 88, 36);
    doc.text("Ort", 48, 41);
    doc.text(", den", 90, 35);
    doc.line(98, 36, 124, 36);
    doc.text("Datum", 98, 41);
    doc.line(8, 60, 58, 60);
    doc.text("Unterschrift Außendienstmitarbeiter", 8, 65);
    doc.line(80, 60, 130, 60);
    doc.text("Unterschrift Kunde", 80, 65);
    doc.setFont("helvetica", "bold");
    doc.text("implantcast GmbH", 8, 75);
    doc.setFont("helvetica", "normal");
    doc.text("Lüneburger Schanze 26", 8, 80);
    doc.text("D-21614 Buxtehude", 8, 85);

    const pages = doc.getNumberOfPages() - 1;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);

    for (let j = 1; j < pages + 1; j++) {
      let horizontalPos = pageWidth / 2;
      let verticalPos = pageHeight - 8;
      doc.setPage(j);
      doc.setTextColor(124, 124, 124);
      doc.text(`${j} / ${pages}`, horizontalPos, verticalPos, {
        align: "center",
      });
      doc.setTextColor(0, 0, 0);
    }
    // --- End PDF generation logic ---

    // 1. Define the suggested file name
    const suggestedFilename = `[${
      data.debitor
    }] Bestandsabgleich - ${new Date().toLocaleDateString("de-DE")}.pdf`;

    // 2. Open the native "Save As..." dialog
    const filePath = await save({
      title: "Bestandsabgleich speichern",
      defaultPath: suggestedFilename,
      filters: [
        {
          name: "PDF-Dokument",
          extensions: ["pdf"],
        },
      ],
    });

    // 3. Check if the user clicked "Cancel" (filePath will be null)
    if (filePath) {
      // 4. Get the PDF data from jsPDF as a binary array
      const pdfData = doc.output("arraybuffer");

      // 5. Convert ArrayBuffer to Uint8Array and use Tauri's API to write the file
      await writeFile(filePath, new Uint8Array(pdfData));

      // 6. Return success object
      return { success: true, filePath };
    } else {
      // 7. Return cancellation object
      return { success: false, cancelled: true };
    }
  } catch (err) {
    console.error("Error saving PDF:", err);
    // 8. Return error object
    return { success: false, error: err as Error, cancelled: false };
  } finally {
    // 9. Reset the doc instance for the next export
    // This is crucial and must be in 'finally' to prevent state corruption
    doc = new jsPDF({ orientation: "landscape", compress: true });
  }
};

// Base64 image for implantcast logo
const icLogo =
  "data:image/png;base64,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";
