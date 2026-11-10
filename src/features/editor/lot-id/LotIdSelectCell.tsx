import { memo, type ComponentProps } from "react"
import { LazyFieldSelect } from "@/core/ui/field-select"
import type { LotIdGridRow } from "@/domains/inventur"

export type LotIdEditableField =
  | "RFID-Scan"
  | "To Do"
  | "Anmerkung"
  | "Stichprobe"

type SelectOptions = ComponentProps<typeof LazyFieldSelect>["options"]

type SelectCellContext = {
  row: { original: LotIdGridRow }
  getValue: () => unknown
}

type LotIdSelectCellProps = {
  rowId: string
  field: LotIdEditableField
  value: string
  options: SelectOptions
  ariaLabel: string
  onEdit: (rowId: string, field: LotIdEditableField, value: string) => void
}

const cellSelectTriggerClass = "h-7 rounded-none px-1.5 text-sm"

/** Memoized so an edit or search re-renders only the select cells whose value changed. */
export const LotIdSelectCell = memo(
  ({
    rowId,
    field,
    value,
    options,
    ariaLabel,
    onEdit,
  }: LotIdSelectCellProps) => {
    const handleValueChange = (next: string) => onEdit(rowId, field, next)

    return (
      <LazyFieldSelect
        value={value}
        onValueChange={handleValueChange}
        aria-label={ariaLabel}
        triggerClassName={
          field === "RFID-Scan"
            ? `${cellSelectTriggerClass} min-w-0`
            : `${cellSelectTriggerClass} min-w-[96px]`
        }
        options={options}
      />
    )
  }
)

export const renderLotIdSelectCell =
  (
    onEdit: LotIdSelectCellProps["onEdit"],
    field: LotIdEditableField,
    ariaLabel: string,
    options: SelectOptions
  ) =>
  ({ row, getValue }: SelectCellContext) => (
    <LotIdSelectCell
      rowId={row.original.id}
      field={field}
      value={String(getValue() ?? "")}
      options={options}
      ariaLabel={ariaLabel}
      onEdit={onEdit}
    />
  )
