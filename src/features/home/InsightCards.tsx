import { cn } from "@/core/utils"

type InsightMetric = {
  id: string
  label: string
  value: string
}

type InsightCardsProps = {
  version: string
  inventurjahr?: string
  vergleiche?: number
  offene?: number
  stichproben?: number
}

const InsightCards = ({
  version,
  inventurjahr = String(new Date().getFullYear()),
  vergleiche = 0,
  offene = 0,
  stichproben = 0,
}: InsightCardsProps) => {
  const metrics: InsightMetric[] = [
    {
      id: "version",
      label: "App-Version",
      value: version ? `v${version}` : "—",
    },
    {
      id: "vergleiche",
      label: `Vergleiche ${inventurjahr}`,
      value: String(vergleiche),
    },
    {
      id: "offene",
      label: "Offene Inventuren",
      value: String(offene),
    },
    {
      id: "stichproben",
      label: "Stichproben offen",
      value: String(stichproben),
    },
  ]

  return (
    <section
      className="bg-card border"
      aria-label={`Übersicht Inventurjahr ${inventurjahr}`}
    >
      <div className="grid grid-cols-2 md:grid-cols-4">
        {metrics.map((metric, index) => (
          <div
            key={metric.id}
            className={cn(
              "flex min-h-[64px] flex-col justify-center gap-1 px-3.5 py-3",
              index % 2 === 1 && "border-l border-border/70",
              index >= 2 && "border-t border-border/70 md:border-t-0",
              index >= 1 && "md:border-l md:border-border/70"
            )}
          >
            <div className="text-muted-foreground text-[11px] font-medium tracking-[0.02em]">
              {metric.label}
            </div>
            <div className="font-heading text-[22px] font-semibold leading-none tracking-[-0.03em] lining-nums tabular-nums">
              {metric.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default InsightCards
