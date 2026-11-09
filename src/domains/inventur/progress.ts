/** Pipeline stages mirrored from Rust `InventurStepId`. */
export type InventurStepId = "erp" | "rfid" | "compare" | "result"

export type InventurProgressKind = "started" | "finished" | "failed"

/** Mirrors Rust `InventurProgressEvent` (serde snake_case). */
export type InventurProgressEvent = {
  step: InventurStepId
  step_index: number
  kind: InventurProgressKind
  label: string
  message: string
  percent: number
}

export type PipelineStepState = "done" | "active" | "pending" | "failed"

export const INVENTUR_STEP_LABELS = [
  "ERP lesen",
  "RFID zuordnen",
  "LotId vergleichen",
  "Ergebnis bereit",
] as const

export const INITIAL_PIPELINE_STEPS: PipelineStepState[] = [
  "pending",
  "pending",
  "pending",
  "pending",
]

/** Apply one backend progress tick to the four UI pipeline chips. */
export const applyInventurProgress = (
  previous: PipelineStepState[],
  event: InventurProgressEvent
): PipelineStepState[] => {
  const next = [...previous] as PipelineStepState[]
  const index = Math.min(
    Math.max(event.step_index, 0),
    INVENTUR_STEP_LABELS.length - 1
  )

  if (event.kind === "started") {
    for (let i = 0; i < index; i++) {
      if (next[i] !== "failed") next[i] = "done"
    }
    next[index] = "active"
    for (let i = index + 1; i < next.length; i++) {
      if (next[i] !== "failed") next[i] = "pending"
    }
    return next
  }

  if (event.kind === "finished") {
    for (let i = 0; i <= index; i++) {
      if (next[i] !== "failed") next[i] = "done"
    }
    for (let i = index + 1; i < next.length; i++) {
      if (next[i] !== "failed") next[i] = "pending"
    }
    return next
  }

  for (let i = 0; i < index; i++) {
    if (next[i] !== "failed") next[i] = "done"
  }
  next[index] = "failed"
  for (let i = index + 1; i < next.length; i++) {
    next[i] = "pending"
  }
  return next
}

/** Mark the last active step as failed when the invoke rejects without a failed tick. */
export const markActiveStepFailed = (
  steps: PipelineStepState[]
): PipelineStepState[] => {
  const next: PipelineStepState[] = [...steps]
  const activeIndex = next.findIndex((step) => step === "active")
  if (activeIndex >= 0) {
    next[activeIndex] = "failed"
    return next
  }
  const pendingIndex = next.findIndex((step) => step === "pending")
  if (pendingIndex >= 0) {
    next[pendingIndex] = "failed"
    return next
  }
  const lastIndex = next.length - 1
  if (lastIndex >= 0 && next.every((step) => step === "done")) {
    const updated: PipelineStepState[] = [...next]
    updated[lastIndex] = "failed"
    return updated
  }
  return next
}
