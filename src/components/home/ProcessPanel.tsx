import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Loading03Icon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ProcessPhase = "processing" | "success" | "error"

type ProcessPanelProps = {
  phase: ProcessPhase
  title: string
  status: string
  percent: number
  progressLabel: string
  erpName: string
  rfidName: string
  debitor: string
  inventurjahr?: string
  onRetry: () => void
  onOpenEditor: () => void
}

type StepState = "done" | "active" | "pending" | "failed"

const STEP_LABELS = [
  "ERP lesen",
  "RFID zuordnen",
  "LotId vergleichen",
  "Ergebnis bereit",
] as const

const resolveSteps = (phase: ProcessPhase, percent: number): StepState[] => {
  if (phase === "success") return ["done", "done", "done", "done"]
  if (phase === "error") {
    if (percent < 25) return ["failed", "pending", "pending", "pending"]
    if (percent < 50) return ["done", "failed", "pending", "pending"]
    if (percent < 75) return ["done", "done", "failed", "pending"]
    return ["done", "done", "done", "failed"]
  }
  if (percent < 25) return ["active", "pending", "pending", "pending"]
  if (percent < 50) return ["done", "active", "pending", "pending"]
  if (percent < 75) return ["done", "done", "active", "pending"]
  if (percent < 100) return ["done", "done", "done", "active"]
  return ["done", "done", "done", "done"]
}

const ProcessPanel = ({
  phase,
  title,
  status,
  percent,
  progressLabel,
  erpName,
  rfidName,
  debitor,
  inventurjahr = String(new Date().getFullYear()),
  onRetry,
  onOpenEditor,
}: ProcessPanelProps) => {
  const steps = resolveSteps(phase, percent)
  const icon =
    phase === "success"
      ? CheckmarkCircle02Icon
      : phase === "error"
        ? Alert02Icon
        : Loading03Icon

  return (
    <section
      className="bg-card grid gap-3 border p-3.5"
      aria-labelledby="processTitle"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl",
              phase === "success" &&
                "bg-[rgba(61,214,140,0.14)] text-[#3dd68c] shadow-[inset_0_0_0_1px_rgba(61,214,140,0.28)]",
              phase === "error" &&
                "bg-[rgba(232,106,106,0.16)] text-[#ff9b9b] shadow-[inset_0_0_0_1px_rgba(232,106,106,0.3)]",
              phase === "processing" &&
                "bg-[rgba(0,104,96,0.22)] text-[#1a9b8c] shadow-[inset_0_0_0_1px_rgba(26,155,140,0.35)]"
            )}
            aria-hidden="true"
          >
            <HugeiconsIcon
              icon={icon}
              size={20}
              strokeWidth={2.2}
              className={cn(phase === "processing" && "animate-spin")}
            />
          </span>
          <div className="min-w-0">
            <h1
              id="processTitle"
              className="text-[17px] font-bold tracking-[-0.025em] leading-tight"
            >
              {title}
            </h1>
            <p
              className={cn(
                "mt-1 max-w-[56ch] text-[12.5px] leading-snug",
                phase === "error" ? "text-[#ff9b9b]" : "text-muted-foreground"
              )}
            >
              {status}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="text-muted-foreground flex items-center justify-between gap-3 text-xs font-semibold">
          <span>{progressLabel}</span>
          <span className="text-foreground tabular-nums">{percent}%</span>
        </div>
        <div
          className="bg-muted h-2 overflow-hidden rounded-full border dark:bg-[#171717]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={progressLabel}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300",
              phase === "error"
                ? "bg-gradient-to-r from-[#a83d3d] to-[#e86a6a]"
                : "bg-gradient-to-r from-primary to-[#1a9b8c]"
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ol
        className="grid grid-cols-2 gap-1.5 md:grid-cols-4"
        aria-label="Pipeline"
      >
        {STEP_LABELS.map((label, index) => {
          const state = steps[index]
          return (
            <li
              key={label}
              className={cn(
                "grid min-w-0 grid-cols-[16px_1fr] items-center gap-2 border border-transparent bg-muted/50 px-2 py-1.5 text-[11.5px] font-semibold dark:bg-[#171717]",
                state === "done" &&
                  "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-[rgba(61,214,140,0.12)] dark:bg-[rgba(61,214,140,0.06)] dark:text-[#3dd68c]",
                state === "active" &&
                  "border-primary/30 bg-primary/10 text-foreground",
                state === "failed" &&
                  "border-destructive/20 bg-destructive/10 text-destructive",
                state === "pending" && "text-muted-foreground"
              )}
            >
              <span className="size-3.5 shrink-0" aria-hidden="true">
                {state === "done" && (
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={2.2} />
                )}
                {state === "active" && (
                  <span className="bg-foreground mx-auto mt-1 block size-1.5 rounded-full" />
                )}
                {state === "failed" && (
                  <HugeiconsIcon icon={Alert02Icon} size={14} strokeWidth={2.2} />
                )}
                {state === "pending" && (
                  <span className="border-muted-foreground mx-auto mt-1 block size-1.5 rounded-full border" />
                )}
              </span>
              <span className="truncate">{label}</span>
            </li>
          )
        })}
      </ol>

      <div
        className="text-muted-foreground flex flex-nowrap items-center gap-x-2.5 overflow-hidden border bg-muted/50 px-3 py-2.5 text-[12.5px] leading-snug whitespace-nowrap dark:bg-[#171717]"
        aria-label="Dateiübersicht"
      >
        <span className="min-w-0 truncate">
          <strong className="text-foreground font-semibold dark:text-[#ddd]">
            ERP
          </strong>{" "}
          {erpName}
        </span>
        <span className="text-border shrink-0" aria-hidden="true">
          ·
        </span>
        <span className="min-w-0 truncate">
          <strong className="text-foreground font-semibold dark:text-[#ddd]">
            RFID
          </strong>{" "}
          {rfidName}
        </span>
        <span className="text-border shrink-0" aria-hidden="true">
          ·
        </span>
        <span className="shrink-0">
          Inventurjahr{" "}
          <strong className="text-foreground font-semibold dark:text-[#ddd]">
            {inventurjahr}
          </strong>
        </span>
        <span className="text-border shrink-0" aria-hidden="true">
          ·
        </span>
        <span className="shrink-0">
          Debitor{" "}
          <strong className="text-foreground font-semibold dark:text-[#ddd]">
            {debitor}
          </strong>
        </span>
      </div>

      {(phase === "success" || phase === "error") && (
        <div className="flex min-h-[34px] justify-end gap-2.5">
          {phase === "error" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-[34px] rounded-none px-3.5 text-[13px] font-semibold"
              onClick={onRetry}
            >
              Erneut versuchen
            </Button>
          )}
          {phase === "success" && (
            <Button
              type="button"
              size="sm"
              className="h-[34px] rounded-none px-3.5 text-[13px] font-semibold"
              onClick={onOpenEditor}
            >
              <HugeiconsIcon icon={PencilEdit01Icon} data-icon="inline-start" />
              Editor öffnen
            </Button>
          )}
        </div>
      )}
    </section>
  )
}

export default ProcessPanel
