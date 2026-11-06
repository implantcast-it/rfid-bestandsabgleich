import * as Dialog from "@radix-ui/react-alert-dialog"
import { Button } from "@/components/ui/button"

type DeleteInventurDialogProps = {
  open: boolean
  fileTitle: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

const DeleteInventurDialog = ({
  open,
  fileTitle,
  onOpenChange,
  onConfirm,
}: DeleteInventurDialogProps) => {
  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-overlayShow fixed inset-0 z-40 bg-black/60 dark:bg-black/80" />
        <Dialog.Content
          className="bg-card text-card-foreground data-[state=open]:animate-contentShow fixed top-1/2 left-1/2 z-50 w-[90vw] max-w-[500px] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 p-6 shadow-lg focus:outline-none"
          aria-describedby="delete-inventur-description"
        >
          <Dialog.Title className="font-heading text-primary m-0 text-lg font-bold">
            Inventur löschen?
          </Dialog.Title>
          <Dialog.Description
            id="delete-inventur-description"
            className="text-muted-foreground mt-3 mb-5 text-sm leading-normal"
          >
            „{fileTitle}“ wird unwiderruflich gelöscht. Diese Aktion kann nicht
            rückgängig gemacht werden.
          </Dialog.Description>
          <div className="flex justify-end gap-3">
            <Dialog.Cancel asChild>
              <Button type="button" variant="secondary">
                Abbrechen
              </Button>
            </Dialog.Cancel>
            <Dialog.Action asChild>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirm}
              >
                Ja, löschen
              </Button>
            </Dialog.Action>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default DeleteInventurDialog
