import { useEffect, useId, useRef, useState } from "react"
import * as Dialog from "@radix-ui/react-alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type RenameInventurDialogProps = {
  open: boolean
  fileTitle: string
  onOpenChange: (open: boolean) => void
  onConfirm: (nextTitle: string) => void
}

const RenameInventurDialog = ({
  open,
  fileTitle,
  onOpenChange,
  onConfirm,
}: RenameInventurDialogProps) => {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [draftTitle, setDraftTitle] = useState(fileTitle)

  useEffect(() => {
    if (!open) return
    setDraftTitle(fileTitle)
  }, [open, fileTitle])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, fileTitle])

  const trimmed = draftTitle.trim()
  const canSave = trimmed.length > 0 && trimmed !== fileTitle.trim()

  const handleSave = () => {
    if (!canSave) return
    onConfirm(trimmed)
    onOpenChange(false)
  }

  const handleDraftChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraftTitle(event.target.value)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      handleSave()
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-overlayShow fixed inset-0 z-40 bg-black/60 dark:bg-black/80" />
        <Dialog.Content
          className="bg-card text-card-foreground data-[state=open]:animate-contentShow fixed top-1/2 left-1/2 z-50 w-[90vw] max-w-[500px] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 p-6 shadow-lg focus:outline-none"
          aria-describedby="rename-inventur-description"
        >
          <Dialog.Title className="font-heading text-primary m-0 text-lg font-bold">
            Inventur umbenennen
          </Dialog.Title>
          <Dialog.Description
            id="rename-inventur-description"
            className="text-muted-foreground mt-3 mb-4 text-sm leading-normal"
          >
            Gib einen eigenen Namen ein, damit du die Inventur leichter wiederfindest.
            Debitor und Ort bleiben unverändert.
          </Dialog.Description>
          <label htmlFor={inputId} className="sr-only">
            Neuer Titel
          </label>
          <Input
            ref={inputRef}
            id={inputId}
            type="text"
            value={draftTitle}
            onChange={handleDraftChange}
            onKeyDown={handleKeyDown}
            className="h-9"
            aria-label="Neuer Inventur-Titel"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="mt-5 flex justify-end gap-3">
            <Dialog.Cancel asChild>
              <Button type="button" variant="secondary">
                Abbrechen
              </Button>
            </Dialog.Cancel>
            <Button
              type="button"
              disabled={!canSave}
              onClick={handleSave}
              aria-label="Neuen Titel speichern"
            >
              Speichern
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default RenameInventurDialog
