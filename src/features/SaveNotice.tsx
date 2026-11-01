import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

/** A failed navigation flush stays visible even after its editor has unmounted. */
export function SaveNotice() {
  const [path, setPath] = useState<string | null>(null)
  useEffect(() => {
    function report(event: Event) {
      const detail = (event as CustomEvent<{ state: string; path: string }>).detail
      if (detail.state === 'error') setPath(detail.path)
      else if (detail.state === 'saved')
        setPath((current) => (current === detail.path ? null : current))
    }
    window.addEventListener('write-save-state', report)
    return () => window.removeEventListener('write-save-state', report)
  }, [])
  if (!path) return null
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 border-b border-berry bg-paper px-4 py-3 text-sm text-berry"
    >
      <span>Some recent changes could not be saved.</span>
      <Link to={path} className="underline">
        Reopen writing to retry
      </Link>
      <button type="button" className="ml-auto underline" onClick={() => setPath(null)}>
        Dismiss
      </button>
    </div>
  )
}
