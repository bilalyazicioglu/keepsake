import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowUpDownIcon, Loader2Icon, SearchIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import {
  clearSession,
  createCollection,
  deleteCollection,
  getCollection,
  getMedia,
  getStoredUser,
  getToken,
  listCollections,
  onUnauthorized,
  listMedia,
  patchMedia,
  removeFromCollection,
  uploadFile,
  type Collection,
  type MediaEvent,
  type MediaItem,
  type MediaSort,
  type MediaType,
  type User,
} from "@/lib/api"
import { toastError } from "@/lib/errors"
import { useMediaEvents } from "@/hooks/use-media-events"
import { cn } from "@/lib/utils"
import { LoginView } from "@/components/login-view"
import { MediaCard } from "@/components/media-card"
import { PlayerDialog } from "@/components/player-dialog"
import { Sidebar, type Scope } from "@/components/sidebar"
import {
  UploadButton,
  UploadTray,
  WindowDropTarget,
  type ActiveUpload,
} from "@/components/upload-zone"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "@/components/ui/sonner"

const PAGE_SIZE = 60

type Filter = "" | MediaType

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "", label: "All" },
  { value: "photo", label: "Photos" },
  { value: "video", label: "Videos" },
  { value: "audio", label: "Music" },
]

const SORT_LABELS: Record<MediaSort, string> = {
  added: "Date added",
  captured: "Date taken",
  name: "Name",
}

const monthFormat = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
})

/**
 * Splits an already-sorted list into runs that share a calendar month. Runs
 * are only merged when adjacent, so the grouping never reorders items.
 */
function groupByMonth(
  items: MediaItem[],
  dateOf: (item: MediaItem) => string
): Array<{ key: string; label: string; items: MediaItem[] }> {
  const groups: Array<{ key: string; label: string; items: MediaItem[] }> = []
  for (const item of items) {
    const d = new Date(dateOf(item))
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(item)
    else groups.push({ key, label: monthFormat.format(d), items: [item] })
  }
  return groups
}

export default function App() {
  const [user, setUser] = useState<User | null>(() =>
    getToken() ? getStoredUser() : null
  )

  useEffect(
    () =>
      onUnauthorized(() => {
        setUser(null)
        // Parallel requests all fail at once; the id keeps it to one toast.
        toast.info("Your session has expired. Sign in again.", {
          id: "session-expired",
        })
      }),
    []
  )

  if (!user) {
    return (
      <>
        <LoginView onLogin={setUser} />
        <Toaster position="top-center" />
      </>
    )
  }

  return (
    <>
      <Library
        user={user}
        onLogout={() => {
          clearSession()
          setUser(null)
        }}
      />
      <Toaster position="top-center" />
    </>
  )
}

