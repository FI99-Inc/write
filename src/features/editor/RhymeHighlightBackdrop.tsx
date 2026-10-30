import type { Ref } from 'react'
import { findLastWordSpan } from '@/engines/normalize'
import type { LineRhyme } from '@/engines/rhymeScheme'
import { colorForRhymeLabel } from '@/features/editor/rhymeColors'
import { useEditorMetrics } from '@/features/editor/editorLayout'

interface RhymeHighlightBackdropProps {
  lines: string[]
  rhymeScheme: LineRhyme[]
  backdropRef: Ref<HTMLDivElement>
}

/** Renders the poem text a second time, styled, directly behind the
 * textarea (whose own text is made transparent while this is showing) so
 * end words can be colored per rhyme group — something a plain textarea
 * can't do to its own content. */
export function RhymeHighlightBackdrop({
  lines,
  rhymeScheme,
  backdropRef,
}: RhymeHighlightBackdropProps) {
  const { fontSize, lineHeight, fontFamily, topPadding } = useEditorMetrics()

  return (
    <div
      ref={backdropRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre pl-3 sm:pl-6 text-ink"
      style={{
        fontSize,
        lineHeight: `${lineHeight}px`,
        fontFamily,
        paddingTop: topPadding,
      }}
    >
      {lines.map((line, index) => {
        const rhyme = rhymeScheme[index]
        const span = rhyme?.endWord ? findLastWordSpan(line) : null

        if (!span) {
          return (
            <div key={index} style={{ height: lineHeight }}>
              {line.length > 0 ? line : ' '}
            </div>
          )
        }

        return (
          <div key={index} style={{ height: lineHeight }}>
            {line.slice(0, span.start)}
            <span style={{ color: colorForRhymeLabel(rhyme.label) }}>
              {line.slice(span.start, span.end)}
            </span>
            {line.slice(span.end)}
          </div>
        )
      })}
    </div>
  )
}
