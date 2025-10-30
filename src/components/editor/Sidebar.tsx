import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { ReactElement, useState } from "react";

import GridOnOutlinedIcon from "@mui/icons-material/GridOnOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import RestartDialog from "../ui/RestartDialog";

// --- Type Definitions ---
interface NavItem {
  id: string;
  name: string;
  icon: ReactElement;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  navSections: NavSection[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onDownloadPdf: () => void;
  onDownloadExcel: () => void;
  onRestart: () => void;
}

// --- Component ---
export default function Sidebar({
  navSections,
  activeTab,
  onTabChange,
  onDownloadPdf,
  onDownloadExcel,
  onRestart,
}: SidebarProps) {
  // --- STATE FOR COLLAPSIBLE SIDEBAR ---
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside
      className={`flex flex-col bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 border-r h-full relative transition-all duration-300 ease-in-out ${
        isOpen ? "w-60" : "w-20"
      }`}
    >
      {/* --- SIDEBAR TOGGLE BUTTON --- */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='top-12 -right-4 z-10 absolute bg-white hover:bg-gray-100 shadow-lg p-1.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-gray-300 text-gray-700 transition-colors'
        aria-label={isOpen ? "Sidebar schließen" : "Sidebar öffnen"}
      >
        {isOpen ? (
          <ChevronLeftIcon fontSize='small' className='mb-0.5' />
        ) : (
          <ChevronRightIcon fontSize='small' className='mb-0.5' />
        )}
      </button>

      {/* --- Main Content Container --- */}
      <div
        className={`flex flex-col justify-between h-full overflow-hidden ${
          isOpen ? "p-4" : "p-2 items-center"
        }`}
      >
        <div className='flex flex-col gap-6 w-full'>
          {/* Logo/Title */}
          <div
            className={`flex items-center gap-3 h-10 ${
              isOpen ? "p-2" : "justify-center"
            }`}
          >
            <img
              src={isOpen ? "./ic-logo_rgb.svg" : "./ic-shamrock_rgb.png"}
              alt='Logo'
              className={`transition-all ${
                isOpen ? "" : "w-16 h-16 object-contain mt-4"
              }`}
            />
          </div>

          {/* Navigation */}
          <nav className='flex flex-col gap-4'>
            {navSections.map((section) => (
              <div key={section.title}>
                {/* Hide section title when collapsed */}
                {isOpen && (
                  <h2 className='mb-2 px-3 font-semibold text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider'>
                    {section.title}
                  </h2>
                )}
                <div className='flex flex-col gap-1'>
                  {section.items.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <a
                        key={item.id}
                        href='#'
                        onClick={(e) => {
                          e.preventDefault();
                          onTabChange(item.id);
                        }}
                        // Add tooltip for accessibility when collapsed
                        title={!isOpen ? item.name : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                          isActive
                            ? "bg-primary/20 text-primary dark:text-primary"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        } ${
                          !isOpen && "justify-center" // Center icon when collapsed
                        }`}
                      >
                        {item.icon}
                        {/* Hide text when collapsed */}
                        <p
                          className={`font-medium text-sm leading-normal ${
                            !isOpen && "sr-only"
                          }`}
                        >
                          {item.name}
                        </p>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* --- FOOTER BUTTONS --- */}
        <div className={`flex flex-col gap-2 ${isOpen ? "p-2 w-full" : "p-0"}`}>
          <button
            className='flex justify-center items-center gap-2 bg-primary hover:bg-teal-700 px-2 rounded-lg w-full h-9 overflow-hidden font-medium text-white text-sm text-nowrap leading-normal tracking-[0.015em] transition-colors cursor-pointer'
            onClick={onDownloadPdf}
            title={!isOpen ? "PDF Herunterladen" : undefined}
          >
            <PictureAsPdfOutlinedIcon fontSize='small' />
            <span className={`${!isOpen && "sr-only"}`}>PDF Herunterladen</span>
          </button>
          <button
            className='flex justify-center items-center gap-2 bg-primary hover:bg-teal-700 px-2 rounded-lg w-full h-9 overflow-hidden font-medium text-white text-sm text-nowrap leading-normal tracking-[0.015em] transition-colors cursor-pointer'
            onClick={onDownloadExcel}
            title={!isOpen ? "Excel Herunterladen" : undefined}
          >
            <GridOnOutlinedIcon fontSize='small' />
            <span className={`${!isOpen && "sr-only"}`}>
              Excel Herunterladen
            </span>
          </button>
          <RestartDialog onRestart={onRestart} isCollapsed={!isOpen} />
        </div>
      </div>
    </aside>
  );
}
