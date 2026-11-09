import type { InventurSessionState } from "@/domains/inventur/types"

export const isInventurSession = (
  state: unknown
): state is InventurSessionState => {
  if (!state || typeof state !== "object") return false
  const session = state as InventurSessionState
  return Boolean(session.snapshot) && typeof session.projectId === "string"
}

export type ProcessPhase = "processing" | "success" | "error"
