import type { SaveState } from '@/engines/documentWriter'

export function SaveStatus({ state, retry }: { state: SaveState; retry: () => void }) {
  return (
    <span
      role="status"
      className={`shrink-0 text-xs ${state === 'error' ? 'text-berry' : 'text-ink/50'}`}
    >
      {state === 'error' ? (
        <>
          Could not save.{' '}
          <button type="button" className="underline" onClick={retry}>
            Retry
          </button>
        </>
      ) : state === 'saved' ? (
        'Saved'
      ) : (
        'Saving…'
      )}
    </span>
  )
}
