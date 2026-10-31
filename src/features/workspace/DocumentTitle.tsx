import { useLayoutEffect, useRef } from 'react'

export function DocumentTitle({
  title,
  onChange,
  label,
}: {
  title: string
  onChange: (title: string) => void
  label: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node || CSS.supports('field-sizing', 'content')) return
    const fit = () => {
      node.style.height = '0px'
      node.style.height = `${node.scrollHeight}px`
    }
    fit()
    let width = 0
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width !== width) {
        width = entry.contentRect.width
        fit()
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [title])
  return (
    <h1 className="wr-document-title" aria-label={title || 'Untitled'}>
      <textarea
        ref={ref}
        rows={1}
        value={title}
        aria-label={label}
        placeholder="Untitled"
        onChange={(event) => onChange(event.target.value.replace(/\n/g, ' '))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault()
        }}
      />
    </h1>
  )
}
