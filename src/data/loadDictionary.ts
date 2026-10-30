import {
  buildDictionaryIndex,
  type DictionaryIndex,
  type DictionaryTuple,
} from '@/engines/dictionary'

let cached: Promise<DictionaryIndex> | null = null

/**
 * Fetches the bundled CMU dictionary (public/data/dictionary.json, ~1.4MB
 * gzipped) and builds the in-memory lookup index. Fetched once per session
 * and cached — this is a same-origin static asset, not a network dependency,
 * so lookups work offline after this resource has loaded successfully.
 */
export function loadDictionary(): Promise<DictionaryIndex> {
  if (!cached) {
    cached = fetch(`${import.meta.env.BASE_URL}data/dictionary.json`)
      .then((res) => {
        if (res.ok === false) throw new Error(`Resource unavailable (HTTP ${res.status}).`)
        return res.json() as Promise<DictionaryTuple[]>
      })
      .then(buildDictionaryIndex)
      .catch((error: unknown) => {
        cached = null
        throw error
      })
  }
  return cached
}
