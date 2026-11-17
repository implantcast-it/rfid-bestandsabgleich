import { useEffect, useId, useRef, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import type { RefObject } from "react"
import { Checkbox } from "@/core/ui/checkbox"
import { Button } from "@/core/ui/button"
import type { ColumnPinningState } from "@tanstack/react-table"
import {
  DEFAULT_PRODUCT_NAME_SIZE,
  PRODUCT_NAME_SIZE_OPTIONS,
} from "@/features/editor/lot-id/product-name-size-options"

export const LOT_ID_DISPLAY_COLUMNS = [
  { id: "LotId", label: "LotID" },
  { id: "Artikelnummer", label: "Artikelnr." },
  { id: "Produktname", label: "Produktname" },
  { id: "Kennzeichen 3", label: "Kennzeichen 3" },
] as const

export const DEFAULT_LOT_ID_PINNED_COLUMNS = ["select", "Index", "LotId"]
const getNearestProductNameSizePreset = (size: number) =>
  PRODUCT_NAME_SIZE_OPTIONS.reduce((nearest, option) =>
    Math.abs(option.size - size) <= Math.abs(nearest.size - size)
      ? option
      : nearest
  ).size

type LotIdTableDisplaySettings = {
  columnPinning: ColumnPinningState
  productNameSize: number
}

type LotIdTableDisplaySettingsDialogProps = LotIdTableDisplaySettings & {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (settings: LotIdTableDisplaySettings) => void
  triggerRef?: RefObject<HTMLButtonElement | null>
}

export const LotIdTableDisplaySettingsDialog = ({
  columnPinning,
  productNameSize,
  open,
  onOpenChange,
  onSave,
  triggerRef,
}: LotIdTableDisplaySettingsDialogProps) => {
  const idPrefix = useId()
  const [draftColumnPinning, setDraftColumnPinning] =
    useState<ColumnPinningState>(columnPinning)
  const [draftProductNameSize, setDraftProductNameSize] =
    useState(productNameSize)
  const wasOpen = useRef(false)
  const pinnedColumns = new Set(draftColumnPinning.start ?? [])

  useEffect(() => {
    if (open && !wasOpen.current) {
      setDraftColumnPinning({
        start: [...(columnPinning.start ?? [])],
        end: [...(columnPinning.end ?? [])],
      })
      setDraftProductNameSize(
        getNearestProductNameSizePreset(productNameSize)
      )
    }
    wasOpen.current = open
  }, [open, columnPinning, productNameSize])

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
  }

  const updatePinnedColumn = (columnId: string, isPinned: boolean) => {
    setDraftColumnPinning((previous) => {
      const nextPinnedColumns = new Set(previous.start ?? [])
      if (isPinned) nextPinnedColumns.add(columnId)
      else nextPinnedColumns.delete(columnId)

      return {
        ...previous,
        start: [
          "select",
          "Index",
          ...LOT_ID_DISPLAY_COLUMNS.map(({ id }) => id).filter((id) =>
            nextPinnedColumns.has(id)
          ),
        ],
      }
    })
  }

  const resetDraft = () => {
    setDraftColumnPinning({
      start: [...DEFAULT_LOT_ID_PINNED_COLUMNS],
      end: [],
    })
    setDraftProductNameSize(DEFAULT_PRODUCT_NAME_SIZE)
  }

  const handleSave = () => {
    onSave({
      columnPinning: draftColumnPinning,
      productNameSize: draftProductNameSize,
    })
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-overlayShow fixed inset-0 z-40 bg-black/60 dark:bg-black/80" />
        <Dialog.Content
          className="bg-card text-card-foreground data-[state=open]:animate-contentShow fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[min(92vw,880px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto border p-6 shadow-lg focus:outline-none"
          aria-describedby={`${idPrefix}-description`}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            triggerRef?.current?.focus()
          }}
        >
          <Dialog.Title className="text-primary m-0 text-lg font-bold">
            Tabelleneinstellungen
          </Dialog.Title>
          <Dialog.Description
            id={`${idPrefix}-description`}
            className="text-muted-foreground mt-2 text-sm leading-normal"
          >
            Lege fest, welche Spalten beim horizontalen Scrollen sichtbar
            bleiben und wie breit der Produktname angezeigt wird.
          </Dialog.Description>

          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <section aria-labelledby={`${idPrefix}-pinned-heading`}>
              <h3
                id={`${idPrefix}-pinned-heading`}
                className="text-sm font-semibold"
              >
                Fixierte Spalten
              </h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Auswahl und Index bleiben immer sichtbar.
              </p>
              <div className="mt-4 grid gap-3">
                {LOT_ID_DISPLAY_COLUMNS.map(({ id, label }) => {
                  const checkboxId = `${idPrefix}-${id}`
                  return (
                    <label
                      key={id}
                      htmlFor={checkboxId}
                      className="flex cursor-pointer items-center gap-2.5 text-sm"
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={pinnedColumns.has(id)}
                        onCheckedChange={(checked) =>
                          updatePinnedColumn(id, checked === true)
                        }
                      />
                      {label}
                    </label>
                  )
                })}
              </div>
            </section>

            <section aria-labelledby={`${idPrefix}-width-heading`}>
              <h3
                id={`${idPrefix}-width-heading`}
                className="text-sm font-semibold"
              >
                Produktname-Spaltenbreite
              </h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Wähle eine der fünf voreingestellten Breiten.
              </p>
              <select
                value={String(draftProductNameSize)}
                onChange={(event) =>
                  setDraftProductNameSize(Number(event.target.value))
                }
                aria-label="Produktname-Spaltenbreite"
                className="border-border bg-background text-foreground mt-4 h-9 w-full rounded-none border px-2 text-sm"
              >
                {PRODUCT_NAME_SIZE_OPTIONS.map(({ label, size }) => (
                  <option key={size} value={String(size)}>
                    {label} ({size} px)
                  </option>
                ))}
              </select>
            </section>
          </div>

          <div className="border-border mt-7 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <Button type="button" variant="ghost" onClick={resetDraft}>
              Standardwerte laden
            </Button>
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  Abbrechen
                </Button>
              </Dialog.Close>
              <Button type="button" onClick={handleSave}>
                Speichern
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
