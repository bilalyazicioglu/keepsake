import { toast } from "sonner"

import { ApiError } from "@/lib/api"

/**
 * Shows a failed request as an error toast. 401s are skipped: the session
 * expiry handler already sends the user back to sign-in with its own notice.
 */
export function toastError(err: unknown, fallback: string): void {
  if (err instanceof ApiError && err.status === 401) return
  toast.error(err instanceof Error ? err.message : fallback)
}
