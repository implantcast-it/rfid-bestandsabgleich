import EditorHeader from "./EditorHeader.tsx";
import { ReactNode } from "react";

// --- Type Definitions ---
interface EditorPageProps {
  title: string;
  hasHeaderButtons: boolean;
  completedStichproben?: number;
  requiredStichproben?: number;
  onAutoCheck?: () => void;
  onAutoFill?: () => void;
  children: ReactNode; // Accept children to render the actual page content
}

// --- Component ---
export default function EditorPage({
  title,
  hasHeaderButtons,
  completedStichproben,
  requiredStichproben,
  onAutoCheck,
  onAutoFill,
  children, // Accept children to render the actual page content
}: EditorPageProps) {
  return (
    <>
      <EditorHeader
        title={title}
        showButtons={hasHeaderButtons}
        completedStichproben={completedStichproben}
        requiredStichproben={requiredStichproben}
        onAutoCheck={onAutoCheck}
        onAutoFill={onAutoFill}
      />
      {/* Content Area */}
      <div className='flex-1 bg-slate-100 dark:bg-neutral-950 p-4 overflow-auto'>
        {children}
      </div>
    </>
  );
}
