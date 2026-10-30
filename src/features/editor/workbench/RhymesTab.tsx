import { useMemo } from 'react'
import { useDictionary } from '@/engines/useDictionary'
import { findRhymesIndexed } from '@/engines/rhymeIndex'
import { countSyllables } from '@/engines/syllables'
import type { DictionaryIndex } from '@/engines/dictionary'
import { fetchDatamuseRhymes } from '@/engines/datamuseClient'
import { OnlineExtrasSection } from '@/features/editor/workbench/OnlineExtrasSection'

interface RhymesTabProps {
  word: string
  onInsert: (word: string) => void
}

function groupBySyllableCount(words: string[], dict: DictionaryIndex) {
  const groups = new Map<number, string[]>()
  for (const word of words) {
    const count = countSyllables(word, dict)
    const list = groups.get(count)
    if (list) list.push(word)
    else groups.set(count, [word])
  }
  return Array.from(groups.entries()).sort((a, b) => a[0] - b[0])
}

function WordGroup({
  title,
  words,
  dict,
  onInsert,
}: {
  title: string
  words: string[]
  dict: DictionaryIndex
  onInsert: (w: string) => void
}) {
  if (words.length === 0) {
    return (
      <div>
        <p className="mb-1 text-xs font-medium text-ink/40">{title}</p>
        <p className="text-sm text-ink/40">No matches yet.</p>
      </div>
    )
  }

  const groups = groupBySyllableCount(words, dict)

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-ink/40">{title}</p>
      <div className="space-y-2">
        {groups.map(([count, groupWords]) => (
          <div key={count}>
            <p className="text-[11px] text-ink/35">
              {count} syllable{count === 1 ? '' : 's'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {groupWords.map((w) => (
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
          </div>
        ))}
      </div>
    </div>
  )
}

export function RhymesTab({ word, onInsert }: RhymesTabProps) {
  const { dict, rhymeIndex } = useDictionary()

  const rhymes = useMemo(() => {
    if (!dict || !rhymeIndex || !word) return { perfect: [], slant: [] }
    return findRhymesIndexed(word, dict, rhymeIndex)
  }, [word, dict, rhymeIndex])

  const localMatches = useMemo(() => new Set([...rhymes.perfect, ...rhymes.slant]), [rhymes])

  if (!dict) return <p className="text-sm text-ink/40">Loading dictionary…</p>
  if (!word)
    return <p className="text-sm text-ink/40">Click into a line to see rhymes for its last word.</p>

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink/50">
        Rhymes for <span className="font-medium text-ink">{word}</span>
      </p>
      <WordGroup title="Perfect rhymes" words={rhymes.perfect} dict={dict} onInsert={onInsert} />
      <WordGroup title="Slant rhymes" words={rhymes.slant} dict={dict} onInsert={onInsert} />
      <OnlineExtrasSection
        word={word}
        title="More rhymes (Datamuse, online)"
        fetcher={fetchDatamuseRhymes}
        exclude={localMatches}
        onInsert={onInsert}
      />
    </div>
  )
}
