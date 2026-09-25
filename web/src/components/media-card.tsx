import { memo, useMemo, useState } from "react"
import { HeartIcon, MusicIcon, PlayIcon, TriangleAlertIcon } from "lucide-react"

import {
  formatDuration,
  thumbUrl,
  type MediaEvent,
  type MediaItem,
} from "@/lib/api"
import { blurHashToDataURL } from "@/lib/blurhash"
import { cn } from "@/lib/utils"

interface MediaCardProps {
  item: MediaItem
  /** Latest WebSocket event for this item while it is being processed. */
  live?: MediaEvent
  onOpen: (item: MediaItem) => void
  onToggleFavorite: (item: MediaItem) => void
}

function stageLabel(evt?: MediaEvent): string {
  if (!evt) return "Waiting to process"
  switch (evt.stage) {
    case "probe":
      return "Reading file"
    case "thumbnail":
      return "Making preview"
    case "transcode":
      return "Preparing for streaming"
    default:
      return evt.status === "queued" ? "Waiting to process" : "Processing"
  }
}

export const MediaCard = memo(function MediaCard({
  item,
  live,
  onOpen,
  onToggleFavorite,
}: MediaCardProps) {
  const [thumbLoaded, setThumbLoaded] = useState(false)

  const placeholder = useMemo(
    () => (item.blur_hash ? blurHashToDataURL(item.blur_hash) : null),
    [item.blur_hash]
  )

  const processing = item.status === "pending" || item.status === "processing"
  const failed = item.status === "failed" || live?.status === "failed"
  const ready = item.status === "ready"
  const hasThumb = ready && !!item.thumbnail_path
  const isAudio = item.type === "audio"
  const duration =
    item.type === "photo" ? "" : formatDuration(item.metadata?.duration_seconds)
  const progress = live ? Math.max(0, Math.min(100, live.progress)) : 0

  return (
    <div
      className={cn(
        "media-cell group relative aspect-square overflow-hidden rounded-md bg-muted",
        ready && "focus-within:ring-2 focus-within:ring-ring"
      )}
    >
      <button
        type="button"
        disabled={!ready}
        onClick={() => onOpen(item)}
        aria-label={`Open ${item.title}`}
        className="absolute inset-0 cursor-pointer focus:outline-none disabled:cursor-default"
      >
        {placeholder && (
          <img
            src={placeholder}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-110 object-cover"
          />
        )}

        {hasThumb && (
          <img
            src={thumbUrl(item.id)}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={() => setThumbLoaded(true)}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
              thumbLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        )}

        {isAudio && !hasThumb && (
          <span className="absolute inset-0 flex items-center justify-center bg-secondary">
            <MusicIcon className="size-9 text-muted-foreground/60" />
          </span>
        )}
      </button>

      {/* Audio has no picture to recognise, so its title stays visible. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2.5 pt-8 pb-2 transition-opacity",
          isAudio
            ? "opacity-100"
            : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
        )}
      >
        <p className="truncate text-[13px] font-medium text-white">{item.title}</p>
      </div>

      {ready && item.type === "video" && (
        <span className="pointer-events-none absolute top-2 right-2 flex items-center gap-1 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
          <PlayIcon className="size-2.5 fill-current" />
          {duration}
        </span>
      )}
      {ready && isAudio && duration && (
        <span className="pointer-events-none absolute top-2 right-2 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
          {duration}
        </span>
      )}

      {ready && (
        <button
          type="button"
          aria-label={item.is_favorite ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`}
          aria-pressed={item.is_favorite}
          onClick={() => onToggleFavorite(item)}
          className={cn(
            "absolute top-1.5 left-1.5 flex size-8 items-center justify-center rounded-full transition-opacity",
            "focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            item.is_favorite
              ? "opacity-100"
              : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
          )}
        >
          <HeartIcon
            className={cn(
              "size-[18px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]",
              item.is_favorite ? "fill-primary text-primary" : "text-white"
            )}
          />
        </button>
      )}

      {processing && !failed && (
        <div className="absolute inset-0 flex flex-col justify-end gap-2 bg-black/70 p-3">
          <span className="text-xs text-white/85">
            {stageLabel(live)}
            {live && live.progress > 0 && (
              <span className="text-white/55 tabular-nums"> {Math.round(progress)}%</span>
            )}
          </span>
          <div className="h-1 overflow-hidden rounded-full bg-white/15">
            {live && live.progress > 0 ? (
              <div
                className="bg-ember-ramp h-full rounded-full transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            ) : (
              <div className="bg-ember-ramp animate-indeterminate h-full w-2/5 rounded-full" />
            )}
          </div>
          <p className="truncate text-[13px] font-medium text-white">{item.title}</p>
        </div>
      )}

      {failed && (
        <div className="absolute inset-0 flex flex-col justify-end gap-1 bg-black/75 p-3">
          <TriangleAlertIcon className="size-4 text-destructive" />
          <p className="text-xs text-white/85">Couldn't process this file</p>
          <p className="truncate text-[13px] font-medium text-white">{item.title}</p>
        </div>
      )}
    </div>
  )
})
