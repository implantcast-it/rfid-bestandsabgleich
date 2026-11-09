import { useCallback, useState } from "react"
import type { RowSelectionState } from "@tanstack/react-table"
import { toast } from "sonner"
import type { LotIdGridRow } from "@/domains/inventur"
import {
  BULK_ANMERKUNG_OPTIONS,
  BULK_RFID_OPTIONS,
  BULK_TODO_OPTIONS,
} from "@/features/editor/lot-id/lot-id-options"

type BulkEditableField = "RFID-Scan" | "To Do" | "Anmerkung"

type UseLotIdBulkEditArgs = {
  onChange: (
    data: LotIdGridRow[] | ((prev: LotIdGridRow[]) => LotIdGridRow[])
  ) => void
  rowSelection: RowSelectionState
  setRowSelection: (selection: RowSelectionState) => void
}

export const useLotIdBulkEdit = ({
  onChange,
  rowSelection,
  setRowSelection,
}: UseLotIdBulkEditArgs) => {
  const [bulkToDo, setBulkToDo] = useState("")
  const [bulkAnmerkung, setBulkAnmerkung] = useState("")
  const [bulkRfidScan, setBulkRfidScan] = useState("")

  const selectedCount = Object.keys(rowSelection).filter(
    (key) => rowSelection[key]
  ).length

  const applyBulkField = useCallback(
    (
      field: BulkEditableField,
      value: string,
      options?: { requireValue?: boolean; valueLabel?: string }
    ) => {
      const selectedIds = new Set(
        Object.keys(rowSelection).filter((key) => rowSelection[key])
      )

      if (selectedIds.size === 0) {
        toast.error("Keine Zeilen ausgewählt", {
          description: "Bitte wählen Sie Zeilen aus, die Sie ändern möchten.",
        })
        return
      }

      if (options?.requireValue && value === "") {
        toast.error("Kein Wert ausgewählt", {
          description: `Bitte wählen Sie einen '${options.valueLabel ?? field}' Wert aus.`,
        })
        return
      }

      onChange((prevData) =>
        prevData.map((row) => {
          if (!selectedIds.has(row.id)) return row
          return { ...row, [field]: value, isEdited: true }
        })
      )

      toast.success(`'${field}' aktualisiert`, {
        description:
          field === "RFID-Scan"
            ? `${selectedIds.size} Zeile(n) wurden auf '${value}' gesetzt.`
            : `${selectedIds.size} Zeile(n) wurden aktualisiert.`,
      })

      setRowSelection({})
    },
    [onChange, rowSelection, setRowSelection]
  )

  const handleApplyBulkToDo = () => {
    applyBulkField("To Do", bulkToDo)
    setBulkToDo("")
  }

  const handleApplyBulkAnmerkung = () => {
    applyBulkField("Anmerkung", bulkAnmerkung)
    setBulkAnmerkung("")
  }

  const handleApplyBulkRfidScan = () => {
    applyBulkField("RFID-Scan", bulkRfidScan, {
      requireValue: true,
      valueLabel: "RFID-Scan",
    })
    setBulkRfidScan("")
  }

  const fields = [
    {
      id: "bulk-todo",
      label: "To Do setzen",
      value: bulkToDo,
      options: BULK_TODO_OPTIONS,
      onValueChange: setBulkToDo,
      onApply: handleApplyBulkToDo,
    },
    {
      id: "bulk-anmerkung",
      label: "Anmerkung setzen",
      value: bulkAnmerkung,
      options: BULK_ANMERKUNG_OPTIONS,
      onValueChange: setBulkAnmerkung,
      onApply: handleApplyBulkAnmerkung,
    },
    {
      id: "bulk-rfid",
      label: "RFID-Scan setzen",
      value: bulkRfidScan,
      options: BULK_RFID_OPTIONS,
      onValueChange: setBulkRfidScan,
      onApply: handleApplyBulkRfidScan,
    },
  ]

  return { selectedCount, fields }
}
