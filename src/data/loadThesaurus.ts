export type ThesaurusIndex = Map<string, string[]>

let cached: Promise<ThesaurusIndex> | null = null

/**
 * Fetches the bundled Moby Thesaurus II (public/data/thesaurus.json, ~9.4MB
 * gzipped — the full public-domain dataset has no reasonable way to shrink
 * further without losing headwords a poet might actually look up). Loaded
 * lazily, only when a synonym lookup is first requested, so it never
 * competes with the dictionary for initial page-load bandwidth. Cached for
 * the rest of the session once fetched.
 */
export function loadThesaurus(): Promise<ThesaurusIndex> {
  if (!cached) {
    cached = fetch(`${import.meta.env.BASE_URL}data/thesaurus.json`)
      .then((res) => {
        if (res.ok === false) throw new Error(`Resource unavailable (HTTP ${res.status}).`)
        return res.json() as Promise<[string, string[]][]>
      })
      .then((tuples) => new Map(tuples))
      .catch((error: unknown) => {
        cached = null
        throw error
      })
  }
  return cached
}
