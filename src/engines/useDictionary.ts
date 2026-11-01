import { createContext, useContext } from 'react'
import type { DictionaryIndex } from '@/engines/dictionary'
import type { RhymeIndex } from '@/engines/rhymeIndex'
import type { OverrideIndex } from '@/types/override'

interface DictionaryContextValue {
  dict: DictionaryIndex | null
  rhymeIndex: RhymeIndex | null
  overrides: OverrideIndex
  loading: boolean
  error: string | null
  retry: () => void
}
export const EMPTY_OVERRIDES: OverrideIndex = new Map()
export const DictionaryContext = createContext<DictionaryContextValue>({
  dict: null,
  rhymeIndex: null,
  overrides: EMPTY_OVERRIDES,
  loading: true,
  error: null,
  retry: () => {},
})

/** Mount analysis resources only for consumers, never for the library or prose routes. */
export function useDictionary(): DictionaryContextValue {
  return useContext(DictionaryContext)
}
