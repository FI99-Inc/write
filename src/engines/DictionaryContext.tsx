import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { loadWritingTools } from '@/data/loadWritingTools'
import { loadOverrideIndex } from '@/db/overrides'
import type { RhymeIndex } from '@/engines/rhymeIndex'
import type { DictionaryIndex } from '@/engines/dictionary'
import { DictionaryContext, EMPTY_OVERRIDES } from '@/engines/useDictionary'

export function DictionaryProvider({ children }: { children: ReactNode }) {
  const [resources, setResources] = useState<{
    dict: DictionaryIndex
    rhymeIndex: RhymeIndex
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const overrides = useLiveQuery(() => loadOverrideIndex(), [])
  useEffect(() => {
    let cancelled = false
    // Index outside render, after the loading surface has had a chance to paint.
    const timer = setTimeout(() => {
      setError(null)
      void loadWritingTools()
        .then((loaded) => {
          if (!cancelled) setResources(loaded)
        })
        .catch(() => {
          if (!cancelled)
            setError('Could not load the writing dictionary. Check your connection and retry.')
        })
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [attempt])
  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const value = useMemo(
    () => ({
      dict: resources?.dict ?? null,
      rhymeIndex: resources?.rhymeIndex ?? null,
      overrides: overrides ?? EMPTY_OVERRIDES,
      loading: !resources && !error,
      error,
      retry,
    }),
    [resources, overrides, error, retry],
  )
  return <DictionaryContext.Provider value={value}>{children}</DictionaryContext.Provider>
}
