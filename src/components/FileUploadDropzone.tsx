import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import type { DragEvent } from "react";
import { open } from "@tauri-apps/plugin-dialog";

export default function FileUploadDropzone({
  title,
  fileType,
  description,
  fileKey,
  filePath,
  onFileSelect,
  isWindowDragging,
  isHovered,
}: {
  title: string;
  fileType?: string;
  description: string;
  fileKey: string;
  filePath: string | undefined;
  onFileSelect: (fileKey: string, path: string | null) => void;
  isWindowDragging: boolean;
  isHovered: boolean;
}) {
  // --- Click Handler ---
  const handleUploadClick = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    try {
      let filters: string | any[] | undefined = [];
      if (fileType === ".xlsx") {
        filters = [{ name: "Excel", extensions: ["xlsx", "xls"] }];
      } else if (fileType === ".txt") {
        filters = [{ name: "TXT", extensions: ["txt"] }];
      }
      const selected = await open({
        multiple: false,
        filters: filters.length > 0 ? filters : undefined,
      });
      if (selected && !Array.isArray(selected)) {
        onFileSelect(fileKey, selected);
      }
    } catch (error) {
      console.error("Error opening file dialog:", error);
    }
  };

  // --- Helper to get file name from full path ---
  const getFileName = (path: string | undefined) => {
    if (!path) return null;
    return path.replace(/^.*[\\\/]/, "");
  };

  const fileName = getFileName(filePath);

  // Determine border style based on props from parent
  const borderStyle =
    fileName || isHovered
      ? "border-primary" // File selected OR being hovered
      : isWindowDragging
        ? "border-gray-400 dark:border-gray-500 animate-pulse" // Another dropzone is hovered
        : "border-gray-200 dark:border-gray-600 hover:border-primary"; // Default

  // --- DRAG HANDLERS ---
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className='flex flex-col'>
      <div className={isWindowDragging ? "pointer-events-none" : ""}>
        <div className='flex items-center mb-2'>
          <h2 className='font-semibold text-gray-700 text-md dark:text-white'>
            {title}
          </h2>
          {fileType && (
            <span className='bg-gray-100 dark:bg-gray-700 ml-2 px-2 py-0.5 rounded-full font-medium text-gray-600 dark:text-gray-300 text-xs'>
              {fileType}
            </span>
          )}
        </div>
        <p className='mb-3 text-gray-500 dark:text-gray-400 text-sm'>
          {description}
        </p>
      </div>

      {/* Dropzone Area */}
      <div
        className={`flex-grow flex items-center justify-center border-2 border-dashed rounded-lg w-[420px] h-[140px] text-center group transition-colors cursor-pointer ${borderStyle}`}
        onClick={handleUploadClick}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        data-dropzone-id={fileKey}
      >
        {fileName ? (
          // --- File Selected View ---
          <div className='flex flex-col items-center pointer-events-none'>
            <CheckCircleOutlineIcon className='mb-2 text-primary text-3xl material-icons' />
            <p
              className='font-medium text-gray-900 dark:text-white text-sm'
              title={filePath}
            >
              {fileName}
            </p>
            <button
              className={`mt-1 text-gray-500 text-xs hover:underline ${
                isWindowDragging ? "pointer-events-none" : "pointer-events-auto"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onFileSelect(fileKey, null);
              }}
            >
              Entfernen
            </button>
          </div>
        ) : (
          // --- Default View ---
          <div className='flex flex-col items-center pointer-events-none'>
            <CloudUploadIcon
              className={`material-icons text-3xl mb-2 transition-colors ${
                isHovered
                  ? "text-primary"
                  : isWindowDragging
                    ? "text-gray-500"
                    : "text-gray-400 dark:text-gray-500 group-hover:text-primary"
              }`}
            />
            <p className='text-gray-500 dark:text-gray-400 text-sm'>
              Datei hierher ziehen oder{" "}
              <span
                className={`font-semibold text-primary hover:underline ${
                  isWindowDragging
                    ? "pointer-events-none"
                    : "pointer-events-auto"
                }`}
                onClick={handleUploadClick}
              >
                hochladen
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
