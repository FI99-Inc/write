import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

// jsdom doesn't implement matchMedia, which the responsive layout reads to
// pick its initial workbench-panel state. Report the desktop layout so
// component tests see the side-by-side arrangement.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('min-width'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
