import { ReactNode } from "react"
import EditorSheetHead from "./EditorSheetHead"

interface EditorPageProps {
  title: string
  hasHeaderButtons: boolean
  completedStichproben?: number
  requiredStichproben?: number
  onAutoCheck?: () => void
  onAutoFill?: () => void
  isBulkEditOpen?: boolean
  onBulkEditToggle?: () => void
  children: ReactNode
  miniStats?: ReactNode
}

const EditorPage = ({
  title,
  hasHeaderButtons,
  completedStichproben,
  requiredStichproben,
  onAutoCheck,
  onAutoFill,
  isBulkEditOpen,
  onBulkEditToggle,
  children,
  miniStats,
}: EditorPageProps) => {
  return (
    <div className="bg-background flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-auto p-4">
      {miniStats}
      <section
        className="bg-card border-border flex min-h-0 flex-1 flex-col overflow-hidden border"
        aria-label={title}
      >
        <EditorSheetHead
          title={title}
          showTools={hasHeaderButtons}
          completedStichproben={completedStichproben}
          requiredStichproben={requiredStichproben}
          onAutoCheck={onAutoCheck}
          onAutoFill={onAutoFill}
          isBulkEditOpen={isBulkEditOpen}
          onBulkEditToggle={onBulkEditToggle}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </section>
    </div>
  )
}

export default EditorPage
