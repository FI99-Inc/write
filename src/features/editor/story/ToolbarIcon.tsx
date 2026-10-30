type IconName = 'link' | 'left' | 'center' | 'right' | 'list' | 'rule'

const paths: Record<IconName, string> = {
  link: 'M10 13a5 5 0 0 0 7 .1l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7-.1l-3 3a5 5 0 0 0 7 7l2-2',
  left: 'M3 5h18M3 10h12M3 15h18M3 20h12',
  center: 'M3 5h18M6 10h12M3 15h18M6 20h12',
  right: 'M3 5h18M9 10h12M3 15h18M9 20h12',
  list: 'M9 5h12M9 12h12M9 19h12M3 5h.1M3 12h.1M3 19h.1',
  rule: 'M3 12h18',
}

export function ToolbarIcon({ name }: { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  )
}
