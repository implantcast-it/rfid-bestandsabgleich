import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import PlusOneOutlinedIcon from "@mui/icons-material/PlusOneOutlined";

// --- Component Props ---
interface EditorHeaderProps {
  title: string;
  showButtons?: boolean;
  onAutoCheck?: () => void;
  onAutoFill?: () => void;
}

// --- Component ---
export default function EditorHeader({
  title,
  showButtons,
  onAutoCheck,
  onAutoFill,
}: EditorHeaderProps) {
  return (
    <header className='flex flex-shrink-0 justify-between items-center gap-4 bg-white dark:bg-gray-900/50 p-4 border-gray-200 dark:border-gray-800 border-b'>
      <p className='font-semibold text-gray-900 dark:text-white text-2xl leading-tight tracking-[-0.015em]'>
        {title}
      </p>
      {showButtons && (
        <div className='flex flex-shrink-0 items-center gap-3'>
          <button
            onClick={onAutoCheck}
            className='flex justify-center items-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 rounded-lg h-9 overflow-hidden font-medium text-gray-800 dark:text-gray-200 text-sm leading-normal tracking-[0.015em] transition-colors cursor-pointer'
          >
            <PlusOneOutlinedIcon />
            <span className='truncate'>Auto-Siebe & Offene Posten</span>
          </button>
          <button
            onClick={onAutoFill}
            className='flex justify-center items-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 rounded-lg h-9 overflow-hidden font-medium text-gray-800 dark:text-gray-200 text-sm leading-normal tracking-[0.015em] transition-colors cursor-pointer'
          >
            <AutoFixHighOutlinedIcon />
            <span className='truncate'>Auto-Kommentare</span>
          </button>
        </div>
      )}
    </header>
  );
}
