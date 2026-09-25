import { useState, type FormEvent, type ReactNode } from "react"
import {
  HeartIcon,
  LibraryIcon,
  Loader2Icon,
  LogOutIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

import type { Collection, User } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Wordmark } from "@/components/logo"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

/** Which set of media the grid shows: everything, favorites, or one album. */
export type Scope =
  | { kind: "library" }
  | { kind: "favorites" }
  | { kind: "album"; album: Collection }

interface SidebarProps {
  scope: Scope
  onScope: (scope: Scope) => void
  albums: Collection[]
  onCreateAlbum: (name: string) => Promise<void>
  onDeleteAlbum: (album: Collection) => void
  user: User
  onLogout: () => void
  connected: boolean
}

/**
 * Left rail on wide screens; on phones it folds into a top bar with a
 * horizontally scrolling list of the same destinations.
 */
export function Sidebar({
  scope,
  onScope,
  albums,
  onCreateAlbum,
  onDeleteAlbum,
  user,
  onLogout,
  connected,
}: SidebarProps) {
  const activeAlbumId = scope.kind === "album" ? scope.album.id : null

  return (
    <aside className="flex flex-col gap-3 border-b border-border bg-canvas px-4 pt-3 pb-2 md:fixed md:inset-y-0 md:left-0 md:w-60 md:gap-6 md:border-r md:border-b-0 md:px-3 md:py-5">
      <div className="flex items-center justify-between md:px-2">
        <Wordmark />
        <AccountMenu
          user={user}
          onLogout={onLogout}
          connected={connected}
          className="md:hidden"
        />
      </div>

      <nav
        aria-label="Library"
        className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-1 md:flex-col md:overflow-x-visible md:overflow-y-auto md:px-0"
      >
        <NavItem
          active={scope.kind === "library"}
          onClick={() => onScope({ kind: "library" })}
          icon={<LibraryIcon />}
        >
          Library
        </NavItem>
        <NavItem
          active={scope.kind === "favorites"}
          onClick={() => onScope({ kind: "favorites" })}
          icon={<HeartIcon />}
        >
          Favorites
        </NavItem>

        <h2 className="mt-5 mb-1 hidden px-2 font-heading text-sm font-semibold text-muted-foreground md:block">
          Albums
        </h2>
        <span aria-hidden className="mx-1 w-px shrink-0 bg-border md:hidden" />

        {albums.map((album) => (
          <AlbumItem
            key={album.id}
            album={album}
            active={album.id === activeAlbumId}
            onSelect={() => onScope({ kind: "album", album })}
            onDelete={() => onDeleteAlbum(album)}
          />
        ))}
        <NewAlbum onCreate={onCreateAlbum} />
      </nav>

      <AccountMenu
        user={user}
        onLogout={onLogout}
        connected={connected}
        className="hidden md:flex"
      />
    </aside>
  )
}

function NavItem({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 shrink-0 items-center gap-2.5 rounded-md px-2.5 text-sm whitespace-nowrap transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_svg]:size-4 [&_svg]:shrink-0",
        active
          ? "bg-secondary font-medium text-foreground [&_svg]:text-ember"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function AlbumItem({
  album,
  active,
  onSelect,
  onDelete,
}: {
  album: Collection
  active: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="group/album relative flex shrink-0 items-center">
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-9 w-full min-w-0 items-center rounded-md px-2.5 text-left text-sm whitespace-nowrap transition-colors md:pr-9",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          active
            ? "bg-secondary font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <span className="truncate">{album.name}</span>
      </button>
      {active && (
        <button
          type="button"
          aria-label={confirming ? `Confirm deleting ${album.name}` : `Delete ${album.name}`}
          title={confirming ? "Click again to delete" : "Delete album"}
          onClick={() => {
            if (confirming) {
              setConfirming(false)
              onDelete()
            } else {
              setConfirming(true)
            }
          }}
          onBlur={() => setConfirming(false)}
          className={cn(
            "ml-1 flex h-7 items-center gap-1 rounded px-1.5 text-xs transition-colors md:absolute md:right-1 md:ml-0",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            confirming
              ? "bg-destructive/15 text-destructive"
              : "text-muted-foreground hover:text-destructive"
          )}
        >
          <Trash2Icon className="size-3.5" />
          {confirming && "Delete"}
        </button>
      )}
    </div>
  )
}

function NewAlbum({ onCreate }: { onCreate: (name: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    try {
      await onCreate(trimmed)
      setName("")
      setOpen(false)
    } catch {
      // onCreate already reported the error; keep the form open to retry.
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 shrink-0 items-center gap-2 rounded-md px-2.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <PlusIcon className="size-4" />
        New album
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="flex shrink-0 items-center gap-1 py-0.5">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="Album name"
        aria-label="Album name"
        maxLength={128}
        className="h-8 w-40 md:w-full"
      />
      <Button type="submit" size="sm" className="h-8" disabled={busy}>
        {busy ? <Loader2Icon className="size-3.5 animate-spin" /> : "Create"}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8 shrink-0"
        aria-label="Cancel"
        onClick={() => {
          setOpen(false)
          setName("")
        }}
      >
        <XIcon className="size-4" />
      </Button>
    </form>
  )
}

function AccountMenu({
  user,
  onLogout,
  connected,
  className,
}: {
  user: User
  onLogout: () => void
  connected: boolean
  className?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "items-center gap-2.5 rounded-md p-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:px-2",
            className
          )}
        >
          <span className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-xs font-bold uppercase">
            {user.username.slice(0, 1)}
            <span
              title={connected ? "Live updates connected" : "Reconnecting"}
              className={cn(
                "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-canvas",
                connected ? "bg-emerald-400" : "bg-muted-foreground"
              )}
            />
          </span>
          <span className="hidden min-w-0 flex-1 truncate md:block">
            {user.username}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-52">
        <DropdownMenuLabel className="font-normal text-muted-foreground">
          {connected
            ? "Processing updates are live"
            : "Reconnecting for live updates"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>
          <LogOutIcon className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
