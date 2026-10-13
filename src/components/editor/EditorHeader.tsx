import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import PlusOneOutlinedIcon from "@mui/icons-material/PlusOneOutlined";
import { useTheme } from "@/context/ThemeContext";

// --- Component Props ---
interface EditorHeaderProps {
  title: string;
  showButtons?: boolean;
  completedStichproben?: number;
  requiredStichproben?: number;
  onAutoCheck?: () => void;
  onAutoFill?: () => void;
}

// --- Component ---
export default function EditorHeader({
  title,
  showButtons,
  completedStichproben,
  requiredStichproben,
  onAutoCheck,
  onAutoFill,
}: EditorHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const isStichprobenComplete =
    typeof requiredStichproben === "number" &&
    typeof completedStichproben === "number" &&
    (requiredStichproben === 0 || completedStichproben >= requiredStichproben);

  return (
    <header className='flex flex-shrink-0 justify-between items-center gap-4 bg-white dark:bg-neutral-900/70 p-4 border-gray-200 dark:border-neutral-800 border-b'>
      <div className='flex flex-wrap items-center gap-3'>
        <p className='font-semibold text-gray-900 dark:text-white text-2xl leading-tight tracking-[-0.015em]'>
          {title}
        </p>
        {typeof completedStichproben === "number" &&
          typeof requiredStichproben === "number" && (
            <div
              className={`flex items-center rounded-full border px-3 py-1 text-sm font-medium ${
                isStichprobenComplete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : completedStichproben === 0
                    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800/70 dark:bg-red-900/30 dark:text-red-300"
                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-900/30 dark:text-amber-300"
              }`}
            >
              <span>
                {completedStichproben} / {requiredStichproben} Stichproben
              </span>
            </div>
          )}
      </div>
      <div className='flex flex-shrink-0 items-center gap-3'>
        {showButtons && (
          <div className='flex flex-shrink-0 items-center gap-3'>
            <button
              onClick={onAutoCheck}
              className='flex justify-center items-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 px-4 rounded-lg h-9 overflow-hidden font-medium text-gray-800 dark:text-neutral-200 text-sm leading-normal tracking-[0.015em] transition-colors cursor-pointer'
            >
              <PlusOneOutlinedIcon />
              <span className='truncate'>Auto SIEB/INST</span>
            </button>
            <button
              onClick={onAutoFill}
              className='flex justify-center items-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 px-4 rounded-lg h-9 overflow-hidden font-medium text-gray-800 dark:text-neutral-200 text-sm leading-normal tracking-[0.015em] transition-colors cursor-pointer'
            >
              <AutoFixHighOutlinedIcon />
              <span className='truncate'>Auto-Kommentare</span>
            </button>
          </div>
        )}
        {/* --- Theme Switcher Button --- */}
        <button
          onClick={toggleTheme}
          className='flex flex-shrink-0 justify-center items-center bg-gray-200 hover:bg-gray-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 rounded-lg w-9 h-9 text-gray-800 dark:text-neutral-200 transition-colors cursor-pointer'
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
