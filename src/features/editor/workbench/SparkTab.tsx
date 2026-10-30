import { useMemo, useState } from 'react'
import { useDictionary } from '@/engines/useDictionary'
import { dictionaryWordList, randomWord } from '@/engines/randomWord'
import { WRITING_PROMPTS, randomPrompt } from '@/data/prompts'

interface SparkTabProps {
  onInsert: (word: string) => void
}

export function SparkTab({ onInsert }: SparkTabProps) {
  const { dict, error, retry } = useDictionary()
  const words = useMemo(() => (dict ? dictionaryWordList(dict) : []), [dict])

  const [prompt, setPrompt] = useState(() => randomPrompt())
  const [word, setWord] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/40">
          Writing prompt
        </h3>
        <p className="rounded border border-canvas-line bg-canvas px-3 py-3 text-sm leading-relaxed text-ink">
          {prompt}
        </p>
        <button
          type="button"
          onClick={() => setPrompt((current) => randomPrompt(current))}
          className="rounded-full border border-canvas-line px-3 py-1 text-xs text-ink/60 transition-colors hover:border-indigo hover:text-indigo"
        >
          Shuffle prompt
        </button>
        <p className="text-xs text-ink/30">{WRITING_PROMPTS.length} prompts in the deck</p>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/40">Random word</h3>
        {error ? (
          <p role="alert" className="text-sm text-berry">
            {error}{' '}
            <button type="button" className="underline" onClick={retry}>
              Retry
            </button>
          </p>
        ) : !dict ? (
          <p className="text-sm text-ink/40">Loading dictionary…</p>
        ) : (
          <>
            <div className="flex items-center justify-between rounded border border-canvas-line bg-canvas px-3 py-3">
              <span className="text-lg font-medium text-ink">{word ?? '—'}</span>
              {word && (
                <button
                  type="button"
                  onClick={() => onInsert(word)}
                  className="text-xs text-ink/50 hover:text-indigo"
                >
                  Insert
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setWord((current) => randomWord(words, current ?? undefined))}
              className="rounded-full border border-canvas-line px-3 py-1 text-xs text-ink/60 transition-colors hover:border-indigo hover:text-indigo"
            >
              {word ? 'Another word' : 'Spark a word'}
            </button>
          </>
        )}
      </section>
    </div>
  )
}
