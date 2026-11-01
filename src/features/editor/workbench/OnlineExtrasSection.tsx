import { useEffect, useState } from 'react'
import { useSettings } from '@/engines/useSettings'
import { DatamuseError } from '@/engines/datamuseClient'

interface OnlineExtrasSectionProps {
  word: string
  title: string
  fetcher: (word: string, signal?: AbortSignal) => Promise<string[]>
  exclude: Set<string>
  onInsert: (word: string) => void
}

/** Shown under a tab's offline results — a clearly-labeled, opt-in Datamuse
 * lookup (see Settings > "Online extras") for words the bundled dictionary
 * doesn't cover. Fetches nothing unless the setting is on. */
export function OnlineExtrasSection({
  word,
  title,
  fetcher,
  exclude,
  onInsert,
}: OnlineExtrasSectionProps) {
  const { settings } = useSettings()
  const [result, setResult] = useState<{ word: string; words: string[] | null; error: string }>({
    word: '',
    words: null,
    error: '',
  })
  useEffect(() => {
    if (!settings.onlineExtrasEnabled || !word) return
    const controller = new AbortController()
    let active = true
    const timeout = setTimeout(() => controller.abort(), 15_000)
    const debounce = setTimeout(() => {
      void fetcher(word, controller.signal)
        .then((words) => {
          if (active) setResult({ word, words, error: '' })
        })
        .catch((reason) => {
          if (active)
            setResult({
              word,
              words: null,
              error: controller.signal.aborted
                ? 'Lookup timed out. Select the word again to retry.'
                : reason instanceof DatamuseError
                  ? reason.message
                  : 'Could not complete the lookup.',
            })
        })
        .finally(() => clearTimeout(timeout))
    }, 250)
    return () => {
      active = false
      clearTimeout(debounce)
      clearTimeout(timeout)
      controller.abort()
    }
  }, [word, settings.onlineExtrasEnabled, fetcher])
  const words = result.word === word ? result.words : null
  const error = result.word === word ? result.error : ''

  if (!settings.onlineExtrasEnabled) return null

  const filtered = (words ?? []).filter((w) => !exclude.has(w))

  return (
    <div className="border-t border-canvas-line pt-3">
      <p className="mb-1 text-xs font-medium text-ink/40">{title}</p>
      {error ? (
        <p className="text-xs text-berry">{error}</p>
      ) : words === null ? (
        <p className="text-xs text-ink/40">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-ink/40">Nothing extra from Datamuse.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {filtered.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => onInsert(w)}
              className="rounded-full border border-canvas-line bg-canvas px-2.5 py-0.5 text-sm text-ink hover:border-indigo hover:text-indigo"
            >
              {w}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
