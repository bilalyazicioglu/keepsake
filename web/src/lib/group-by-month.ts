/**
 * Splits an already-sorted list into adjacent runs that share a calendar
 * month. It preserves item order and does not merge non-adjacent months.
 */
export function groupByMonth<T>(
  items: T[],
  dateOf: (item: T) => string
): Array<{ key: string; label: string; items: T[] }> {
  const monthFormat = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  })
  const groups: Array<{ key: string; label: string; items: T[] }> = []
  for (const item of items) {
    const date = new Date(dateOf(item))
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(item)
    else groups.push({ key, label: monthFormat.format(date), items: [item] })
  }
  return groups
}
