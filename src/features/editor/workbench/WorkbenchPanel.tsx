import type { ReactNode } from 'react'

interface WorkbenchTab {
  id: string
  label: string
}

interface WorkbenchPanelProps {
  tabs: readonly WorkbenchTab[]
  activeTab: string
  onTabChange: (id: string) => void
  /** Collapsed/focus mode keeps the panel mounted but visually hidden, so
   * in-progress tab state (an Ask AI conversation, a form draft) survives
   * being toggled off and back on. */
  hidden?: boolean
  /** Dismisses the panel. Only surfaced on the phone sheet, where the header
   * toggle that opened it has scrolled out of thumb reach. */
  onClose: () => void
  children: ReactNode
}

/** The chrome shared by the poem and story workbenches: a tab strip over a
 * scrolling body.
 *
 * Above `sm` it's a fixed-width rail beside the writing surface. Below it,
 * a 320px rail would leave nothing to write in, so the same panel becomes a
 * bottom sheet over the text with a dismissing scrim — the writing surface
 * stays visible above it, which matters when the panel exists to feed words
 * into the line you're on. */
export function WorkbenchPanel({ tabs, activeTab, onTabChange, hidden, onClose, children }: WorkbenchPanelProps) {
  return (
    <>
      {!hidden && (
        <button
          type="button"
          aria-label="Close workbench"
          onClick={onClose}
          className="fixed inset-0 z-30 cursor-default bg-black/30 sm:hidden"
        />
      )}

      <aside
        className={`${hidden ? 'hidden' : 'flex'} fixed inset-x-0 bottom-0 z-40 max-h-[70dvh] flex-col rounded-t-2xl border-t border-canvas-line bg-paper shadow-[0_-8px_30px_rgb(0_0_0/0.15)] sm:static sm:z-auto sm:max-h-none sm:w-80 sm:shrink-0 sm:rounded-none sm:border-t-0 sm:border-l sm:shadow-none`}
      >
        <div className="flex items-center justify-between border-b border-canvas-line sm:hidden">
          <span className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-ink/40">Workbench</span>
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm text-ink/50">
            Close
          </button>
        </div>

        {/* Nine tabs wrap raggedly on a phone — the last row's `flex-1`
         * survivors stretch across the whole sheet. One scrolling row keeps
         * them evenly sized; from sm up they wrap into the rail as before. */}
        <nav className="scroll-strip flex shrink-0 overflow-x-auto border-b border-canvas-line sm:flex-wrap sm:overflow-x-visible">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              aria-pressed={activeTab === t.id}
              className={`shrink-0 whitespace-nowrap px-3 py-3 text-xs font-medium transition-colors sm:flex-1 sm:shrink sm:px-1.5 ${
                activeTab === t.id ? 'border-b-2 border-indigo text-indigo' : 'text-ink/40 hover:text-ink/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4">
          {children}
        </div>
      </aside>
    </>
  )
}
