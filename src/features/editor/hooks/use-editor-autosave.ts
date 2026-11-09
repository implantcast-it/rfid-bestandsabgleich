import { useEffect, useRef, useState, type MutableRefObject } from "react"

const AUTOSAVE_MS = 5 * 60 * 1000

export const formatAutosaveCountdown = (remainingMs: number) => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  if (minutes >= 1) return `${minutes} Min`
  return `${totalSeconds} s`
}

type UseEditorAutosaveArgs = {
  isDirtyRef: MutableRefObject<boolean>
  flushDraft: (opts?: { silent?: boolean }) => Promise<boolean>
}

export const useEditorAutosave = ({
  isDirtyRef,
  flushDraft,
}: UseEditorAutosaveArgs) => {
  const [autosaveCountdown, setAutosaveCountdown] = useState(() =>
    formatAutosaveCountdown(AUTOSAVE_MS)
  )
  const autosaveTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const nextAutosaveAtRef = useRef(Date.now() + AUTOSAVE_MS)
  const flushDraftRef = useRef(flushDraft)

  useEffect(() => {
    flushDraftRef.current = flushDraft
  }, [flushDraft])

  useEffect(() => {
    nextAutosaveAtRef.current = Date.now() + AUTOSAVE_MS
    setAutosaveCountdown(formatAutosaveCountdown(AUTOSAVE_MS))

    autosaveTimer.current = setInterval(() => {
      nextAutosaveAtRef.current = Date.now() + AUTOSAVE_MS
      setAutosaveCountdown(formatAutosaveCountdown(AUTOSAVE_MS))
      if (!isDirtyRef.current) return
      void flushDraftRef.current({ silent: true })
    }, AUTOSAVE_MS)

    const countdownTimer = setInterval(() => {
      const remainingMs = nextAutosaveAtRef.current - Date.now()
      setAutosaveCountdown(formatAutosaveCountdown(remainingMs))
    }, 1000)

    return () => {
      if (autosaveTimer.current) clearInterval(autosaveTimer.current)
      clearInterval(countdownTimer)
    }
  }, [isDirtyRef])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        void flushDraft()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [flushDraft])

  const clearAutosaveTimer = () => {
    if (autosaveTimer.current) clearInterval(autosaveTimer.current)
  }

  return { autosaveCountdown, clearAutosaveTimer }
}
