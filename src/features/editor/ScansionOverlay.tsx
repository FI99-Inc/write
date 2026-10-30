import { memo, useMemo, type Ref } from 'react'
import { cacheLineAnalysis } from '@/engines/lineCache'
import {
  scanLine,
  stressSequence,
  applyScansionOverrides,
  type ScansionSyllable,
} from '@/engines/scansion'
import { findDeviations, type Foot } from '@/engines/meter'
import { splitWordIntoSyllableChunks } from '@/engines/syllableSplit'
import type { DictionaryIndex } from '@/engines/dictionary'
import type { OverrideIndex } from '@/types/override'
import { useEditorMetrics } from '@/features/editor/editorLayout'

interface ScansionOverlayProps {
  lines: string[]
  dict: DictionaryIndex
  wordOverrides: OverrideIndex
  scansionOverrides: Record<string, 0 | 1>
  targetMeter: { foot: Foot; feet: number } | null
  onToggleSyllable: (lineIndex: number, syllableIndex: number) => void
  backdropRef: Ref<HTMLDivElement>
}

interface Segment {
  key: string
  text: string
  syllable?: {
    lineIndex: number
    syllableIndex: number
    stress: 0 | 1
    deviates: boolean
    overridden: boolean
  }
}

function overridesForLine(
  scansionOverrides: Record<string, 0 | 1>,
  lineIndex: number,
): Map<number, 0 | 1> {
  const map = new Map<number, 0 | 1>()
  const prefix = `${lineIndex}-`
  for (const [key, value] of Object.entries(scansionOverrides)) {
    if (key.startsWith(prefix)) map.set(Number(key.slice(prefix.length)), value)
  }
  return map
}

function buildLineSegments(
  line: string,
  lineIndex: number,
  syllables: ScansionSyllable[],
  deviations: Set<number>,
  overridden: Set<number>,
): Segment[] {
  const segments: Segment[] = []
  let cursor = 0
  let i = 0

  while (i < syllables.length) {
    const { wordStart, wordEnd } = syllables[i]
    if (wordStart > cursor) {
      segments.push({ key: `text-${cursor}`, text: line.slice(cursor, wordStart) })
    }

    const wordSyllables: { syllable: ScansionSyllable; globalIndex: number }[] = []
    while (i < syllables.length && syllables[i].wordStart === wordStart) {
      wordSyllables.push({ syllable: syllables[i], globalIndex: i })
      i++
    }

    const chunks = splitWordIntoSyllableChunks(line.slice(wordStart, wordEnd), wordSyllables.length)
    wordSyllables.forEach(({ syllable, globalIndex }, chunkIndex) => {
      segments.push({
        key: `syl-${wordStart}-${chunkIndex}`,
        text: chunks[chunkIndex] ?? '',
        syllable: {
          lineIndex,
          syllableIndex: globalIndex,
          stress: syllable.stress,
          deviates: deviations.has(globalIndex),
          overridden: overridden.has(globalIndex),
        },
      })
    })

    cursor = wordEnd
  }

  if (cursor < line.length) segments.push({ key: `text-${cursor}-end`, text: line.slice(cursor) })

  return segments
}

interface ScansionLineRowProps {
  line: string
  lineIndex: number
  syllables: ScansionSyllable[]
  scansionOverrides: Record<string, 0 | 1>
  targetMeter: { foot: Foot; feet: number } | null
  lineHeight: number
  markOffset: number
  onToggleSyllable: (lineIndex: number, syllableIndex: number) => void
}

/** Memoized so editing one line of a long poem only re-renders that line's
 * row — everything it needs (syllables from the scan cache, the stable
 * scansionOverrides/targetMeter references from EditorPage, and a stable
 * onToggleSyllable callback) stays referentially unchanged for every other
 * line between keystrokes. */
const ScansionLineRow = memo(function ScansionLineRow({
  line,
  lineIndex,
  syllables: raw,
  scansionOverrides,
  targetMeter,
  lineHeight,
  markOffset,
  onToggleSyllable,
}: ScansionLineRowProps) {
  if (line.trim().length === 0) {
    return <div style={{ height: lineHeight }}> </div>
  }

  const lineOverrides = overridesForLine(scansionOverrides, lineIndex)
  const syllables = applyScansionOverrides(raw, lineOverrides)
  const deviations = targetMeter
    ? new Set(findDeviations(stressSequence(syllables), targetMeter.foot, targetMeter.feet))
    : new Set<number>()
  const segments = buildLineSegments(
    line,
    lineIndex,
    syllables,
    deviations,
    new Set(lineOverrides.keys()),
  )

  return (
    <div style={{ height: lineHeight, position: 'relative' }}>
      {segments.map((segment) =>
        segment.syllable ? (
          <span key={segment.key} className="relative inline-block">
            <span
              role="button"
              aria-label={`Line ${lineIndex + 1}, syllable ${segment.syllable.syllableIndex + 1}: ${segment.syllable.stress ? 'stressed' : 'unstressed'}`}
              aria-pressed={segment.syllable.stress === 1}
              tabIndex={0}
              onClick={() =>
                onToggleSyllable(segment.syllable!.lineIndex, segment.syllable!.syllableIndex)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onToggleSyllable(segment.syllable!.lineIndex, segment.syllable!.syllableIndex)
                }
              }}
              className="pointer-events-auto absolute left-1/2 -translate-x-1/2 cursor-pointer select-none text-sm font-bold leading-none"
              style={{
                top: markOffset,
                color: segment.syllable.deviates
                  ? 'var(--color-berry)'
                  : segment.syllable.overridden
                    ? 'var(--color-indigo)'
                    : 'var(--color-indigo-soft)',
                opacity: segment.syllable.deviates || segment.syllable.overridden ? 1 : 0.85,
              }}
            >
              {segment.syllable.stress === 1 ? 'ˊ' : '˘'}
            </span>
            {segment.text}
          </span>
        ) : (
          <span key={segment.key}>{segment.text}</span>
        ),
      )}
    </div>
  )
})

export function ScansionOverlay({
  lines,
  dict,
  wordOverrides,
  scansionOverrides,
  targetMeter,
  onToggleSyllable,
  backdropRef,
}: ScansionOverlayProps) {
  const { fontSize, lineHeight, fontFamily, topPadding } = useEditorMetrics()
  const markOffset = -(topPadding - 1)

  // scanLine is a pure function of (line text, dict, overrides), and on a
  // long poem only the line(s) actually being edited change between
  // keystrokes — caching by line text avoids re-scanning every other line
  // on every render.
  const analyzeLines = useMemo(
    () => cacheLineAnalysis((line: string) => scanLine(line, dict, wordOverrides)),
    [dict, wordOverrides],
  )

  const scans = useMemo(() => analyzeLines(lines), [analyzeLines, lines])
  return (
    <div
      ref={backdropRef}
      role="group"
      aria-label="Syllable stress controls"
      className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre pl-3 sm:pl-6 text-ink"
      style={{
        fontSize,
        lineHeight: `${lineHeight}px`,
        fontFamily,
        paddingTop: topPadding,
      }}
    >
      {lines.map((line, lineIndex) => (
        <ScansionLineRow
          key={lineIndex}
          line={line}
          lineIndex={lineIndex}
          syllables={scans[lineIndex]}
          scansionOverrides={scansionOverrides}
          targetMeter={targetMeter}
          lineHeight={lineHeight}
          markOffset={markOffset}
          onToggleSyllable={onToggleSyllable}
        />
      ))}
    </div>
  )
}
