import * as Toast from "@radix-ui/react-toast";

import { handleExcelDownload, handlePdfDownload } from "./lib/utils";
import { useEffect, useState } from "react";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DownloadIcon from "@mui/icons-material/Download";
import EditNoteIcon from "@mui/icons-material/EditNote";
import ErrorIcon from "@mui/icons-material/Error";
import ErrorToast from "./components/ui/ErrorToast";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import SuccessToast from "./components/ui/SuccessToast";
import { processFiles } from "./lib/readFiles";
import { useLocation } from "wouter";

// Helper component for the spinning icon
const ProcessingSpinner = () => (
  <svg
    className='w-5 h-5 text-primary animate-spin'
    fill='none'
    viewBox='0 0 24 24'
    xmlns='http://www.w3.org/2000/svg'
  >
    <circle
      className='opacity-25'
      cx='12'
      cy='12'
      r='10'
      stroke='currentColor'
      strokeWidth='4'
    ></circle>
    <path
      className='opacity-75'
      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
      fill='currentColor'
    ></path>
  </svg>
);

/* A screen to show file processing progress. */
export default function ProcessingScreen() {
  const filePaths = history.state || {
    master:
      "C:\\Users\\E.Reindt\\Downloads\\Master Template Inventurprogramm mit GTIN.xlsx",
    erp: "C:\\Users\\E.Reindt\\Downloads\\# 10833 Osnabrück_08.09.2025.xlsx",
    rfid: "C:\\Users\\E.Reindt\\Downloads\\Inventory-10833-Klinik -08-09-2025.txt",
  };
  const [progress, setProgress] = useState({
    percent: 0,
    message: "Initialisiere...",
  });
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [toastInfo, setToastInfo] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    description: string;
  } | null>(null);

  const [, setLocation] = useLocation();

  // Run the processing logic when the component mounts
  useEffect(() => {
    // Reset state in case component is re-used
    setIsComplete(false);
    setError(null);

    processFiles({
      filePaths,
      onProgress: (update) => setProgress(update),
      onSuccess: (results) => {
        setIsComplete(true);
        setResults(results);
      },
      onError: (err) => {
        setError(err.message || "Ein unbekannter Fehler ist aufgetreten.");
        setProgress((p) => ({ ...p, message: "Fehlgeschlagen" }));
      },
    });
  }, []); // Run this effect when the filePaths prop changes

  const buttonsDisabled = !isComplete;

  return (
    <Toast.Provider swipeDirection='right'>
      <div className='flex flex-col justify-center items-center bg-background-light dark:bg-background-dark p-4 min-h-screen font-display text-gray-800 dark:text-gray-200'>
        <div className='bg-white dark:bg-gray-800 shadow-lg p-8 rounded-lg w-full max-w-3xl'>
          {/* Header */}
          <div className='mb-6 text-center'>
            <h1 className='font-bold text-gray-900 dark:text-white text-2xl'>
              {error
                ? "Verarbeitung fehlgeschlagen!"
                : isComplete
                  ? "Verarbeitung abgeschlossen!"
                  : "Deine Daten werden verarbeitet..."}
            </h1>
          </div>

          {/* --- General Progress Bar --- */}
          <div className='space-y-3 mb-8'>
            <div className='flex justify-between items-center'>
              <p
                className={`text-sm font-medium ${error ? "text-red-600" : "text-gray-700 dark:text-gray-300"}`}
              >
                {progress.message}
              </p>
              {/* Show icon based on state */}
              {isComplete ? (
                <CheckCircleIcon
                  className='text-primary'
                  style={{ fontSize: 20 }}
                />
              ) : error ? (
                <ErrorIcon className='text-red-600' style={{ fontSize: 20 }} />
              ) : (
                <ProcessingSpinner />
              )}
            </div>
            <div className='bg-gray-200 dark:bg-gray-700 rounded-full w-full h-2.5'>
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${error ? "bg-red-600" : "bg-primary"}`}
                style={{ width: `${progress.percent}%` }}
              ></div>
            </div>
            {error && (
              <p className='text-red-600 text-sm text-center'>{error}</p>
            )}
          </div>
          {/* --- End General Progress Bar --- */}

          <hr className='my-8 border-gray-200 dark:border-gray-700' />

          {/* --- Section 1: Editor or Error --- */}
          <div className='mb-8'>
            <h2 className='font-semibold text-gray-900 dark:text-white text-lg'>
              {error ? "Fehler beim Verarbeiten" : "Abgleich starten"}
            </h2>
            <p className='mt-1 mb-4 text-gray-600 dark:text-gray-400'>
              {error
                ? "Möglicherweise hast du eine falsche Datei hochgeladen, oder eine deiner Dateien ist fehlerhaft. Starte bitte den Prozess neu."
                : "Öffne den Editor, um die Daten nach der Verarbeitung zu bearbeiten."}
            </p>
            {error ? (
              <a
                href='/'
                className='flex justify-center items-center space-x-2 bg-primary hover:bg-primary/80 disabled:opacity-50 px-4 py-3 rounded-lg w-full text-white transition-colors disabled:cursor-not-allowed'
              >
                <RestartAltOutlinedIcon style={{ fontSize: 20 }} />
                <span>Abgleich neustarten</span>
              </a>
            ) : (
              <button
                disabled={buttonsDisabled}
                onClick={() => {
                  results && setLocation("/editor", { state: results });
                }}
                className='flex justify-center items-center space-x-2 bg-primary hover:bg-primary/80 disabled:opacity-50 px-4 py-3 rounded-lg w-full text-white transition-colors disabled:cursor-not-allowed'
              >
                <EditNoteIcon style={{ fontSize: 20 }} />
                <span>Editor öffnen</span>
              </button>
            )}
          </div>

          {/* --- Section 2: Downloads --- */}
          <div
            className={`bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg ${buttonsDisabled ? "opacity-50" : ""}`}
          >
            <h2 className='font-semibold text-gray-900 dark:text-white text-lg'>
              Downloads
            </h2>
            <p className='mt-1 mb-4 text-gray-600 dark:text-gray-400'>
              Sobald die Verarbeitung abgeschlossen ist, können Sie hier die
              generierten Dateien herunterladen.
            </p>
            <div className='flex sm:flex-row flex-col sm:space-x-4 space-y-3 sm:space-y-0'>
              <button
                onClick={() => handlePdfDownload(results, setToastInfo)}
                disabled={buttonsDisabled}
                className='flex flex-1 justify-center items-center space-x-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-3 rounded-lg text-gray-900 dark:text-gray-300 transition-colors disabled:cursor-not-allowed'
              >
                <DownloadIcon style={{ fontSize: 20 }} />
                <span>PDF herunterladen</span>
              </button>
              <button
                onClick={() => handleExcelDownload(results, setToastInfo)}
                disabled={buttonsDisabled}
                className='flex flex-1 justify-center items-center space-x-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-3 rounded-lg text-gray-900 dark:text-gray-300 transition-colors disabled:cursor-not-allowed'
              >
                <DownloadIcon style={{ fontSize: 20 }} />
                <span>Excel-Vergleich herunterladen</span>
              </button>
            </div>
          </div>
        </div>
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
      <Toast.Viewport className='right-0 bottom-0 z-50 fixed flex flex-col gap-3 m-0 p-6 w-96 max-w-[100vw] list-none' />
      {/* --- End --- */}
    </Toast.Provider>
  );
}
