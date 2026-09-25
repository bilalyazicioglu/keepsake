import { useEffect, useRef, useState } from "react"
import { UploadIcon, XIcon } from "lucide-react"

import { formatBytes } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface ActiveUpload {
  key: string
  name: string
  size: number
  sentBytes: number
  percent: number
  error?: string
  abort: () => void
}

const ACCEPT = "image/*,video/*,audio/*"

/** Toolbar button that opens the file picker. */
export function UploadButton({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  return (
    <>
      <Button onClick={() => inputRef.current?.click()} className="h-9">
        <UploadIcon className="size-4" />
        Upload
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) onFiles(files)
          e.target.value = ""
        }}
      />
    </>
  )
}

/**
 * Makes the whole window a drop target. The overlay appears only while files
 * are dragged over the page, so the library itself never gives up space to an
 * upload box.
 */
export function WindowDropTarget({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)

  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files")

    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth.current++
      setDragging(true)
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      if (--depth.current <= 0) {
        depth.current = 0
        setDragging(false)
      }
    }
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth.current = 0
      setDragging(false)
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length) onFiles(files)
    }

    window.addEventListener("dragenter", enter)
    window.addEventListener("dragleave", leave)
    window.addEventListener("dragover", over)
    window.addEventListener("drop", drop)
    return () => {
      window.removeEventListener("dragenter", enter)
      window.removeEventListener("dragleave", leave)
      window.removeEventListener("dragover", over)
      window.removeEventListener("drop", drop)
    }
  }, [onFiles])

  if (!dragging) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-canvas/85 p-6">
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ember/70 text-center">
        <UploadIcon className="size-8 text-ember" />
        <p className="font-heading text-2xl font-bold">Drop to add to your library</p>
        <p className="text-sm text-muted-foreground">
          Photos, videos and music. Large files upload in parts and resume if interrupted.
        </p>
      </div>
    </div>
  )
}

/** Bottom-right stack of in-flight and failed uploads. */
export function UploadTray({
  uploads,
  onDismiss,
}: {
  uploads: ActiveUpload[]
  onDismiss: (key: string) => void
}) {
  if (uploads.length === 0) return null
  return (
    <section
      aria-label="Uploads"
      className="fixed right-4 bottom-4 left-4 z-40 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover shadow-2xl shadow-black/50 sm:left-auto sm:w-80"
    >
      <h2 className="sticky top-0 border-b border-border bg-popover px-4 py-2.5 text-sm font-medium">
        Uploading {uploads.length} {uploads.length === 1 ? "file" : "files"}
      </h2>
      <ul className="divide-y divide-border">
        {uploads.map((u) => (
          <li key={u.key} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm">{u.name}</p>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {u.error
                    ? "Failed"
                    : u.percent >= 100
                      ? "Finishing"
                      : `${formatBytes(u.sentBytes)} of ${formatBytes(u.size)}`}
                </span>
              </div>
              {u.error ? (
                <p className="mt-1 truncate text-xs text-destructive">{u.error}</p>
              ) : (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "bg-ember-ramp h-full rounded-full transition-[width] duration-300",
                      u.percent >= 100 && "animate-pulse"
                    )}
                    style={{ width: `${Math.max(u.percent, 2)}%` }}
                  />
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label={u.error ? `Dismiss ${u.name}` : `Cancel ${u.name}`}
              onClick={() => {
                u.abort()
                onDismiss(u.key)
              }}
            >
              <XIcon className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
