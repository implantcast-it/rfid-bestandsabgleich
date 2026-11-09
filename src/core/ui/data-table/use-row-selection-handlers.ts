import {
  useCallback,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
} from "react"
import type { OnChangeFn, RowData, RowSelectionState } from "@tanstack/react-table"
import type { DataTableRow } from "@/core/ui/data-table/features"

const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      'button, input, textarea, select, a, label, [role="checkbox"], [role="combobox"], [data-slot="checkbox"]'
    )
  )
}

type UseRowSelectionHandlersArgs<TData extends RowData> = {
  enableRowSelection: boolean
  handleSelectionChange: OnChangeFn<RowSelectionState>
  getFilteredRows: () => DataTableRow<TData>[]
}

export const useRowSelectionHandlers = <TData extends RowData>({
  enableRowSelection,
  handleSelectionChange,
  getFilteredRows,
}: UseRowSelectionHandlersArgs<TData>) => {
  const lastSelectedRowIdRef = useRef<string | null>(null)

  const handleRowClick = (
    event: MouseEvent<HTMLTableRowElement>,
    row: DataTableRow<TData>
  ) => {
    if (!enableRowSelection) return

    if (isInteractiveTarget(event.target)) {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('[data-slot="checkbox"], [role="checkbox"]')
      ) {
        lastSelectedRowIdRef.current = row.id
      }
      return
    }

    const rowId = row.id
    const isToggle = event.ctrlKey || event.metaKey
    const isRange = event.shiftKey

    if (isRange && lastSelectedRowIdRef.current) {
      const visibleRows = getFilteredRows()
      const anchorIndex = visibleRows.findIndex(
        (item) => item.id === lastSelectedRowIdRef.current
      )
      const currentIndex = visibleRows.findIndex((item) => item.id === rowId)

      if (anchorIndex === -1 || currentIndex === -1) {
        handleSelectionChange({ [rowId]: true })
        lastSelectedRowIdRef.current = rowId
        return
      }

      const start = Math.min(anchorIndex, currentIndex)
      const end = Math.max(anchorIndex, currentIndex)
      const rangeSelection: RowSelectionState = {}
      for (let index = start; index <= end; index += 1) {
        rangeSelection[visibleRows[index].id] = true
      }
      handleSelectionChange(rangeSelection)
      return
    }

    if (isToggle) {
      row.toggleSelected(!row.getIsSelected())
      lastSelectedRowIdRef.current = rowId
      return
    }

    handleSelectionChange({ [rowId]: true })
    lastSelectedRowIdRef.current = rowId
  }

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    row: DataTableRow<TData>
  ) => {
    if (!enableRowSelection) return
    if (event.key !== " " && event.key !== "Enter") return
    if (isInteractiveTarget(event.target)) return

    event.preventDefault()
    const isToggle = event.ctrlKey || event.metaKey
    if (isToggle) {
      row.toggleSelected(!row.getIsSelected())
    } else {
      handleSelectionChange({ [row.id]: true })
    }
    lastSelectedRowIdRef.current = row.id
  }

  const rowHandlersRef = useRef({ handleRowClick, handleRowKeyDown })
  useLayoutEffect(() => {
    rowHandlersRef.current = { handleRowClick, handleRowKeyDown }
  })

  const handleBodyRowClick = useCallback(
    (event: MouseEvent<HTMLTableRowElement>, row: DataTableRow<TData>) =>
      rowHandlersRef.current.handleRowClick(event, row),
    []
  )
  const handleBodyRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableRowElement>, row: DataTableRow<TData>) =>
      rowHandlersRef.current.handleRowKeyDown(event, row),
    []
  )

  return { handleBodyRowClick, handleBodyRowKeyDown }
}
