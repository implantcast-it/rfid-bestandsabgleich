import { useLayoutEffect, useRef, useState, type ComponentProps } from "react"
import { UnfoldMoreIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  selectTriggerClassName,
} from "@/core/ui/select"
import { cn } from "@/core/utils"

/** Sentinel for empty string options — Base UI Select treats "" as unset. */
const EMPTY_VALUE = "__empty__"

/** Close reasons that return focus to the trigger. Outside clicks keep the focus the user moved to. */
const FOCUS_RETURNING_CLOSE_REASONS = new Set<string>([
  "escape-key",
  "item-press",
  "trigger-press",
])

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
  defaultOpen?: boolean
  onOpenChange?: ComponentProps<typeof Select>["onOpenChange"]
}

type FieldSelectOpenChange = NonNullable<FieldSelectProps["onOpenChange"]>

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
  defaultOpen,
  onOpenChange,
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
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
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

/**
 * Renders a plain trigger until the user opens it, then mounts FieldSelect
 * already open. Table cells use this so a page of rows costs one button per
 * cell instead of one Base UI Select root per cell.
 */
const LazyFieldSelect = ({
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
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const shouldReturnFocusRef = useRef(false)
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? placeholder ?? ""

  // The open Select unmounts on close, so focus returns to the trigger that replaces it.
  useLayoutEffect(() => {
    if (isOpen || !shouldReturnFocusRef.current) return
    shouldReturnFocusRef.current = false
    triggerRef.current?.focus()
  }, [isOpen])

  const handleOpenChange: FieldSelectOpenChange = (open, eventDetails) => {
    if (open) return
    shouldReturnFocusRef.current = FOCUS_RETURNING_CLOSE_REASONS.has(
      eventDetails.reason
    )
    setIsOpen(false)
  }

  const handleTriggerClick = () => setIsOpen(true)

  if (isOpen) {
    return (
      <FieldSelect
        value={value}
        onValueChange={onValueChange}
        options={options}
        id={id}
        aria-label={ariaLabel}
        className={className}
        triggerClassName={triggerClassName}
        size={size}
        placeholder={placeholder}
        defaultOpen
        onOpenChange={handleOpenChange}
      />
    )
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      id={id}
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      data-size={size}
      onClick={handleTriggerClick}
      className={cn(
        selectTriggerClassName,
        "text-foreground w-full min-w-0 justify-between",
        triggerClassName
      )}
    >
      <span data-slot="select-value" className="flex flex-1 text-left">
        {selectedLabel}
      </span>
      <HugeiconsIcon
        icon={UnfoldMoreIcon}
        strokeWidth={2}
        className="pointer-events-none size-3.5 text-muted-foreground"
      />
    </button>
  )
}

export { FieldSelect, LazyFieldSelect }
