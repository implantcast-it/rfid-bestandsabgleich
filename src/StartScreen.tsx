import * as Toast from "@radix-ui/react-toast";

import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BarChartIcon from "@mui/icons-material/BarChart";
import ErrorToast from "./components/ui/ErrorToast";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import InsightsIcon from "@mui/icons-material/Insights";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import SuccessToast from "./components/ui/SuccessToast";
import SyncIcon from "@mui/icons-material/Sync";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { handleExistingFileOpen } from "./lib/utils";
import { useLocation } from "wouter";
import { useState } from "react";

/* Start Screen for the Application */
export default function StartScreen() {
  const [toastInfo, setToastInfo] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    description: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  return (
    <Toast.Provider swipeDirection='right'>
      <div className='flex justify-center items-center bg-background-light dark:bg-background-dark p-12 min-h-screen font-display text-gray-800 dark:text-gray-200'>
        {/* Main Content Card */}
        <div className='bg-white dark:bg-gray-800 shadow-sm px-20 py-12 rounded-xl'>
          <div className='flex flex-col justify-center items-center h-full text-center'>
            {/* Icon from HTML */}
            <div className='mb-6'>
              <span className='text-primary text-6xl material-icons'>
                <InsightsIcon fontSize='inherit' />
              </span>
            </div>

            {/* Title */}
            <h1 className='mb-4 font-bold text-gray-900 dark:text-white text-3xl'>
              Willkommen beim RFID-Bestandsabgleich
            </h1>

            {/* Description */}
            <p className='mb-8 max-w-2xl text-gray-500 dark:text-gray-400 text-lg'>
              Optimierte Kundeninventur mit der Hilfe von RFID. Lade deinen
              RFID-Scan mit den ERP-Daten hoch, um sofortige Einblicke in deinen
              Bestand zu erhalten.
            </p>

            {/* Steps */}
            <div className='mb-10 w-full max-w-3xl'>
              <div className='relative flex justify-between items-start'>
                {/* Connecting Lines */}
                <div className='top-6 right-0 left-0 z-0 absolute bg-gray-200 dark:bg-gray-700 h-1'>
                  <div className='top-0 left-0 z-0 absolute bg-primary w-1/3 h-1'></div>
                </div>
                {/* Step 1: Active */}
                <div className='z-10 flex flex-col items-center w-1/3'>
                  <div className='flex justify-center items-center bg-primary mb-2 rounded-full w-12 h-12 text-white'>
                    <FileUploadIcon />
                  </div>
                  <p className='font-semibold text-gray-700 dark:text-white text-sm'>
                    1. Dateien hochladen
                  </p>
                </div>

                {/* Step 2: Inactive */}
                <div className='z-10 flex flex-col items-center w-1/3'>
                  <div className='flex justify-center items-center bg-gray-200 dark:bg-gray-700 mb-2 rounded-full w-12 h-12 text-gray-500 dark:text-gray-300'>
                    <SyncIcon />
                  </div>
                  <p className='font-semibold text-gray-600 dark:text-gray-300 text-sm'>
                    2. Daten verarbeiten
                  </p>
                </div>

                {/* Step 3: Inactive */}
                <div className='z-10 flex flex-col items-center w-1/3'>
                  <div className='flex justify-center items-center bg-gray-200 dark:bg-gray-700 mb-2 rounded-full w-12 h-12 text-gray-500 dark:text-gray-300'>
                    <BarChartIcon />
                  </div>
                  <p className='font-semibold text-gray-600 dark:text-gray-300 text-sm'>
                    3. Einblicke erhalten
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className='flex gap-4'>
              <a
                href='upload'
                className='flex items-center space-x-2 bg-primary hover:bg-teal-700 px-5 py-3 rounded-lg font-semibold text-white transition-colors cursor-pointer'
              >
                <span>Dateien hochladen</span>
                <ArrowForwardIcon />
              </a>
              <button
                onClick={() => {
                  setLoading(true);
                  handleExistingFileOpen(setToastInfo, setLocation).finally(
                    () => setLoading(false)
                  );
                }}
                disabled={loading}
                className='flex items-center space-x-2 bg-gray-200 hover:bg-gray-300 px-5 py-3 rounded-lg font-semibold text-gray-800 transition-colors'
              >
                <span>Abgleich einlesen</span>
                {loading ? (
                  <RotateRightIcon className='animate-spin ease-out' />
                ) : (
                  <UploadFileIcon />
                )}
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
