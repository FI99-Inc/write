import { useEffect, useMemo, useState } from 'react'
import { loadThesaurus } from '@/data/loadThesaurus'
import { fetchDatamuseSimilarMeaning } from '@/engines/datamuseClient'
import { OnlineExtrasSection } from '@/features/editor/workbench/OnlineExtrasSection'

interface ThesaurusTabProps {
  word: string
  onInsert: (word: string) => void
}

export function ThesaurusTab({ word, onInsert }: ThesaurusTabProps) {
  const [attempt, setAttempt] = useState(0)
  const [lookup, setLookup] = useState<{
    word: string
    attempt: number
    synonyms: string[] | null
    error: string
  }>({ word: '', attempt: -1, synonyms: null, error: '' })
  const current = lookup.word === word && lookup.attempt === attempt
  const synonyms = current ? lookup.synonyms : null
  const error = current ? lookup.error : ''
  const localMatches = useMemo(() => new Set(synonyms ?? []), [synonyms])
  useEffect(() => {
    if (!word) return
    let cancelled = false
    const timer = setTimeout(() => {
      void loadThesaurus()
        .then((thesaurus) => {
          if (!cancelled)
            setLookup({ word, attempt, synonyms: thesaurus.get(word) ?? [], error: '' })
        })
        .catch(() => {
          if (!cancelled)
            setLookup({ word, attempt, synonyms: null, error: 'Could not load the thesaurus.' })
        })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [word, attempt])

  if (!word) {
    return (
      <p className="text-sm text-ink/40">Click into a line to see synonyms for its last word.</p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/50">
        Synonyms for <span className="font-medium text-ink">{word}</span>
      </p>
      {error ? (
        <p role="alert" className="text-sm text-berry">
          {error}{' '}
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="underline"
          >
            Retry
          </button>
        </p>
      ) : synonyms === null ? (
        <p className="text-sm text-ink/40">Loading thesaurus…</p>
      ) : synonyms.length === 0 ? (
        <p className="text-sm text-ink/40">No entries found.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {synonyms.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onInsert(s)}
              className="rounded-full border border-canvas-line bg-canvas px-2.5 py-0.5 text-sm text-ink hover:border-indigo hover:text-indigo"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <OnlineExtrasSection
        word={word}
        title="More synonyms (Datamuse, online)"
        fetcher={fetchDatamuseSimilarMeaning}
        exclude={localMatches}
        onInsert={onInsert}
      />
      <p className="pt-2 text-xs text-ink/30">
        Moby Thesaurus lists related words, not strict antonyms — none are shown separately because
        the source data doesn&rsquo;t mark them.
      </p>
    </div>
  )
}
