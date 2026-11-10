import { useLayoutEffect, type RefObject } from "react"
import type {
  ColumnFiltersState,
  ColumnSizingState,
  SortingState,
} from "@tanstack/react-table"
import {
  hasExplicitSize,
  sizingChanged,
} from "@/core/ui/data-table/column-styles"

const FILTER_MIN_WIDTH = 72
/** Sort icon (size-3) + gap — reserved even when unsorted so the header never clips. */
const SORT_ICON_RESERVE = 16

type UseColumnSizingArgs = {
  scrollContainerRef: RefObject<HTMLDivElement | null>
  getFlatHeaders: () => Array<{
    column: {
      id: string
      columnDef: { minSize?: number; maxSize?: number }
      getCanFilter: () => boolean
      getCanSort: () => boolean
      getIsSorted: () => false | "asc" | "desc"
    }
  }>
  setColumnSizing: (
    updater: (prev: ColumnSizingState) => ColumnSizingState
  ) => void
  memoColumns: unknown
  memoData: unknown
  sorting: SortingState
  columnFilters: ColumnFiltersState
  globalFilter: string | undefined
  pageIndex: number
  pageSize: number
}

export const useColumnSizing = ({
  scrollContainerRef,
  getFlatHeaders,
  setColumnSizing,
  memoColumns,
  memoData,
  sorting,
  columnFilters,
  globalFilter,
  pageIndex,
  pageSize,
}: UseColumnSizingArgs) => {
  useLayoutEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const measure = () => {
      setColumnSizing((prev) => {
        const next: ColumnSizingState = { ...prev }

        for (const header of getFlatHeaders()) {
          if (hasExplicitSize(header.column as never)) continue

          const th = container.querySelector(
            `th[data-column-id="${header.column.id}"]`
          )
          if (!(th instanceof HTMLElement)) continue

          const label = th.querySelector("[data-col-label]")
          const labelWidth =
            label instanceof HTMLElement ? label.scrollWidth : th.scrollWidth
          const canFilter = header.column.getCanFilter()
          const canSort = header.column.getCanSort()
          const sorted = header.column.getIsSorted()
          let width = Math.max(labelWidth, canFilter ? FILTER_MIN_WIDTH : 0)

          if (canSort && !sorted) width += SORT_ICON_RESERVE

          width += 20

          const cells = container.querySelectorAll(
            `td[data-cell-column-id="${header.column.id}"]`
          )
          cells.forEach((cell) => {
            if (!(cell instanceof HTMLElement)) return
            width = Math.max(width, cell.scrollWidth)
          })

          const minSize = header.column.columnDef.minSize ?? 0
          const maxSize =
            header.column.columnDef.maxSize ?? Number.POSITIVE_INFINITY
          next[header.column.id] = Math.ceil(
            Math.min(Math.max(width, minSize), maxSize)
          )
        }

        if (!sizingChanged(prev, next)) return prev
        return next
      })
    }

    measure()

    const observer = new ResizeObserver(() => {
      measure()
    })
    observer.observe(container)

    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    memoColumns,
    memoData,
    sorting,
    columnFilters,
    globalFilter,
    pageIndex,
    pageSize,
  ])
}
