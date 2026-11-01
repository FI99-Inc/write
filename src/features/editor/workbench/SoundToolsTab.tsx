import { useMemo } from 'react'
import { useDictionary } from '@/engines/useDictionary'
import { findSoundMatches } from '@/engines/soundTools'

interface SoundToolsTabProps {
  word: string
  poemWords: Set<string>
  onInsert: (word: string) => void
}

function MatchRow({
  label,
  words,
  onInsert,
}: {
  label: string
  words: string[]
  onInsert: (w: string) => void
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-ink/40">{label}</p>
      {words.length === 0 ? (
        <p className="text-sm text-ink/40">None found in this poem.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {words.map((w) => (
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

export function SoundToolsTab({ word, poemWords, onInsert }: SoundToolsTabProps) {
  const { dict } = useDictionary()

  const matches = useMemo(() => {
    if (!dict || !word) return { alliteration: [], assonance: [], consonance: [] }
    return findSoundMatches(word, poemWords, dict)
  }, [word, poemWords, dict])

  if (!dict) return <p className="text-sm text-ink/40">Loading dictionary…</p>
  if (!word)
    return (
      <p className="text-sm text-ink/40">
        Click into a line to find sound patterns for its last word.
      </p>
    )

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink/50">
        Sound matches within this poem for <span className="font-medium text-ink">{word}</span>
      </p>
      <MatchRow
        label="Alliteration (shared initial sound)"
        words={matches.alliteration}
        onInsert={onInsert}
      />
      <MatchRow
        label="Assonance (shared vowel sound)"
        words={matches.assonance}
        onInsert={onInsert}
      />
      <MatchRow
        label="Consonance (shared consonant sound)"
        words={matches.consonance}
        onInsert={onInsert}
      />
    </div>
  )
}
