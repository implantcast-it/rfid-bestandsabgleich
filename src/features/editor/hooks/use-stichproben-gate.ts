import { toast } from "sonner"

type UseStichprobenGateArgs = {
  activeTab: string
  stichprobenDone: number
  stichprobenRequired: number
  stichprobenMet: boolean
}

export const useStichprobenGate = ({
  activeTab,
  stichprobenDone,
  stichprobenRequired,
  stichprobenMet,
}: UseStichprobenGateArgs) => {
  const completedStichproben =
    activeTab === "lotId" ? stichprobenDone : undefined
  const requiredStichproben =
    activeTab === "lotId" ? stichprobenRequired : undefined

  const assertStichprobenGate = (actionLabel: string) => {
    if (stichprobenMet) return true
    const remaining = Math.max(0, stichprobenRequired - stichprobenDone)
    toast.error("Stichproben unvollständig", {
      description: `${actionLabel} erst möglich nach ${stichprobenRequired} Stichproben (noch ${remaining} offen). Quote: 1 % der ERP-Menge (aufgerundet).`,
    })
    return false
  }

  return {
    completedStichproben,
    requiredStichproben,
    assertStichprobenGate,
  }
}
