import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"
import { getToken, getStoredUser, storeSession, clearSession } from "./api.ts"

const user = { id: "user-id", username: "alice", role: "user", created_at: "2026-09-30" }
beforeEach(() => { globalThis.localStorage = new MapStorage() })
class MapStorage {
  values = new Map()
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, String(value)) }
  removeItem(key) { this.values.delete(key) }
}

test("legacy sessions migrate and remain available on subsequent reads", () => {
  localStorage.setItem("oom_token", "legacy-token")
  localStorage.setItem("oom_user", JSON.stringify(user))
  assert.equal(getToken(), "legacy-token")
  assert.deepEqual(getStoredUser(), user)
  assert.equal(localStorage.getItem("keepsake_token"), "legacy-token")
  assert.equal(localStorage.getItem("keepsake_user"), JSON.stringify(user))
  assert.equal(localStorage.getItem("oom_token"), null)
  assert.equal(localStorage.getItem("oom_user"), null)
  assert.equal(getToken(), "legacy-token")
  assert.deepEqual(getStoredUser(), user)
})

test("new sessions take precedence over stale legacy values", () => {
  storeSession("new-token", user)
  localStorage.setItem("oom_token", "stale-token")
  localStorage.setItem("oom_user", JSON.stringify({ ...user, username: "stale" }))
  assert.equal(getToken(), "new-token")
  assert.deepEqual(getStoredUser(), user)
  assert.equal(localStorage.getItem("oom_token"), null)
  assert.equal(localStorage.getItem("oom_user"), null)
})

test("storing a session clears legacy credentials", () => {
  localStorage.setItem("oom_token", "legacy-token")
  localStorage.setItem("oom_user", JSON.stringify(user))
  storeSession("new-token", user)
  assert.equal(getToken(), "new-token")
  assert.deepEqual(getStoredUser(), user)
  assert.equal(localStorage.getItem("oom_token"), null)
  assert.equal(localStorage.getItem("oom_user"), null)
})

test("logout clears both key sets before or after migration", () => {
  for (const migrate of [false, true]) {
    localStorage.setItem("oom_token", "legacy-token")
    localStorage.setItem("oom_user", JSON.stringify(user))
    if (migrate) { getToken(); getStoredUser() }
    clearSession()
    assert.equal(getToken(), null)
    assert.equal(getStoredUser(), null)
    for (const key of ["oom_token", "oom_user", "keepsake_token", "keepsake_user"]) {
      assert.equal(localStorage.getItem(key), null)
    }
  }
})

test("missing and malformed user data return null", () => {
  assert.equal(getToken(), null)
  assert.equal(getStoredUser(), null)
  localStorage.setItem("oom_user", "invalid JSON")
  assert.equal(getStoredUser(), null)
})