function Library({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [total, setTotal] = useState(0)
  const [scope, setScope] = useState<Scope>({ kind: "library" })
  const [filter, setFilter] = useState<Filter>("")
  const [searchInput, setSearchInput] = useState("")
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<MediaSort>("added")
  const [ascending, setAscending] = useState(false)
  const [albums, setAlbums] = useState<Collection[]>([])
  const [albumItems, setAlbumItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [live, setLive] = useState<Record<string, MediaEvent>>({})
  const [uploads, setUploads] = useState<ActiveUpload[]>([])
  const [playing, setPlaying] = useState<MediaItem | null>(null)

  const activeAlbum = scope.kind === "album" ? scope.album : null
  const favOnly = scope.kind === "favorites"

  // Latest view state for use inside long-lived callbacks (WS, uploads).
  const viewRef = useRef({ filter, favOnly, query, activeAlbum })
  viewRef.current = { filter, favOnly, query, activeAlbum }

  // Debounce the search box into the applied query.
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // --- Data loading ------------------------------------------------------------

  // Bumped whenever the view changes, so responses for an older view (a
  // slow request for the previous tab or search) are dropped on arrival.
  const viewGen = useRef(0)

  useEffect(() => {
    const gen = ++viewGen.current
    const current = () => gen === viewGen.current
    setLoading(true)
    const request = activeAlbum
      ? getCollection(activeAlbum.id).then((res) => {
          if (current()) setAlbumItems(res.items)
        })
      : listMedia({
          type: filter,
          favorite: favOnly,
          query,
          sort,
          ascending,
          limit: PAGE_SIZE,
          offset: 0,
        }).then((res) => {
          if (!current()) return
          setItems(res.items)
          setTotal(res.total)
        })
    request
      .catch((err: unknown) => {
        if (current()) toastError(err, "Couldn't load your library")
      })
      .finally(() => {
        if (current()) setLoading(false)
      })
  }, [filter, favOnly, query, sort, ascending, activeAlbum])

  useEffect(() => {
    listCollections()
      .then(setAlbums)
      .catch((err: unknown) => toastError(err, "Couldn't load albums"))
  }, [])

  const loadMore = async () => {
    const gen = viewGen.current
    setLoadingMore(true)
    try {
      const res = await listMedia({
        type: filter,
        favorite: favOnly,
        query,
        sort,
        ascending,
        limit: PAGE_SIZE,
        offset: items.length,
      })
      if (gen !== viewGen.current) return
      setItems((prev) => [...prev, ...res.items])
      setTotal(res.total)
    } catch (err) {
      toastError(err, "Couldn't load more")
    } finally {
      setLoadingMore(false)
    }
  }

  // In album mode, filters and sorting apply client-side to the album's items;
  // albums are curated and small, so this stays cheap.
  const albumCuratedOrder = !!activeAlbum && sort === "added" && !ascending
  const displayed = useMemo(() => {
    if (!activeAlbum) return items
    let list = albumItems
    if (filter) list = list.filter((i) => i.type === filter)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter((i) => i.title.toLowerCase().includes(q))
    }
    if (albumCuratedOrder) return list
    const dir = ascending ? 1 : -1
    return [...list].sort((a, b) => {
      switch (sort) {
        case "name":
          return dir * a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
        case "captured": {
          const ta = Date.parse(a.captured_at ?? a.created_at)
          const tb = Date.parse(b.captured_at ?? b.created_at)
          return dir * (ta - tb)
        }
        default:
          return dir * (Date.parse(a.created_at) - Date.parse(b.created_at))
      }
    })
  }, [activeAlbum, items, albumItems, filter, query, sort, ascending, albumCuratedOrder])

  // Date sorts read as a timeline, so the grid is broken into months.
  const groups = useMemo(() => {
    if (sort === "name" || albumCuratedOrder) {
      return [{ key: "all", label: "", items: displayed }]
    }
    return groupByMonth(displayed, (i) =>
      sort === "captured" ? (i.captured_at ?? i.created_at) : i.created_at
    )
  }, [displayed, sort, albumCuratedOrder])

  const shownTotal = activeAlbum ? displayed.length : total

  // --- Item mutations ------------------------------------------------------------

  const replaceItem = useCallback((updated: MediaItem) => {
    const map = (prev: MediaItem[]) =>
      prev.map((i) => (i.id === updated.id ? updated : i))
    setItems(map)
    setAlbumItems(map)
    setPlaying((p) => (p && p.id === updated.id ? updated : p))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    setAlbumItems((prev) => prev.filter((i) => i.id !== id))
    setTotal((t) => Math.max(0, t - 1))
  }, [])

  const toggleFavorite = useCallback(
    (item: MediaItem) => {
      const next = !item.is_favorite
      // Optimistic flip; revert on failure.
      replaceItem({ ...item, is_favorite: next })
      patchMedia(item.id, { is_favorite: next })
        .then((updated) => {
          replaceItem(updated)
          // The item no longer belongs to a favorites-only server view.
          if (!next && viewRef.current.favOnly && !viewRef.current.activeAlbum) {
            setItems((prev) => prev.filter((i) => i.id !== updated.id))
            setTotal((t) => Math.max(0, t - 1))
          }
        })
        .catch((err: unknown) => {
          replaceItem(item)
          toastError(err, "Couldn't update favorite")
        })
    },
    [replaceItem]
  )

  // --- Albums ------------------------------------------------------------------

  const createAlbum = useCallback(async (name: string) => {
    try {
      const album = await createCollection(name)
      setAlbums((prev) => [...prev, album])
      toast.success(`Created ${album.name}`)
    } catch (err) {
      toastError(err, "Couldn't create album")
      throw err
    }
  }, [])

  const deleteAlbum = useCallback((album: Collection) => {
    deleteCollection(album.id)
      .then(() => {
        setAlbums((prev) => prev.filter((a) => a.id !== album.id))
        setScope((s) =>
          s.kind === "album" && s.album.id === album.id ? { kind: "library" } : s
        )
        toast.success(`Deleted ${album.name}. The media in it is still in your library.`)
      })
      .catch((err: unknown) => toastError(err, "Couldn't delete album"))
  }, [])

  const removeFromAlbum = useCallback((item: MediaItem) => {
    const album = viewRef.current.activeAlbum
    if (!album) return
    removeFromCollection(album.id, item.id)
      .then(() => {
        setAlbumItems((prev) => prev.filter((i) => i.id !== item.id))
        setPlaying(null)
        toast.success(`Removed from ${album.name}`)
      })
      .catch((err: unknown) => toastError(err, "Couldn't remove from album"))
  }, [])

  // --- Live processing events ------------------------------------------------

  const onEvent = useCallback((evt: MediaEvent) => {
    setLive((prev) => ({ ...prev, [evt.media_id]: evt }))

    if (evt.status === "completed") {
      // Pull the finished item (thumbnail, metadata, HLS path) and swap it in.
      getMedia(evt.media_id)
        .then((item) => {
          const swap = (prev: MediaItem[]) =>
            prev.some((i) => i.id === item.id)
              ? prev.map((i) => (i.id === item.id ? item : i))
              : prev
          setItems(swap)
          setAlbumItems(swap)
          setLive((prev) => {
            const next = { ...prev }
            delete next[evt.media_id]
            return next
          })
        })
        .catch(() => {
          setLive((prev) => {
            const next = { ...prev }
            delete next[evt.media_id]
            return next
          })
        })
    } else if (evt.status === "failed") {
      const markFailed = (prev: MediaItem[]) =>
        prev.map((i) =>
          i.id === evt.media_id ? { ...i, status: "failed" as const } : i
        )
      setItems(markFailed)
      setAlbumItems(markFailed)
      toast.error(
        `Couldn't process ${evt.title ?? "a file"}`,
        evt.error ? { description: evt.error } : undefined
      )
    }
  }, [])

  const connected = useMediaEvents(true, onEvent)

  // --- Uploads -----------------------------------------------------------------

  const startUploads = useCallback((files: File[]) => {
    for (const file of files) {
      const key = crypto.randomUUID()
      const controller = new AbortController()
      let lastPaint = 0

      setUploads((prev) => [
        ...prev,
        {
          key,
          name: file.name,
          size: file.size,
          sentBytes: 0,
          percent: 0,
          abort: () => controller.abort(),
        },
      ])

      uploadFile(
        file,
        (p) => {
          // XHR progress fires very frequently; repaint at most ~8×/second.
          const now = performance.now()
          if (p.percent < 100 && now - lastPaint < 120) return
          lastPaint = now
          setUploads((prev) =>
            prev.map((u) =>
              u.key === key
                ? { ...u, sentBytes: p.sentBytes, percent: p.percent }
                : u
            )
          )
        },
        controller.signal
      )
        .then((item) => {
          setUploads((prev) => prev.filter((u) => u.key !== key))
          setLive((prev) => ({
            ...prev,
            [item.id]: {
              media_id: item.id,
              status: "queued",
              progress: 0,
            },
          }))
          // A new upload is never a favorite and never matches a search it
          // wasn't titled for, so only show it where the server would too.
          const v = viewRef.current
          if (
            !v.activeAlbum &&
            !v.favOnly &&
            !v.query &&
            (v.filter === "" || v.filter === item.type)
          ) {
            setItems((prev) =>
              prev.some((i) => i.id === item.id) ? prev : [item, ...prev]
            )
            setTotal((t) => t + 1)
          }
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") {
            setUploads((prev) => prev.filter((u) => u.key !== key))
            return
          }
          const msg = err instanceof Error ? err.message : "Upload failed"
          setUploads((prev) =>
            prev.map((u) => (u.key === key ? { ...u, error: msg } : u))
          )
        })
    }
  }, [])

  const dismissUpload = useCallback((key: string) => {
    setUploads((prev) => prev.filter((u) => u.key !== key))
  }, [])

  // --- Player navigation ----------------------------------------------------------

  const playable = useMemo(
    () => displayed.filter((i) => i.status === "ready"),
    [displayed]
  )
  const playingIndex = playing
    ? playable.findIndex((i) => i.id === playing.id)
    : -1
  const onPrev =
    playingIndex > 0 ? () => setPlaying(playable[playingIndex - 1]) : undefined
  const onNext =
    playingIndex >= 0 && playingIndex < playable.length - 1
      ? () => setPlaying(playable[playingIndex + 1])
      : undefined

  // --- Render --------------------------------------------------------------------

  const directionLabels =
    sort === "name"
      ? { desc: "Z to A", asc: "A to Z" }
      : { desc: "Newest first", asc: "Oldest first" }

  const title = activeAlbum ? activeAlbum.name : favOnly ? "Favorites" : "Library"

  const empty = query
    ? { heading: `Nothing matches “${query}”`, body: "Search looks at titles. Try a shorter word." }
    : activeAlbum
      ? { heading: "This album is empty", body: "Open a photo, video or track and choose Add to album." }
      : favOnly
        ? { heading: "No favorites yet", body: "Use the heart on anything you want to find quickly." }
        : filter
          ? { heading: `No ${FILTERS.find((f) => f.value === filter)?.label.toLowerCase()} yet`, body: "Upload some, or drop files anywhere on this page." }
          : { heading: "Start your library", body: "Upload photos, videos and music, or drop files anywhere on this page. Videos are prepared for streaming after upload." }

  return (
    <div className="min-h-svh bg-canvas">
      <Sidebar
        scope={scope}
        onScope={setScope}
        albums={albums}
        onCreateAlbum={createAlbum}
        onDeleteAlbum={deleteAlbum}
        user={user}
        onLogout={onLogout}
        connected={connected}
      />

      <main className="px-4 pb-24 md:ml-60 md:px-8">
        <div className="sticky top-0 z-30 -mx-4 flex flex-wrap items-center gap-x-4 gap-y-3 bg-canvas/95 px-4 pt-5 pb-3 backdrop-blur md:-mx-8 md:px-8 md:pt-7">
          <div className="mr-auto flex items-baseline gap-3">
            <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] md:text-3xl">
              {title}
            </h1>
            <span className="text-sm text-muted-foreground tabular-nums">
              {shownTotal} {shownTotal === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search titles"
                aria-label="Search titles"
                className="h-9 w-full pl-8 sm:w-56"
              />
              {searchInput && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchInput("")}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>
            <UploadButton onFiles={startUploads} />
          </div>

          <div className="flex w-full items-center gap-3">
            <div role="radiogroup" aria-label="Media type" className="flex gap-1">
              {FILTERS.map(({ value, label }) => (
                <button
                  key={value || "all"}
                  type="button"
                  role="radio"
                  aria-checked={filter === value}
                  onClick={() => setFilter(value)}
                  className={cn(
                    "h-8 rounded-full px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    filter === value
                      ? "bg-foreground font-medium text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-auto h-8 text-muted-foreground">
                  <ArrowUpDownIcon className="size-4" />
                  <span className="hidden sm:inline">
                    {SORT_LABELS[sort]}, {directionLabels[ascending ? "asc" : "desc"].toLowerCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={sort}
                  onValueChange={(v) => setSort(v as MediaSort)}
                >
                  <DropdownMenuRadioItem value="added">Date added</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="captured">Date taken</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={ascending ? "asc" : "desc"}
                  onValueChange={(v) => setAscending(v === "asc")}
                >
                  <DropdownMenuRadioItem value="desc">{directionLabels.desc}</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="asc">{directionLabels.asc}</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8">
            {Array.from({ length: 18 }, (_, i) => (
              <Skeleton key={i} className="aspect-square rounded-md" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="mt-24 max-w-md">
            <h2 className="font-heading text-2xl font-bold tracking-[-0.01em]">
              {empty.heading}
            </h2>
            <p className="mt-2 text-muted-foreground">{empty.body}</p>
            {!query && !activeAlbum && !favOnly && (
              <div className="mt-6">
                <UploadButton onFiles={startUploads} />
              </div>
            )}
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label || undefined} className="mt-6">
                {group.label && (
                  <h2 className="mb-3 font-heading text-xl font-semibold tracking-[-0.01em]">
                    {group.label}
                  </h2>
                )}
                <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8">
                  {group.items.map((item) => (
                    <MediaCard
                      key={item.id}
                      item={item}
                      live={live[item.id]}
                      onOpen={setPlaying}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              </section>
            ))}

            {!activeAlbum && items.length < total && (
              <div className="mt-8 flex justify-center">
                <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore && <Loader2Icon className="size-4 animate-spin" />}
                  Show {Math.min(PAGE_SIZE, total - items.length)} more
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <WindowDropTarget onFiles={startUploads} />
      <UploadTray uploads={uploads} onDismiss={dismissUpload} />

      <PlayerDialog
        item={playing}
        onClose={() => setPlaying(null)}
        onDeleted={removeItem}
        onUpdated={replaceItem}
        onPrev={onPrev}
        onNext={onNext}
        albums={albums}
        activeAlbum={activeAlbum}
        onRemoveFromAlbum={removeFromAlbum}
      />
    </div>
  )
}
