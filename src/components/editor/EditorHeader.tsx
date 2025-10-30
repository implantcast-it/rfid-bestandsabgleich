import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import PlusOneOutlinedIcon from "@mui/icons-material/PlusOneOutlined";
import { useTheme } from "@/context/ThemeContext";

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
  const { theme, toggleTheme } = useTheme();
  return (
    <header className='flex flex-shrink-0 justify-between items-center gap-4 bg-white dark:bg-gray-900/50 p-4 border-gray-200 dark:border-gray-800 border-b'>
      <p className='font-semibold text-gray-900 dark:text-white text-2xl leading-tight tracking-[-0.015em]'>
        {title}
      </p>
      <div className='flex flex-shrink-0 items-center gap-3'>
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
        {/* --- Theme Switcher Button --- */}
        <button
          onClick={toggleTheme}
          className='flex flex-shrink-0 justify-center items-center bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg w-9 h-9 text-gray-800 dark:text-gray-200 transition-colors cursor-pointer'
          aria-label='Toggle light/dark theme'
        >
          {theme === "light" ? (
            <DarkModeOutlinedIcon fontSize='small' />
          ) : (
            <LightModeOutlinedIcon fontSize='small' />
          )}
        </button>
      </div>
    </header>
  );
}
