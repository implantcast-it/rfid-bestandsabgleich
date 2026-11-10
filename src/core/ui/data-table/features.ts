import {
  columnFilteringFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_arrIncludes,
  filterFn_equals,
  filterFn_includesString,
  filterFn_inDateRange,
  filterFn_inNumberRange,
  filterFn_weakEquals,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  type Column,
  type ColumnDef,
  type FilterFn,
  type Row,
  type RowData,
} from "@tanstack/react-table";

/**
 * Feature set shared by every DataTable. Registry keys are the only valid
 * string names in column definitions; TanStack's `'auto'` resolution also
 * picks from these keys, so every auto-resolved name is registered here.
 */
export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnPinningFeature,
  rowSelectionFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: {
    arrIncludes: filterFn_arrIncludes,
    equals: filterFn_equals,
    includesString: filterFn_includesString,
    inDateRange: filterFn_inDateRange,
    inNumberRange: filterFn_inNumberRange,
    weakEquals: filterFn_weakEquals,
  },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
});

export type DataTableFeatures = typeof dataTableFeatures;
export type DataTableRow<TData extends RowData> = Row<DataTableFeatures, TData>;
export type DataTableColumn<TData extends RowData> = Column<
  DataTableFeatures,
  TData,
  unknown
>;
export type DataTableColumnDef<TData extends RowData> = ColumnDef<
  DataTableFeatures,
  TData,
  unknown
>;
export type DataTableFilterFn<TData extends RowData> = FilterFn<
  DataTableFeatures,
  TData
>;
