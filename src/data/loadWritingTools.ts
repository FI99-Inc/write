import { loadDictionary } from '@/data/loadDictionary'
import { buildRhymeIndex } from '@/engines/rhymeIndex'

let cached: ReturnType<typeof buildTools> | null = null
async function buildTools() {
  const dict = await loadDictionary()
  return { dict, rhymeIndex: buildRhymeIndex(dict) }
}
export function loadWritingTools() {
  if (!cached)
    cached = buildTools().catch((error: unknown) => {
      cached = null
      throw error
    })
  return cached
}
