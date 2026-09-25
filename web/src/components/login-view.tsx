import { useState, type FormEvent } from "react"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { ApiError, login, register, storeSession, type User } from "@/lib/api"
import { LogoMark } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface LoginViewProps {
  onLogin: (user: User) => void
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  const registering = mode === "register"

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      if (registering) await register(username, password)
      const res = await login(username, password)
      storeSession(res.token, res.user)
      onLogin(res.user)
    } catch (err) {
      // The API answers a bad sign-in with a bare "unauthorized".
      if (err instanceof ApiError && err.status === 401) {
        toast.error("Incorrect username or password")
      } else {
        toast.error(err instanceof Error ? err.message : "Something went wrong")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-canvas px-6 py-10">
      <main className="m-auto w-full max-w-sm">
        <LogoMark className="h-11" />
        <h1 className="mt-8 font-heading text-3xl font-bold tracking-[-0.02em]">
          {registering ? "Create your account" : "Sign in to Keepsake"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {registering
            ? "Accounts live on this server only."
            : "Your photos, videos and music, on your own server."}
        </p>

        <form onSubmit={submit} className="mt-8 grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              autoFocus
              required
              minLength={3}
              maxLength={64}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={registering ? "new-password" : "current-password"}
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={registering ? "password-hint" : undefined}
              className="h-10"
            />
            {registering && (
              <p id="password-hint" className="text-xs text-muted-foreground">
                8 to 72 characters.
              </p>
            )}
          </div>
          <Button type="submit" disabled={busy} className="mt-1 h-10 w-full">
            {busy && <Loader2Icon className="size-4 animate-spin" />}
            {registering ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          {registering ? "Already have an account?" : "New to this server?"}{" "}
          <button
            type="button"
            onClick={() => setMode(registering ? "login" : "register")}
            className="font-medium text-foreground underline decoration-ember underline-offset-4 hover:decoration-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {registering ? "Sign in" : "Create an account"}
          </button>
        </p>
      </main>
    </div>
  )
}
