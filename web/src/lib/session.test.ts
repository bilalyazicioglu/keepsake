import { assert, afterEach, beforeEach, test, vi } from "vitest"
import { getToken, getStoredUser, storeSession, clearSession } from "./api"

const user = { id: "user-id", username: "alice", role: "user", created_at: "2026-09-30" }
beforeEach(() => { vi.stubGlobal("localStorage", new MapStorage()) })
afterEach(() => { vi.unstubAllGlobals() })
class MapStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, String(value)) }
  removeItem(key: string) { this.values.delete(key) }
}

test("legacy sessions migrate and remain available on subsequent reads", () => {
  localStorage.setItem("oom_token", "legacy-token")
  localStorage.setItem("oom_user", JSON.stringify(user))
  assert.strictEqual(getToken(), "legacy-token")
  assert.deepEqual(getStoredUser(), user)
  assert.strictEqual(localStorage.getItem("keepsake_token"), "legacy-token")
  assert.strictEqual(localStorage.getItem("keepsake_user"), JSON.stringify(user))
  assert.strictEqual(localStorage.getItem("oom_token"), null)
  assert.strictEqual(localStorage.getItem("oom_user"), null)
  assert.strictEqual(getToken(), "legacy-token")
  assert.deepEqual(getStoredUser(), user)
})

test("new sessions take precedence over stale legacy values", () => {
  storeSession("new-token", user)
  localStorage.setItem("oom_token", "stale-token")
  localStorage.setItem("oom_user", JSON.stringify({ ...user, username: "stale" }))
  assert.strictEqual(getToken(), "new-token")
  assert.deepEqual(getStoredUser(), user)
  assert.strictEqual(localStorage.getItem("oom_token"), null)
  assert.strictEqual(localStorage.getItem("oom_user"), null)
})

test("storing a session clears legacy credentials", () => {
  localStorage.setItem("oom_token", "legacy-token")
  localStorage.setItem("oom_user", JSON.stringify(user))
  storeSession("new-token", user)
  assert.strictEqual(getToken(), "new-token")
  assert.deepEqual(getStoredUser(), user)
  assert.strictEqual(localStorage.getItem("oom_token"), null)
  assert.strictEqual(localStorage.getItem("oom_user"), null)
})

test("logout clears both key sets before or after migration", () => {
  for (const migrate of [false, true]) {
    localStorage.setItem("oom_token", "legacy-token")
    localStorage.setItem("oom_user", JSON.stringify(user))
    if (migrate) { getToken(); getStoredUser() }
    clearSession()
    assert.strictEqual(getToken(), null)
    assert.strictEqual(getStoredUser(), null)
    for (const key of ["oom_token", "oom_user", "keepsake_token", "keepsake_user"]) {
      assert.strictEqual(localStorage.getItem(key), null)
    }
  }
})

test("missing and malformed user data return null", () => {
  assert.strictEqual(getToken(), null)
  assert.strictEqual(getStoredUser(), null)
  localStorage.setItem("oom_user", "invalid JSON")
  assert.strictEqual(getStoredUser(), null)
})
