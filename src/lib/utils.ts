import { Dispatch, SetStateAction } from "react";
import { WorkBook, write } from "xlsx";

import { downloadFile } from "./download";
import { exporToPDF } from "./pdfCreator";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

// Async handler for Excel download
export const handleExcelDownload = async (
  results: { debitor: any; masterData: WorkBook },
  setToastInfo: Dispatch<
    SetStateAction<{
      open: boolean;
      type: "success" | "error";
      title: string;
      description: string;
    } | null>
  >
) => {
  if (!results) return;

  // 1. Generate suggested filename
  const suggestedFilename = `[${
    results.debitor
  }] Bestandsabgleich ${new Date().toLocaleDateString("de-DE")}.xlsx`;

  try {
    // 2. Open Tauri's native "save" dialog
    const filePath = await save({
      title: "Excel-Vergleich speichern",
      defaultPath: suggestedFilename,
      filters: [
        {
          name: "Excel-Arbeitsmappe",
          extensions: ["xlsx"],
        },
      ],
    });

    // 3. If user cancels, filePath will be null
    if (filePath === null) {
      return; // User canceled
    }

    // 4. Generate the workbook object (from your lib)
    const wb = downloadFile(results.masterData);

    // 5. Generate the binary data (Uint8Array) from the workbook
    const binaryData = write(wb, { bookType: "xlsx", type: "array" });

    // 6. Use Tauri's API to write the binary file to the chosen path
    await writeFile(filePath, binaryData);

    // 7. Show success toast
    setToastInfo({
      open: true,
      type: "success",
      title: "Speichern erfolgreich",
      description: `Datei wurde gespeichert: ${filePath.split(/[\\/]/).pop()}`, // Show only filename
    });
  } catch (err: any) {
    // 8. Show error toast on failure
    console.error("Fehler beim Speichern der Excel-Datei:", err);
    setToastInfo({
      open: true,
      type: "error",
      title: "Speichern fehlgeschlagen",
      description: err.message || "Die Datei konnte nicht geschrieben werden.",
    });
  }
};

// Async handler for PDF download
export const handlePdfDownload = async (
  results: { debitor: any; masterData: WorkBook },
  setToastInfo: Dispatch<
    SetStateAction<{
      open: boolean;
      type: "success" | "error";
      title: string;
      description: string;
    } | null>
  >
) => {
  if (!results) return;

  try {
    // 1. Await the result from the export function
    const result = await exporToPDF(results);

    // 2. Show toast based on the result
    if (result.success) {
      setToastInfo({
        open: true,
        type: "success",
        title: "Speichern erfolgreich",
        description: `Datei wurde gespeichert: ${result.filePath?.split(/[\\/]/).pop()}`,
      });
    } else if (result.error) {
      // This 'else if' handles explicit errors
      setToastInfo({
        open: true,
        type: "error",
        title: "Speichern fehlgeschlagen",
        description:
          result.error.message || "Die PDF-Datei konnte nicht erstellt werden.",
      });
    }
  } catch (err) {
    // 3. Catch any unexpected errors during the process
    console.error("Fehler beim Erstellen der PDF:", err);
    setToastInfo({
      open: true,
      type: "error",
      title: "Speichern fehlgeschlagen",
      description:
        (err as Error).message || "Ein unbekannter Fehler ist aufgetreten.",
    });
  }
};
