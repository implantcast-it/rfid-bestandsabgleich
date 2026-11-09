import { cn } from "@/core/utils"
import type { LotIdStatusFilter } from "@/domains/inventur/search"

type LotIdStatusChipsProps = {
  value: LotIdStatusFilter
  onChange: (value: LotIdStatusFilter) => void
}

const FILTERS: { value: LotIdStatusFilter; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "abweichung", label: "Abweichungen" },
  { value: "offen", label: "Offene To Dos" },
  { value: "stichprobe", label: "Ohne Stichprobe" },
]

const LotIdStatusChips = ({ value, onChange }: LotIdStatusChipsProps) => {
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    next: LotIdStatusFilter
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onChange(next)
    }
  }

  return (
    <div
      className="bg-background inline-flex flex-wrap rounded-none border p-0.5"
      role="group"
      aria-label="LotId-Zeilen filtern"
    >
      {FILTERS.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
          onKeyDown={(event) => handleKeyDown(event, item.value)}
          className={cn(
            "h-7 rounded-none px-2.5 text-[11px] font-bold transition-colors",
            value === item.value
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default LotIdStatusChips
