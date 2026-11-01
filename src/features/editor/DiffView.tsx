import { useMemo, useState } from 'react'
import { diffLines } from '@/engines/diff'

interface DiffViewProps {
  oldText: string
  newText: string
}

export function DiffView({ oldText, newText }: DiffViewProps) {
  const ops = useMemo(() => diffLines(oldText, newText), [oldText, newText])

  const [limit, setLimit] = useState(1000)
  return (
    <div className="overflow-hidden rounded-lg border border-canvas-line bg-paper font-display text-sm leading-relaxed [&>div]:break-words">
      {ops.slice(0, limit).map((op, index) => (
        <div
          key={index}
          className={
            op.type === 'added'
              ? 'bg-verdigris/10 px-3 py-0.5 text-verdigris sm:px-4'
              : op.type === 'removed'
                ? 'bg-berry/10 px-3 py-0.5 text-berry line-through decoration-berry/40 sm:px-4'
                : 'px-3 py-0.5 text-ink/70 sm:px-4'
          }
        >
          <span className="mr-2 select-none text-ink/30">
            {op.type === 'added' ? '+' : op.type === 'removed' ? '−' : ' '}
          </span>
          {op.line.length > 0 ? op.line : ' '}
        </div>
      ))}
      {ops.length > limit && (
        <button className="action-secondary m-3" onClick={() => setLimit(limit + 1000)}>
          Show more comparison ({limit} of {ops.length} lines shown)
        </button>
      )}
    </div>
  )
}
