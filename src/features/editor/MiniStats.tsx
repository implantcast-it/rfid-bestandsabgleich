import { cn } from "@/core/utils"
import type { LotIdStatusFilter } from "@/domains/inventur/search"

export type AutosaveStatus = "idle" | "saving" | "saved" | "error"

type MiniStatsProps = {
  abweichungen: number
  stichprobe: string
  offeneTodos: number
  autosaveStatus?: AutosaveStatus
  autosaveCountdown?: string
  activeStatusFilter?: LotIdStatusFilter
  onStatusFilterChange?: (value: LotIdStatusFilter) => void
}

const formatAutosaveValue = (
  status: AutosaveStatus,
  countdown?: string
) => {
  if (status === "saving") return "…"
  if (status === "error") return "Fehler"
  if (!countdown) {
    if (status === "saved") return "OK"
    return "—"
  }
  if (status === "saved") return `OK · ${countdown}`
  return countdown
}

const MiniStats = ({
  abweichungen,
  stichprobe,
  offeneTodos,
  autosaveStatus = "idle",
  autosaveCountdown,
  activeStatusFilter = "all",
  onStatusFilterChange,
}: MiniStatsProps) => {
  const handleToggle = (next: LotIdStatusFilter) => {
    if (!onStatusFilterChange) return
    onStatusFilterChange(activeStatusFilter === next ? "all" : next)
  }

  const autosaveValue = formatAutosaveValue(
    autosaveStatus,
    autosaveCountdown
  )

  const stats: {
    id: string
    label: string
    value: string
    filter?: LotIdStatusFilter
    ariaLabel?: string
  }[] = [
    {
      id: "diff",
      label: "Abweichungen",
      value: String(abweichungen),
      filter: "abweichung",
    },
    {
      id: "sample",
      label: "Stichprobe",
      value: stichprobe,
      filter: "stichprobe",
    },
    {
      id: "todos",
      label: "Offene To Dos",
      value: String(offeneTodos),
      filter: "offen",
    },
    {
      id: "save",
      label: "Autosave",
      value: autosaveValue,
      ariaLabel:
        autosaveStatus === "saving"
          ? "Autosave speichert gerade"
          : autosaveStatus === "error"
            ? "Autosave fehlgeschlagen"
            : autosaveCountdown
              ? `Nächster Autosave in ${autosaveCountdown}`
              : "Autosave",
    },
  ]

  return (
    <section className="bg-card border" aria-label="Kennzahlen">
      <div className="grid grid-cols-2 md:grid-cols-4">
        {stats.map((stat, index) => {
          const isInteractive = Boolean(stat.filter && onStatusFilterChange)
          const isActive =
            Boolean(stat.filter) && activeStatusFilter === stat.filter
          const cellClass = cn(
            "flex min-h-[64px] w-full flex-col items-start justify-center gap-1 px-3.5 py-3 text-left",
            index % 2 === 1 && "border-l border-border/70",
            index >= 2 && "border-t border-border/70 md:border-t-0",
            index >= 1 && "md:border-l md:border-border/70",
            isInteractive &&
              "hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-ring outline-none focus-visible:ring-2",
            isActive && "bg-muted/50"
          )

          const content = (
            <>
              <div className="text-muted-foreground w-full text-[11px] font-medium tracking-[0.02em]">
                {stat.label}
              </div>
              <div className="font-heading w-full text-[22px] font-semibold leading-none tracking-[-0.03em] lining-nums tabular-nums">
                {stat.value}
              </div>
            </>
          )

          if (isInteractive && stat.filter) {
            return (
              <button
                key={stat.id}
                type="button"
                className={cellClass}
                aria-pressed={isActive}
                aria-label={`${stat.label} filtern`}
                onClick={() => handleToggle(stat.filter!)}
              >
                {content}
              </button>
            )
          }

          return (
            <div
              key={stat.id}
              className={cellClass}
              aria-label={stat.ariaLabel}
            >
              {content}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default MiniStats
