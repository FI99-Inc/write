import type { ReactNode } from 'react'
type GlyphName =
  | 'project'
  | 'tools'
  | 'search'
  | 'close'
  | 'sun'
  | 'moon'
  | 'library'
  | 'write'
  | 'plus'
  | 'arrow'
  | 'back'
  | 'check'
  | 'history'
export function Glyph({ name }: { name: GlyphName }) {
  const paths: Record<GlyphName, ReactNode> = {
    project: (
      <>
        <path d="M3 6h7l2 2h9v12H3zM3 6V4h7l2 2h9v2" />
      </>
    ),
    tools: (
      <>
        <path d="M4 5h16M4 12h16M4 19h16" />
        <circle cx="9" cy="5" r="2" />
        <circle cx="16" cy="12" r="2" />
        <circle cx="8" cy="19" r="2" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" />
      </>
    ),
    moon: <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z" />,
    library: (
      <>
        <path d="M4 4h4v16H4zm7 0h4v16h-4zm7 1 3 14" />
      </>
    ),
    write: <path d="m5 16-1 4 4-1L20 7l-3-3zM14 7l3 3" />,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="m9 5 7 7-7 7" />,
    back: <path d="m15 5-7 7 7 7" />,
    check: <path d="m5 12 4 4L19 6" />,
    history: (
      <>
        <path d="M4 7v5h5M4 12a8 8 0 1 0 2-6" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
