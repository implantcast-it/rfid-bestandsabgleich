import EditorHeader from "./EditorHeader.tsx";
import { ReactNode } from "react";

// --- Type Definitions ---
interface EditorPageProps {
  title: string;
  hasHeaderButtons: boolean;
  onAutoCheck?: () => void;
  onAutoFill?: () => void;
  children: ReactNode; // Accept children to render the actual page content
}

// --- Component ---
export default function EditorPage({
  title,
  hasHeaderButtons,
  onAutoCheck,
  onAutoFill,
  children, // Accept children to render the actual page content
}: EditorPageProps) {
  return (
    <>
      <EditorHeader
        title={title}
        showButtons={hasHeaderButtons}
        onAutoCheck={onAutoCheck}
        onAutoFill={onAutoFill}
      />
      {/* Content Area */}
      <div className='flex-1 bg-background-light dark:bg-gray-900 p-4 overflow-auto'>
        {children}
      </div>
    </>
  );
}
