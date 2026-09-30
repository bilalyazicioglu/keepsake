import { describe, expect, it } from "vitest"

import { groupByMonth } from "./group-by-month"

describe("groupByMonth", () => {
  it("groups adjacent months without reordering items", () => {
    const items = [
      { id: "a", date: "2024-05-15T12:00:00Z" },
      { id: "b", date: "2024-05-20T12:00:00Z" },
      { id: "c", date: "2024-06-15T12:00:00Z" },
    ]

    const groups = groupByMonth(items, (item) => item.date)

    expect(groups).toHaveLength(2)
    expect(groups[0].key).toBe("2024-4")
    expect(groups[0].items.map((item) => item.id)).toEqual(["a", "b"])
    expect(groups[0].label).toContain("2024")
    expect(groups[1].key).toBe("2024-5")
    expect(groups[1].items.map((item) => item.id)).toEqual(["c"])
  })

  it("keeps repeated non-adjacent months as separate runs", () => {
    const items = [
      { date: "2024-05-01T12:00:00Z" },
      { date: "2024-06-01T12:00:00Z" },
      { date: "2024-05-02T12:00:00Z" },
    ]

    const groups = groupByMonth(items, (item) => item.date)

    expect(groups.map((group) => group.key)).toEqual([
      "2024-4",
      "2024-5",
      "2024-4",
    ])
  })
})
