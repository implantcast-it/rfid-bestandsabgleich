import { useCallback, useLayoutEffect, type RefObject } from "react"
import type { ColumnPinningState, ColumnSizingState } from "@tanstack/react-table"
import { pinnedOffsetsChanged } from "@/core/ui/data-table/column-styles"

type UsePinnedOffsetsArgs = {
  tableRef: RefObject<HTMLTableElement | null>
  columnPinning: ColumnPinningState
  columnSizing: ColumnSizingState
  memoColumns: unknown
  setPinnedStartOffsets: (
    updater: (prev: Record<string, number>) => Record<string, number>
  ) => void
}

export const usePinnedOffsets = ({
  tableRef,
  columnPinning,
  columnSizing,
  memoColumns,
  setPinnedStartOffsets,
}: UsePinnedOffsetsArgs) => {
  const measurePinnedStartOffsets = useCallback(() => {
    const tableElement = tableRef.current
    if (!tableElement) return

    const headerCells = Array.from(
      tableElement.querySelectorAll<HTMLElement>("thead th")
    )
    const nextOffsets: Record<string, number> = {}
    let runningOffset = 0

    for (const columnId of columnPinning.start ?? []) {
      nextOffsets[columnId] = runningOffset
      const headerCell = headerCells.find(
        (cell) => cell.dataset.columnId === columnId
      )
      runningOffset += headerCell?.getBoundingClientRect().width ?? 0
    }

    setPinnedStartOffsets((prev) =>
      pinnedOffsetsChanged(prev, nextOffsets) ? nextOffsets : prev
    )
  }, [columnPinning.start, setPinnedStartOffsets, tableRef])

  useLayoutEffect(() => {
    measurePinnedStartOffsets()
  }, [measurePinnedStartOffsets, columnSizing, memoColumns])

  useLayoutEffect(() => {
    const tableElement = tableRef.current
    if (!tableElement) return

    const observer = new ResizeObserver(measurePinnedStartOffsets)
    observer.observe(tableElement)
    return () => observer.disconnect()
  }, [measurePinnedStartOffsets, tableRef])
}
