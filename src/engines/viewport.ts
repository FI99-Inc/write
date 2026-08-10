/** The Tailwind `sm` breakpoint, as a media query. Below it the workbench
 * panel is a bottom sheet rather than a side rail — keep this in step with
 * the `sm:` classes that draw the two layouts. */
export const DESKTOP_QUERY = '(min-width: 640px)'

/** Whether there's room for the side-by-side layout right now. Used only to
 * pick the *initial* state of things the user can then toggle (the workbench
 * panel), so it deliberately doesn't subscribe to changes — resizing past the
 * breakpoint shouldn't reopen a panel someone just closed.
 *
 * Falls back to `true` where matchMedia is unavailable (jsdom), which keeps
 * the desktop layout as the default in tests. */
export function isDesktopViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia(DESKTOP_QUERY).matches
}
