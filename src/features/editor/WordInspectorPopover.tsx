import { useEffect, useRef, useState } from 'react'
import { useDictionary } from '@/engines/DictionaryContext'
import { countSyllables } from '@/engines/syllables'
import { getStressPattern } from '@/engines/stress'
import { findRhymesIndexed } from '@/engines/rhymeIndex'
import { loadThesaurus } from '@/data/loadThesaurus'

interface WordInspectorPopoverProps {
  word: string
  x: number
  y: number
  onClose: () => void
}

function StressDots({ pattern }: { pattern: string | null }) {
  if (!pattern) return <span className="text-ink/40">unknown</span>
  return (
    <span className="tracking-widest">
      {pattern.split('').map((digit, i) => (
        <span key={i} className={digit === '1' ? 'text-indigo' : 'text-ink/30'}>
          {digit === '1' ? '●' : '○'}
        </span>
      ))}
    </span>
  )
}

export function WordInspectorPopover({ word, x, y, onClose }: WordInspectorPopoverProps) {
  const { dict, rhymeIndex, overrides } = useDictionary()
  const [synonyms, setSynonyms] = useState<string[] | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    loadThesaurus().then((thesaurus) => {
      if (!cancelled) setSynonyms(thesaurus.get(word) ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [word])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  if (!dict) return null

  const entry = dict.get(word)
  const syllables = countSyllables(word, dict, overrides)
  const stress = getStressPattern(word, dict, overrides)
  const rhymes = rhymeIndex ? findRhymesIndexed(word, dict, rhymeIndex) : { perfect: [], slant: [] }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Inspector for ${word}`}
      className="fixed z-20 w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-canvas-line bg-paper p-4 text-sm shadow-lg"
      // Clamped at both ends: on a narrow screen the "keep it on-screen"
      // subtraction alone goes negative and pushes the popover off the
      // opposite edge instead.
      style={{
        left: Math.max(12, Math.min(x, window.innerWidth - 300)),
        top: Math.max(12, Math.min(y + 12, window.innerHeight - 320)),
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-lg text-ink">{word}</span>
        <button type="button" onClick={onClose} className="text-ink/40 hover:text-ink">
          ×
        </button>
      </div>

      <dl className="space-y-1.5 text-ink/70">
        <div className="flex justify-between">
          <dt className="text-ink/40">Syllables</dt>
          <dd>{syllables}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink/40">Stress</dt>
          <dd>
            <StressDots pattern={stress} />
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink/40">Phonemes</dt>
          <dd className="font-mono text-xs">{entry ? entry.phonemes.join(' ') : '—'}</dd>
        </div>
      </dl>

      <div className="mt-3 border-t border-canvas-line pt-3">
        <p className="mb-1 text-xs font-medium text-ink/40">Perfect rhymes</p>
        <p className="text-ink/70">
          {rhymes.perfect.length > 0 ? rhymes.perfect.slice(0, 8).join(', ') : '—'}
        </p>
      </div>

      <div className="mt-3">
        <p className="mb-1 text-xs font-medium text-ink/40">Slant rhymes</p>
        <p className="text-ink/70">{rhymes.slant.length > 0 ? rhymes.slant.slice(0, 8).join(', ') : '—'}</p>
      </div>

      <div className="mt-3 border-t border-canvas-line pt-3">
        <p className="mb-1 text-xs font-medium text-ink/40">Synonyms</p>
        <p className="text-ink/70">
          {synonyms === null ? 'Loading…' : synonyms.length > 0 ? synonyms.slice(0, 10).join(', ') : '—'}
        </p>
      </div>
    </div>
  )
}
