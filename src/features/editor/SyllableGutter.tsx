import { type Ref } from 'react'
import { useEditorMetrics } from '@/features/editor/editorLayout'

interface SyllableGutterProps {
  lines: string[]
  counts: (number | null)[]
  loading: boolean
  gutterRef: Ref<HTMLDivElement>
}

export function SyllableGutter({ lines, counts, loading, gutterRef }: SyllableGutterProps) {
  const { fontSize, lineHeight, topPadding } = useEditorMetrics()

  return (
    <div
      ref={gutterRef}
      aria-hidden="true"
      className="w-7 shrink-0 overflow-hidden select-none border-r border-canvas-line pr-2 text-right text-ink/35 sm:w-10 sm:pr-3"
      style={{ fontSize, paddingTop: topPadding }}
    >
      {lines.map((_line, index) => (
        <div key={index} style={{ height: lineHeight, lineHeight: `${lineHeight}px` }}>
          {loading ? '' : (counts[index] ?? '')}
        </div>
      ))}
    </div>
  )
}
