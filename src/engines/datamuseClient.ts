export class DatamuseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatamuseError'
  }
}

interface DatamuseWord {
  word: string
}

const cache = new Map<string, { words: string[]; expiresAt: number }>()

async function fetchDatamuse(query: string, signal?: AbortSignal): Promise<string[]> {
  const cached = cache.get(query)
  if (cached && cached.expiresAt > Date.now()) return cached.words
  let response: Response
  try {
    const url = `https://api.datamuse.com/words?${query}`
    response = await (signal ? fetch(url, { signal }) : fetch(url))
  } catch {
    throw new DatamuseError("Couldn't reach Datamuse — check your internet connection.")
  }
  if (!response.ok) {
    throw new DatamuseError(`Datamuse responded with an error (HTTP ${response.status}).`)
  }
  try {
    const data = (await response.json()) as DatamuseWord[]
    const words = data.map((entry) => entry.word)
    if (cache.size >= 200) cache.delete(cache.keys().next().value!)
    cache.set(query, { words, expiresAt: Date.now() + 300_000 })
    return words
  } catch {
    throw new DatamuseError('Datamuse returned a response this app could not understand.')
  }
}

/** Perfect + near rhymes from Datamuse's own rhyme index, merged and
 * deduplicated — a keyless, free supplement to the bundled CMU dictionary
 * for words it doesn't cover, or words coined/used since. */
export async function fetchDatamuseRhymes(word: string, signal?: AbortSignal): Promise<string[]> {
  const [perfect, near] = await Promise.all([
    fetchDatamuse(`rel_rhy=${encodeURIComponent(word)}&max=25`, signal),
    fetchDatamuse(`rel_nry=${encodeURIComponent(word)}&max=25`, signal),
  ])
  return Array.from(new Set([...perfect, ...near]))
}

/** Words with a related meaning ("means like") — Datamuse's nearest analog
 * to a thesaurus lookup. */
export function fetchDatamuseSimilarMeaning(word: string, signal?: AbortSignal): Promise<string[]> {
  return fetchDatamuse(`ml=${encodeURIComponent(word)}&max=25`, signal)
}
