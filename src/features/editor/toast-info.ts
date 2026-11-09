import { toast } from "sonner"

export type ToastInfo = {
  open: boolean
  type: "success" | "error"
  title: string
  description: string
}

export type SetToastInfo = (info: ToastInfo | null) => void

export const showToastInfo = (
  info: ToastInfo | null,
  options?: { id?: string }
) => {
  if (!info?.open) return
  if (info.type === "success") {
    toast.success(info.title, {
      id: options?.id,
      description: info.description,
    })
    return
  }
  toast.error(info.title, {
    id: options?.id,
    description: info.description,
  })
}
