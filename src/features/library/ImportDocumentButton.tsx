import { lazy, Suspense, useState } from 'react'
const ImportDocumentDialog = lazy(() =>
  import('@/features/library/ImportDocumentDialog').then((module) => ({
    default: module.ImportDocumentDialog,
  })),
)
export function ImportDocumentButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="header-action" onClick={() => setOpen(true)}>
        Import document
      </button>
      {open && (
        <Suspense fallback={<p role="status">Loading document import…</p>}>
          <ImportDocumentDialog onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  )
}
