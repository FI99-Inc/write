export type SaveState = 'saved' | 'pending' | 'saving' | 'error'
interface Draft<T> {
  id: string
  value: T
  updatedAt: number
  revision: number
}
const key = (id: string) => `write-pending:${id}`

export function readRecovery<T>(id: string, draftSavedAt: number): T | null {
  try {
    const draft = JSON.parse(sessionStorage.getItem(key(id)) ?? 'null') as Draft<T> | null
    return draft?.id === id && typeof draft.updatedAt === 'number' && draft.updatedAt > draftSavedAt
      ? draft.value
      : null
  } catch {
    return null
  }
}

/** One queue per document. The latest draft survives failed and in-flight writes. */
export function createDocumentWriter<T>(
  write: (id: string, value: T, draftSavedAt: number) => Promise<void>,
  onState: (state: SaveState) => void,
  initialSavedAt = 0,
) {
  let latest: Draft<T> | null = null
  let revision = 0
  let savedRevision = 0
  let lastTimestamp = initialSavedAt
  let timer: ReturnType<typeof setTimeout> | undefined
  let queue: Promise<void> = Promise.resolve()
  function preserve() {
    if (latest) {
      try {
        sessionStorage.setItem(key(latest.id), JSON.stringify(latest))
      } catch {
        /* Keep save failures visible even when recovery storage is unavailable. */
      }
    }
  }
  function flush(): Promise<void> {
    clearTimeout(timer)
    const draft = latest
    if (!draft) return queue
    onState('saving')
    queue = queue.then(async () => {
      if (draft.revision <= savedRevision) return
      try {
        await write(draft.id, draft.value, draft.updatedAt)
        savedRevision = draft.revision
        try {
          const recovery = JSON.parse(
            sessionStorage.getItem(key(draft.id)) ?? 'null',
          ) as Draft<T> | null
          if (recovery && recovery.updatedAt <= draft.updatedAt)
            sessionStorage.removeItem(key(draft.id))
        } catch {
          /* IndexedDB remains authoritative. */
        }
        if (latest?.revision === draft.revision) {
          latest = null
          onState('saved')
        }
      } catch {
        preserve()
        onState('error')
      }
    })
    return queue
  }
  return {
    schedule(id: string, value: T) {
      lastTimestamp = Math.max(Date.now(), lastTimestamp + 1)
      latest = { id, value, updatedAt: lastTimestamp, revision: ++revision }
      clearTimeout(timer)
      onState('pending')
      timer = setTimeout(() => void flush(), 400)
    },
    flush,
    preserve,
    hasPending: () => latest !== null,
  }
}
