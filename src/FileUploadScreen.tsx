import * as Toast from "@radix-ui/react-toast";

import { useEffect, useState } from "react";

import ArrowBackwardsIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import ErrorToast from "./components/ui/ErrorToast";
import FileUploadDropzone from "./components/FileUploadDropzone";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { listen } from "@tauri-apps/api/event";
import { useLocation } from "wouter";
import { useTheme } from "./context/ThemeContext";

interface DragOverEvent {
  payload: {
    position: { x: number; y: number };
  };
}

// Allowed file extensions for each dropzone
const fileTypeRules = {
  master: [".xlsx", ".xls"],
  erp: [".xlsx", ".xls"],
  rfid: [".txt"],
  barcode: [".txt"],
};

/* Main file upload screen. */
export default function FileUploadScreen() {
  const [filePaths, setFilePaths] = useState({
    master: undefined,
    erp: undefined,
    rfid: undefined,
    barcode: undefined,
  });

  if (history.state) {
    Object.assign(filePaths, history.state);
  }

  const [hoveredDropzone, setHoveredDropzone] = useState<string | null>(null);
  const [isDraggingOverWindow, setIsDraggingOverWindow] = useState(false);

  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [toastState, setToastState] = useState({
    open: false,
    title: "",
    description: "",
  });

  // --- Tauri Event Listeners ---
  useEffect(() => {
    const preventDefaults = (e: { preventDefault: () => void }) => {
      e.preventDefault();
    };
    window.addEventListener("dragover", preventDefaults, false);
    window.addEventListener("drop", preventDefaults, false);

    // --- Listen for drag "over" ---
    const unlistenDragOver = listen(
      "tauri://drag-over",
      (event: DragOverEvent) => {
        setIsDraggingOverWindow(true); // Show drag feedback on all dropzones

        // Find the element at the cursor's position
        const dropTarget = document.elementFromPoint(
          event.payload.position.x,
          event.payload.position.y
        );

        // Check if the element or its parent has our 'data-dropzone-id'
        const dropzoneId = dropTarget
          ?.closest("[data-dropzone-id]")
          ?.getAttribute("data-dropzone-id");

        if (dropzoneId) {
          setHoveredDropzone(dropzoneId);
        } else {
          setHoveredDropzone(null);
        }
      }
    );

    // --- Listen for drag "drop" ---
    const unlistenDrop = listen(
      "tauri://drag-drop",
      (event: { payload: { paths?: string[] } }) => {
        const { payload } = event;
        const fileKey = hoveredDropzone;

        if (
          fileKey &&
          payload &&
          Array.isArray(payload.paths) &&
          payload.paths.length > 0
        ) {
          const path = payload.paths[0];
          // Get the file's extension, e.g., ".txt"
          const extension = path.substring(path.lastIndexOf(".")).toLowerCase();

          // Get the allowed extensions for this specific dropzone
          const allowedExtensions =
            fileTypeRules[fileKey as keyof typeof fileTypeRules];

          // --- VALIDATION LOGIC ---
          if (allowedExtensions.includes(extension)) {
            // SUCCESS: File type matches the dropzone
            handleFileSelected(fileKey, path);
          } else {
            // FAILURE: File type mismatch
            const fileName = path
              .substring(path.lastIndexOf("/") + 1)
              .substring(path.lastIndexOf("\\") + 1);
            setToastState({
              open: true,
              title: "Ungültiger Dateityp",
              description: `Datei "${fileName}" nicht erlaubt. Erwartet: ${allowedExtensions.join(" oder ")}`,
            });
          }
        }
        setHoveredDropzone(null);
        setIsDraggingOverWindow(false);
      }
    );

    // --- Listen for drag "leave" ---
    const unlistenLeave = listen("tauri://drag-leave", () => {
      setHoveredDropzone(null);
      setIsDraggingOverWindow(false);
    });

    return () => {
      window.removeEventListener("dragover", preventDefaults, false);
      window.removeEventListener("drop", preventDefaults, false);
      unlistenDragOver.then((f) => f());
      unlistenDrop.then((f) => f());
      unlistenLeave.then((f) => f());
    };
  }, [hoveredDropzone]);

  const handleFileSelected = (fileKey: string, path: string | null) => {
    setFilePaths((prevPaths) => ({
      ...prevPaths,
      [fileKey]: path,
    }));
  };

  const handleUploadAllClick = () => {
    console.log("Uploading all files:", filePaths);
    setLocation("/processing", { state: filePaths });
  };

  const requiredFilesSet = filePaths.master && filePaths.erp && filePaths.rfid;

  return (
    <Toast.Provider swipeDirection='right'>
      <div className='flex justify-center items-center bg-background-light dark:bg-background-dark p-12 min-h-screen max-h-screen font-display text-gray-800 dark:text-gray-200'>
        <div className='bg-white dark:bg-gray-800 shadow-sm px-12 py-11 rounded-xl'>
          <div className='flex flex-col h-full'>
            {/* Header */}
            <div className='mb-6 text-left'>
              <h1 className='font-bold text-gray-900 dark:text-white text-2xl'>
                Dateien hochladen
              </h1>
            </div>

            {/* Grid of Dropzones */}
            <div className='flex-grow gap-x-8 gap-y-6 grid grid-cols-2'>
              <FileUploadDropzone
                title='Inventur-Master'
                fileType='.xlsx'
                description='Lade die Master-Inventurliste hoch, die alle GTINs enthält.'
                fileKey='master'
                filePath={filePaths.master}
                onFileSelect={handleFileSelected}
                isWindowDragging={isDraggingOverWindow}
                isHovered={hoveredDropzone === "master"}
              />
              <FileUploadDropzone
                title='ERP-Daten'
                fileType='.xlsx'
                description='Lade die ERP-Exportdatei hoch, die die Bestandsdaten enthält.'
                fileKey='erp'
                filePath={filePaths.erp}
                onFileSelect={handleFileSelected}
                isWindowDragging={isDraggingOverWindow}
                isHovered={hoveredDropzone === "erp"}
              />
              <FileUploadDropzone
                title='RFID-Scan Daten'
                fileType='.txt'
                description='Lade den RFID-Scan hoch, der die gescannten Produkte enthält.'
                fileKey='rfid'
                filePath={filePaths.rfid}
                onFileSelect={handleFileSelected}
                isWindowDragging={isDraggingOverWindow}
                isHovered={hoveredDropzone === "rfid"}
              />
              <FileUploadDropzone
                title='Barcode-Scan Daten (optional)'
                fileType='.txt'
                description='Lade den Barcode-Scan hoch, der die gescannten Produkte enthält.'
                fileKey='barcode'
                filePath={filePaths.barcode}
                onFileSelect={handleFileSelected}
                isWindowDragging={isDraggingOverWindow}
                isHovered={hoveredDropzone === "barcode"}
              />
            </div>

            {/* Footer Button */}
            <div className='flex justify-between mt-8'>
              <a
                href='/'
                className='flex items-center space-x-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-5 py-2 rounded-lg font-semibold text-gray-800 dark:text-gray-300 transition-colors'
              >
                <ArrowBackwardsIcon />
                <span>Zurück</span>
              </a>
              <button
                onClick={handleUploadAllClick}
                disabled={!requiredFilesSet}
                className='flex items-center space-x-2 bg-primary hover:bg-primary/80 disabled:opacity-50 px-5 py-2 rounded-lg font-semibold text-white transition-colors disabled:cursor-not-allowed'
              >
                <span>Daten verarbeiten</span>
                <ArrowForwardIcon />
              </button>
            </div>
          </div>
        </div>
        {/* --- Theme Switcher Button --- */}
        <button
          onClick={toggleTheme}
          className='right-6 bottom-6 z-50 fixed flex justify-center items-center bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 shadow-md border-2 border-gray-200 dark:border-gray-700 rounded-full w-10 h-10 text-gray-800 dark:text-gray-200 transition-colors cursor-pointer'
          aria-label='Toggle light/dark theme'
        >
          {theme === "light" ? (
            <DarkModeOutlinedIcon fontSize='small' />
          ) : (
            <LightModeOutlinedIcon fontSize='small' />
          )}
        </button>
      </div>

      {/* Render the Toast and its Viewport */}
      {/* The Viewport is the area on screen where toasts will appear */}
      <ErrorToast
        open={toastState.open}
        onOpenChange={(isOpen: any) =>
          setToastState((s) => ({ ...s, open: isOpen }))
        }
        title={toastState.title}
        description={toastState.description}
      />
      <Toast.Viewport className='right-0 bottom-0 z-[2147483647] fixed flex flex-col gap-[10px] m-0 p-[var(--viewport-padding)] outline-none w-[390px] max-w-[100vw] list-none [--viewport-padding:_25px]' />
    </Toast.Provider>
  );
}
