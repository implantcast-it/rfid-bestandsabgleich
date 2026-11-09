import { useEffect } from "react"
import { useLocation } from "wouter"
import { isInventurSession } from "@/domains/inventur"
import { EditorWorkspace } from "@/features/editor/EditorWorkspace"

export default function EditorScreen() {
  const [, setLocation] = useLocation()
  const session = isInventurSession(history.state) ? history.state : null

  useEffect(() => {
    if (!session?.snapshot || !session.projectId) {
      setLocation("/")
    }
  }, [session, setLocation])

  if (!session?.snapshot || !session.projectId) {
    return null
  }

  return (
    <EditorWorkspace
      projectId={session.projectId}
      snapshot={session.snapshot}
      projectTitle={session.projectTitle}
      inventurjahr={session.inventurjahr}
    />
  )
}
