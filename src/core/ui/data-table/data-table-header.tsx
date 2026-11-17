import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import type {
  ColumnSizingState,
  HeaderGroup,
  OnChangeFn,
  RowData,
} from "@tanstack/react-table";
import {
  getColumnMeta,
  getColumnWidthStyle,
  getPinnedOffset,
  getPinnedStyle,
  getPinnedWidthStyle,
} from "@/core/ui/data-table/column-styles";

import type { DataTableFeatures } from "@/core/ui/data-table/features";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/core/utils";
import { flexRender } from "@tanstack/react-table";

type DataTableHeaderProps<TData extends RowData> = {
  headerGroups: HeaderGroup<DataTableFeatures, TData>[];
  columnSizing: ColumnSizingState;
  onColumnSizingChange: OnChangeFn<ColumnSizingState>;
  pinnedStartOffsets: Record<string, number>;
};

export const DataTableHeader = <TData extends RowData>({
  headerGroups,
  columnSizing,
  onColumnSizingChange,
  pinnedStartOffsets,
}: DataTableHeaderProps<TData>) => (
  <thead>
    {headerGroups.map((headerGroup) => (
      <tr key={headerGroup.id}>
        {headerGroup.headers.map((header) => {
          const isPinned = header.column.getIsPinned();
          const offset = getPinnedOffset(header.column, pinnedStartOffsets);
          const canSort = header.column.getCanSort();
          const sorted = header.column.getIsSorted();
          const canFilter = header.column.getCanFilter();
          const canResize = header.column.getCanResize();
          const meta = getColumnMeta(header.column);
          const widthStyle = getColumnWidthStyle(header.column, columnSizing);
          const pinnedWidthStyle = getPinnedWidthStyle(
            header.column,
            isPinned,
            widthStyle,
          );

          return (
            <th
              key={header.id}
              colSpan={header.colSpan}
              data-column-id={header.column.id}
              style={{
                ...getPinnedStyle(isPinned, offset, true),
                ...pinnedWidthStyle,
              }}
              className={cn(
                "top-0 z-[2] sticky bg-muted p-0 border-border border-b font-bold text-muted-foreground text-xs text-left uppercase align-bottom tracking-[0.05em] whitespace-nowrap",
                isPinned && "bg-muted z-[3]",
              )}
              title={meta.tooltip}
            >
              {isPinned ? (
                <div
                  aria-hidden
                  className='absolute inset-0 bg-muted pointer-events-none'
                />
              ) : null}
              {header.isPlaceholder ? null : (
                <div className='z-[1] relative flex flex-col gap-1.5 px-2.5 py-2 overflow-hidden'>
                  <div className='flex justify-between items-center gap-1 min-w-0'>
                    {canSort ? (
                      <button
                        type='button'
                        data-col-label
                        className='inline-flex z-[1] relative items-center gap-1 outline-none w-max min-w-0 hover:text-foreground focus-visible:text-foreground text-left cursor-pointer'
                        onClick={header.column.getToggleSortingHandler()}
                        tabIndex={0}
                        aria-label={`Sortieren: ${String(header.column.columnDef.header)}`}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {sorted === "asc" ? (
                          <HugeiconsIcon
                            icon={ArrowUp01Icon}
                            strokeWidth={2}
                            className='size-3 shrink-0'
                          />
                        ) : null}
                        {sorted === "desc" ? (
                          <HugeiconsIcon
                            icon={ArrowDown01Icon}
                            strokeWidth={2}
                            className='size-3 shrink-0'
                          />
                        ) : null}
                      </button>
                    ) : (
                      <div
                        data-col-label
                        className='inline-flex z-[1] relative items-center gap-1 w-max min-w-0 text-left'
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </div>
                    )}
                    {canResize ? (
                      <div className='flex items-center gap-1 shrink-0'>
                        {[-1, 1].map((direction) => {
                          const minSize = header.column.columnDef.minSize ?? 0;
                          const maxSize =
                            header.column.columnDef.maxSize ??
                            Number.POSITIVE_INFINITY;
                          const currentSize = header.column.getSize();
                          const sizeOptions = meta.sizeOptions;
                          const getNextSize = (size: number) => {
                            if (sizeOptions) {
                              const options =
                                direction < 0
                                  ? [...sizeOptions].reverse()
                                  : sizeOptions;
                              return (
                                options.find((option) =>
                                  direction < 0
                                    ? option.size < size
                                    : option.size > size,
                                )?.size ?? size
                              );
                            }
                            return Math.min(
                              maxSize,
                              Math.max(minSize, size + direction * 60),
                            );
                          };
                          const nextSize = getNextSize(currentSize);
                          const isIncrease = direction > 0;
                          const nextOption = sizeOptions?.find(
                            (option) => option.size === nextSize,
                          );

                          return (
                            <button
                              key={direction}
                              type='button'
                              aria-label={`${String(header.column.columnDef.header)} ${isIncrease ? "vergrößern" : "verkleinern"}`}
                              title={
                                nextOption
                                  ? `${nextOption.label} (${nextOption.size} px)`
                                  : `${isIncrease ? "Vergrößern" : "Verkleinern"} (60 px)`
                              }
                              disabled={nextSize === currentSize}
                              onClick={(event) => {
                                event.stopPropagation();
                                onColumnSizingChange((previousSizing) => {
                                  const previousSize =
                                    previousSizing[header.column.id] ??
                                    header.column.getSize();
                                  return {
                                    ...previousSizing,
                                    [header.column.id]:
                                      getNextSize(previousSize),
                                  };
                                });
                              }}
                              className='inline-flex justify-center items-center bg-background hover:bg-accent disabled:opacity-50 border border-border size-6 text-foreground disabled:text-muted-foreground text-sm leading-none disabled:cursor-not-allowed'
                            >
                              {isIncrease ? "+" : "−"}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  {canFilter ? (
                    <input
                      type='search'
                      value={(header.column.getFilterValue() as string) ?? ""}
                      onChange={(event) =>
                        header.column.setFilterValue(event.target.value)
                      }
                      placeholder='Filtern…'
                      aria-label={`Filter ${String(header.column.columnDef.header)}`}
                      className='z-0 relative bg-background px-1.5 border border-border focus:border-primary rounded-none outline-none focus:ring-[3px] focus:ring-primary/30 w-full min-w-0 max-w-full h-6 font-medium text-foreground placeholder:text-muted-foreground text-xs normal-case tracking-normal'
                    />
                  ) : null}
                </div>
              )}
            </th>
          );
        })}
      </tr>
    ))}
  </thead>
);
