import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createDocumentWriter, type SaveState } from '@/engines/documentWriter'

export function useDocumentSave<T extends object>(
  id: string,
  value: T,
  save: (id: string, value: T) => Promise<void>,
  { recovered = false, draftSavedAt = 0 }: { recovered?: boolean; draftSavedAt?: number } = {},
) {
  const [state, setState] = useState<SaveState>('saved')
  const [writer] = useState(() => {
    const path = window.location.pathname
    return createDocumentWriter<T>(
      (documentId, draft, draftSavedAt) => save(documentId, { ...draft, draftSavedAt }),
      (next) => {
        setState(next)
        if (next === 'error' || next === 'saved')
          window.dispatchEvent(
            new CustomEvent('write-save-state', { detail: { state: next, path } }),
          )
      },
      draftSavedAt,
    )
  })
  const baseline = useRef<{ id: string; value: T } | null>(null)
  useLayoutEffect(() => {
    if (!id) return
    if (baseline.current?.id !== id) {
      baseline.current = { id, value }
      if (!recovered) return
    } else if (baseline.current.value === value) return
    baseline.current = { id, value }
    writer.schedule(id, value)
  }, [id, value, recovered, writer])
  useEffect(() => {
    function pageHide() {
      writer.preserve()
      void writer.flush()
    }
    function visibility() {
      if (document.visibilityState === 'hidden') pageHide()
    }
    window.addEventListener('pagehide', pageHide)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('pagehide', pageHide)
      document.removeEventListener('visibilitychange', visibility)
      void writer.flush()
    }
  }, [writer])
  return {
    state,
    flush: useCallback(() => writer.flush(), [writer]),
    flushRequired: useCallback(async () => {
      await writer.flush()
      if (writer.hasPending())
        throw new Error(
          'Save this writing successfully before continuing. Your draft is still available here.',
        )
    }, [writer]),
  }
}
