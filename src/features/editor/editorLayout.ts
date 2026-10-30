import { useSettings } from '@/engines/useSettings'

/** Shared pixel metrics so the gutter rows, rhyme column, overlays, and the
 * textarea's lines all stay in lockstep — every consumer reads these from
 * the same hook (backed by user settings) rather than a private copy, so a
 * font-size/line-height change can't desync just one of them. */
export function useEditorMetrics() {
  const { settings } = useSettings()
  return {
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
    fontFamily: settings.editorFont === 'serif' ? 'var(--font-display)' : 'var(--font-sans)',
    /** Room above the very first line so a scansion mark on its first
     * syllable has somewhere to render without clipping against the
     * overlay's own top edge (see ScansionOverlay). Scales with line
     * height so it stays proportionally correct at any text size. */
    topPadding: Math.round(settings.lineHeight * 0.44),
  }
}

/** Classes for a toggle in either editor's header strip. `shrink-0
 * whitespace-nowrap` keeps each pill at full width inside the phone's
 * sideways-scrolling strip instead of being squeezed, and the taller mobile
 * padding gives it a thumb-sized target. */
export function toolbarPill(active: boolean): string {
  return `shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 transition-colors sm:py-1 ${
    active ? 'bg-indigo text-paper' : 'text-ink/50 hover:text-indigo'
  }`
}
