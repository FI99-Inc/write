import type { Poem, PoemStatus } from '@/types/poem'
import type { Snapshot } from '@/types/snapshot'
import { extractWords } from '@/engines/normalize'
import { isStopword } from '@/engines/stopwords'

export function countByStatus(poems: Poem[]): Record<PoemStatus, number> {
  const counts: Record<PoemStatus, number> = { idea: 0, draft: 0, revising: 0, done: 0 }
  for (const poem of poems) {
    counts[poem.status ?? 'draft']++
  }
  return counts
}

/** formId -> poem count. Untracked poems (no form) are grouped under "none". */
export function countByForm(poems: Poem[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const poem of poems) {
    const key = poem.formId ?? 'none'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

export function totalWords(poems: Poem[]): number {
  return poems.reduce((sum, poem) => sum + extractWords(poem.body).length, 0)
}

export interface WordFrequency {
  word: string
  count: number
}

/** Most-used words across every poem, stopwords excluded, most frequent
 * first (ties broken alphabetically for a stable order). */
export function mostUsedWords(poems: Poem[], limit = 20): WordFrequency[] {
  const counts = new Map<string, number>()
  for (const poem of poems) {
    for (const word of extractWords(poem.body)) {
      if (isStopword(word)) continue
      counts.set(word, (counts.get(word) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, limit)
}

export function toDateKey(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Every poem's creation and last-modified day, plus every snapshot's day —
 * the closest approximation of "days with writing activity" the data
 * supports (there's no continuous edit log beyond that). */
export function collectActivityTimestamps(
  poems: Poem[],
  snapshots: Pick<Snapshot, 'createdAt'>[],
): number[] {
  const timestamps: number[] = []
  for (const poem of poems) {
    timestamps.push(poem.createdAt, poem.modifiedAt)
  }
  for (const snapshot of snapshots) {
    timestamps.push(snapshot.createdAt)
  }
  return timestamps
}

/** Date string ("YYYY-MM-DD") -> number of activity events that day, for
 * the calendar heatmap. */
export function computeActivityHeatmap(timestamps: number[]): Map<string, number> {
  const heatmap = new Map<string, number>()
  for (const timestamp of timestamps) {
    const key = toDateKey(timestamp)
    heatmap.set(key, (heatmap.get(key) ?? 0) + 1)
  }
  return heatmap
}

/** Consecutive days of activity ending today — if today has no activity
 * yet, that alone doesn't break an ongoing streak (today just hasn't
 * happened yet), so the count starts from yesterday in that case. */
export function currentStreak(heatmap: Map<string, number>, today: Date = new Date()): number {
  const cursor = new Date(today)
  if (!heatmap.has(toDateKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (heatmap.has(toDateKey(cursor.getTime()))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
