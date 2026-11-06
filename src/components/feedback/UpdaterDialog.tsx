import * as Dialog from "@radix-ui/react-dialog";

import { Update, check } from "@tauri-apps/plugin-updater";
import { useEffect, useState } from "react";

import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import UpdateIcon from "@mui/icons-material/Update";
import { relaunch } from "@tauri-apps/plugin-process";

export function UpdaterDialog() {
  const [updateInfo, setUpdateInfo] = useState<Update | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");

  useEffect(() => {
    // Check for updates on component mount
    const checkTimer = setTimeout(() => {
      checkForUpdates();
    }, 1500); // 1.5-second delay to let the app window render first

    return () => clearTimeout(checkTimer);
  }, []);

  const checkForUpdates = async () => {
    try {
      const update = await check();
      if (update) {
        console.log(
          `Found update ${update.version} from ${update.date} with notes ${update.body}`
        );
        setUpdateInfo(update);
        setIsDialogOpen(true);
      } else {
        console.log("No update found.");
      }
    } catch (e) {
      console.error("Failed to check for updates:", e);
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateInfo) return;

    setIsDownloading(true);
    setDownloadProgress("Herunterladen...");

    let downloaded = 0;
    let contentLength = 0;

    try {
      await updateInfo.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength || 0;
            setDownloadProgress("Herunterladen... (0%)");
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            const percent = Math.round((downloaded / contentLength) * 100);
            setDownloadProgress(`Herunterladen... (${percent}%)`);
            break;
          case "Finished":
            setDownloadProgress("Download abgeschlossen. Installation...");
            break;
        }
      });

      console.log("Update installed, relaunching...");
      await relaunch();
    } catch (e: unknown) {
      console.error("Update installation failed:", e);
      setIsDownloading(false);
      setDownloadProgress(
        `Fehler: ${e instanceof Error ? e.message : "Update fehlgeschlagen"}`
      );
    }
  };

  return (
    <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className='z-40 fixed inset-0 bg-black/60 dark:bg-black/80 data-[state=open]:animate-overlayShow' />
        <Dialog.Content className='top-1/2 left-1/2 z-50 fixed bg-gray-50 dark:bg-gray-900 shadow-[var(--shadow-6)] p-[25px] rounded-md focus:outline-none w-[90vw] max-w-[500px] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 data-[state=open]:animate-contentShow'>
          <div className='flex items-center gap-2'>
            <UpdateIcon className='text-primary dark:text-gray-200' />
            <Dialog.Title className='m-0 font-bold text-primary dark:text-gray-200 text-lg'>
              Update verfügbar
            </Dialog.Title>
          </div>

          {updateInfo && (
            <Dialog.Description className='mt-3 mb-5 dark:text-gray-400 text-sm leading-normal'>
              Eine neue Version (
              <strong className='font-medium text-primary dark:text-gray-200'>
                {updateInfo.version}
              </strong>
              ) ist verfügbar. Du bist auf der Version{" "}
              <strong className='font-medium text-primary dark:text-gray-200'>
                {updateInfo.currentVersion}
              </strong>
              .
            </Dialog.Description>
          )}

          {/* Progress Indicator */}
          {isDownloading && (
            <div className='flex items-center gap-2 mt-4 text-primary text-sm'>
              <DownloadIcon className='w-4 h-4 animate-pulse' />
              <span>{downloadProgress}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className='flex justify-end gap-3 mt-6'>
            <Dialog.Close asChild>
              <button
                className='inline-flex justify-center items-center bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-[15px] rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-gray-800 outline-offset-1 h-[35px] font-medium dark:text-gray-300 leading-none select-none'
                disabled={isDownloading}
              >
                Später
              </button>
            </Dialog.Close>
            <button
              className='inline-flex justify-center items-center bg-primary hover:bg-primary/80 px-[15px] rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-gray-800 outline-offset-1 h-[35px] font-medium text-white leading-none select-none'
              onClick={handleInstallUpdate}
              disabled={isDownloading}
            >
              {isDownloading ? (
                "Installieren..."
              ) : (
                <>
                  <DownloadIcon className='w-4 h-4' />
                  Installieren und neu starten
                </>
              )}
            </button>
          </div>

          {/* Close 'X' Button */}
          <Dialog.Close
            className='top-4 right-4 absolute opacity-70 hover:opacity-100 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary text-gray-500 transition-opacity disabled:pointer-events-none'
            disabled={isDownloading}
          >
            <CloseIcon className='w-5 h-5' />
            <span className='sr-only'>Schließen</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
