import { describe, expect, it } from "vitest"

import { formatBytes, formatDuration } from "./api"

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [1023, "1023 B"],
    [1024, "1.0 KB"],
    [100 * 1024, "100 KB"],
  ])("formats %i bytes", (input, expected) => {
    expect(formatBytes(input)).toBe(expected)
  })
})

describe("formatDuration", () => {
  it.each([
    [0, ""],
    [undefined, ""],
    [59.6, "1:00"],
    [3600, "1:00:00"],
    [3661, "1:01:01"],
  ])("formats %s seconds", (input, expected) => {
    expect(formatDuration(input)).toBe(expected)
  })
})
