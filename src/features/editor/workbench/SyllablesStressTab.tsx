import { useMemo, useState } from 'react'
import { useDictionary } from '@/engines/useDictionary'
import { extractWords } from '@/engines/normalize'
import { countSyllables } from '@/engines/syllables'
import { getStressPattern } from '@/engines/stress'

interface WordAnalysis {
  word: string
  syllables: number
  stress: string | null
  phonemes: string[] | null
}

export function SyllablesStressTab() {
  const { dict, overrides } = useDictionary()
  const [input, setInput] = useState('')

  const analysis = useMemo<WordAnalysis[]>(() => {
    if (!dict) return []
    return extractWords(input).map((word) => ({
      word,
      syllables: countSyllables(word, dict, overrides),
      stress: getStressPattern(word, dict, overrides),
      phonemes: dict.get(word)?.phonemes ?? null,
    }))
  }, [input, dict, overrides])

  const totalSyllables = analysis.reduce((sum, a) => sum + a.syllables, 0)

  return (
    <div className="space-y-4">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a word or phrase…"
        className="w-full rounded border border-canvas-line bg-canvas px-3 py-2 text-sm outline-none focus:border-indigo"
      />

      {!dict ? (
        <p className="text-sm text-ink/40">Loading dictionary…</p>
      ) : analysis.length === 0 ? (
        <p className="text-sm text-ink/40">Nothing to analyze yet.</p>
      ) : (
        <>
          <p className="text-xs text-ink/40">
            {totalSyllables} syllable{totalSyllables === 1 ? '' : 's'} total
          </p>
          <ul className="space-y-2">
            {analysis.map((a, i) => (
              <li key={i} className="rounded border border-canvas-line bg-canvas px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">{a.word}</span>
                  <span className="text-xs text-ink/40">
                    {a.syllables} syllable{a.syllables === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-xs text-ink/50">
                  <span>stress: {a.stress ?? 'unknown'}</span>
                  <span className="font-mono">{a.phonemes ? a.phonemes.join(' ') : '—'}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
