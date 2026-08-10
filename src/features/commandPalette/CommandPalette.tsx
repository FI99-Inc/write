import { useEffect, useMemo, useRef, useState } from 'react'
import { useCommandPaletteState } from '@/engines/CommandPaletteContext'

export function CommandPalette() {
  const { open, setOpen, commands } = useCommandPaletteState()
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => c.label.toLowerCase().includes(q))
  }, [commands, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setHighlighted(0)
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    setHighlighted(0)
  }, [query])

  if (!open) return null

  function runHighlighted() {
    const command = filtered[highlighted]
    if (!command) return
    setOpen(false)
    command.run()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-[12dvh]"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-lg border border-canvas-line bg-paper shadow-xl"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setHighlighted((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setHighlighted((h) => Math.max(h - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              runHighlighted()
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          placeholder="Type a command…"
          aria-label="Search commands"
          className="w-full border-b border-canvas-line bg-transparent px-4 py-3 text-sm text-ink outline-none placeholder:text-ink/30"
        />
        <ul className="max-h-[50dvh] overflow-y-auto py-1 sm:max-h-80">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink/40">No matching commands.</li>
          ) : (
            filtered.map((command, index) => (
              <li key={command.id}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => {
                    setOpen(false)
                    command.run()
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                    index === highlighted ? 'bg-canvas text-indigo' : 'text-ink'
                  }`}
                >
                  <span>{command.label}</span>
                  {command.shortcut && <span className="text-xs text-ink/30">{command.shortcut}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
