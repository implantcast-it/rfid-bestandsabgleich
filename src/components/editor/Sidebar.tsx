import GridOnOutlinedIcon from "@mui/icons-material/GridOnOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { ReactElement } from "react";
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
  return (
    <aside className='flex flex-col bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 border-r w-60 h-full'>
      <div className='flex flex-col justify-between p-4 h-full'>
        <div className='flex flex-col gap-6'>
          {/* Logo/Title */}
          <div className='flex items-center gap-3 p-2 h-10'>
            <img src='./ic-logo.png' alt='Logo' />
          </div>
          {/* Navigation */}
          <nav className='flex flex-col gap-4'>
            {navSections.map((section) => (
              <div key={section.title}>
                <h2 className='mb-2 px-3 font-semibold text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider'>
                  {section.title}
                </h2>
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
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                          isActive
                            ? "bg-primary/20 text-primary dark:text-primary"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {item.icon}
                        <p className='font-medium text-sm leading-normal'>
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
        <div className='flex flex-col gap-2 p-2'>
          <button
            className='flex justify-center items-center gap-2 bg-primary hover:bg-teal-700 px-2 rounded-lg w-full h-9 overflow-hidden font-medium text-white text-sm leading-normal tracking-[0.015em] transition-colors cursor-pointer'
            onClick={onDownloadPdf}
          >
            <PictureAsPdfOutlinedIcon fontSize='small' />
            <span>PDF Herunterladen</span>
          </button>
          <button
            className='flex justify-center items-center gap-2 bg-primary hover:bg-teal-700 px-2 rounded-lg w-full h-9 overflow-hidden font-medium text-white text-sm leading-normal tracking-[0.015em] transition-colors cursor-pointer'
            onClick={onDownloadExcel}
          >
            <GridOnOutlinedIcon fontSize='small' />
            <span>Excel Herunterladen</span>
          </button>
          <RestartDialog onRestart={onRestart} />
        </div>
      </div>
    </aside>
  );
}
