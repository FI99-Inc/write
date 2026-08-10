import { useState, type Ref } from 'react'
import type { LineRhyme } from '@/engines/rhymeScheme'
import { formatRhymeLabel } from '@/engines/rhymeScheme'
import { colorForRhymeLabel } from '@/features/editor/rhymeColors'
import { useEditorMetrics } from '@/features/editor/editorLayout'

interface RhymeColumnProps {
  lines: LineRhyme[]
  isOverridden: (lineIndex: number) => boolean
  onPin: (lineIndex: number, label: string | null) => void
  gutterRef: Ref<HTMLDivElement>
}

export function RhymeColumn({ lines, isOverridden, onPin, gutterRef }: RhymeColumnProps) {
  const { lineHeight, topPadding } = useEditorMetrics()
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState('')

  function startEditing(index: number, currentLabel: string) {
    setEditingIndex(index)
    setDraft(currentLabel)
  }

  function commit(index: number) {
    const trimmed = draft.trim()
    onPin(index, trimmed.length > 0 ? trimmed : null)
    setEditingIndex(null)
  }

  return (
    <div
      ref={gutterRef}
      /* Hidden on phones: 56px of scheme labels beside a ~300px screen costs
         more than it tells you, and the rhyme-colors overlay covers the same
         ground without taking width. */
      className="hidden w-14 shrink-0 overflow-hidden border-l border-canvas-line pl-2 text-xs sm:block"
      style={{ paddingTop: topPadding }}
    >
      {lines.map((line, index) => {
        const label = formatRhymeLabel(line)
        const pinned = isOverridden(index)

        if (editingIndex === index) {
          return (
            <div key={index} style={{ height: lineHeight, lineHeight: `${lineHeight}px` }}>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commit(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit(index)
                  if (e.key === 'Escape') setEditingIndex(null)
                }}
                className="w-10 rounded border border-indigo bg-paper px-1 text-center text-xs outline-none"
                style={{ height: lineHeight - 8, marginTop: 4 }}
              />
            </div>
          )
        }

        if (line.endWord === null) {
          return <div key={index} style={{ height: lineHeight }} />
        }

        return (
          <button
            key={index}
            type="button"
            onClick={() => startEditing(index, line.label)}
            title={pinned ? 'Pinned — click to change' : 'Click to pin a label'}
            className="block w-full text-left font-medium select-none hover:opacity-70"
            style={{
              height: lineHeight,
              lineHeight: `${lineHeight}px`,
              color: colorForRhymeLabel(line.label),
            }}
          >
            {label}
            {pinned && <span className="ml-0.5 text-ink/30">•</span>}
          </button>
        )
      })}
    </div>
  )
}
