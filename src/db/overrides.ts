import { db } from '@/db/schema'
import type { OverrideIndex, WordOverride } from '@/types/override'

/** Records (or replaces) a poet's correction for a word. Passing only one of
 * `syllables`/`stressPattern` leaves the other field as previously stored. */
export async function setOverride(
  word: string,
  changes: Partial<Omit<WordOverride, 'word'>>,
): Promise<void> {
  if (
    changes.syllables !== undefined &&
    (!Number.isInteger(changes.syllables) || changes.syllables < 0 || changes.syllables > 100)
  )
    throw new Error('Use a whole syllable count between 0 and 100.')
  if (
    changes.stressPattern !== undefined &&
    (!/^[01]*$/.test(changes.stressPattern) || changes.stressPattern.length > 100)
  )
    throw new Error('Use a stress pattern of at most 100 zeroes and ones.')
  const normalized = word.toLowerCase()
  const existing = await db.wordOverrides.get(normalized)
  await db.wordOverrides.put({ ...existing, ...changes, word: normalized })
}

export async function getOverride(word: string): Promise<WordOverride | null> {
  const override = await db.wordOverrides.get(word.toLowerCase())
  return override ?? null
}

export function listOverrides(): Promise<WordOverride[]> {
  return db.wordOverrides.toArray()
}

export async function deleteOverride(word: string): Promise<void> {
  await db.wordOverrides.delete(word.toLowerCase())
}

/** Loads all stored overrides into the Map shape the engines expect. */
export async function loadOverrideIndex(): Promise<OverrideIndex> {
  const overrides = await listOverrides()
  return new Map(
    overrides.map((override) => [
      override.word,
      {
        ...override,
        syllables:
          typeof override.syllables === 'number' &&
          Number.isFinite(override.syllables) &&
          override.syllables >= 0 &&
          override.syllables <= 100
            ? override.syllables
            : undefined,
        stressPattern:
          typeof override.stressPattern === 'string' &&
          /^[01]*$/.test(override.stressPattern) &&
          override.stressPattern.length <= 100
            ? override.stressPattern
            : undefined,
      },
    ]),
  )
}
