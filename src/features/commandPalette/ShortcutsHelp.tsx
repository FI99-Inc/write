import { useCommandPaletteState } from '@/engines/CommandPaletteContext'

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: 'Ctrl/Cmd + K', description: 'Open the command palette' },
  { keys: 'Ctrl/Cmd + Z', description: 'Undo, in the poem text' },
  { keys: 'Ctrl/Cmd + Shift + Z', description: 'Redo, in the poem text' },
  { keys: 'Enter', description: 'Send a message in Ask AI' },
  { keys: 'Shift + Enter', description: 'New line in Ask AI' },
  { keys: 'Escape', description: 'Close the open menu or palette' },
]

export function ShortcutsHelp() {
  const { shortcutsOpen, setShortcutsOpen } = useCommandPaletteState()
  if (!shortcutsOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={() => setShortcutsOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-lg border border-canvas-line bg-paper p-5 shadow-xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Keyboard shortcuts</h2>
          <button type="button" onClick={() => setShortcutsOpen(false)} className="text-sm text-ink/40 hover:text-indigo">
            Close
          </button>
        </div>
        <ul className="space-y-2 text-sm">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-4">
              <span className="text-ink/70">{s.description}</span>
              <span className="rounded border border-canvas-line bg-canvas px-2 py-0.5 font-mono text-xs text-ink/60">
                {s.keys}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
