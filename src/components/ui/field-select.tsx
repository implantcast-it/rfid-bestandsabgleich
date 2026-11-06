import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

/** Sentinel for empty string options — Base UI Select treats "" as unset. */
const EMPTY_VALUE = "__empty__"

type FieldSelectOption = {
  value: string
  label: string
}

type FieldSelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: FieldSelectOption[]
  id?: string
  "aria-label"?: string
  className?: string
  triggerClassName?: string
  size?: "sm" | "default"
  placeholder?: string
}

const toSelectValue = (value: string) =>
  value === "" ? EMPTY_VALUE : value

const fromSelectValue = (value: string | null) => {
  if (value === null || value === EMPTY_VALUE) return ""
  return value
}

const FieldSelect = ({
  value,
  onValueChange,
  options,
  id,
  "aria-label": ariaLabel,
  className,
  triggerClassName,
  size = "sm",
  placeholder,
}: FieldSelectProps) => {
  const items = options.map((option) => ({
    value: toSelectValue(option.value),
    label: option.label,
  }))

  return (
    <Select
      value={toSelectValue(value)}
      onValueChange={(next) => onValueChange(fromSelectValue(next))}
      items={items}
      modal={false}
      id={id}
    >
      <SelectTrigger
        size={size}
        aria-label={ariaLabel}
        className={cn(
          "text-foreground w-full min-w-0 justify-between",
          triggerClassName
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className={cn("rounded-md", className)}
      >
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { FieldSelect }
