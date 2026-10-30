import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

export function useModalFocus(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
) {
  const close = useRef(onClose)
  useLayoutEffect(() => {
    close.current = onClose
  }, [onClose])
  useEffect(() => {
    const panel = ref.current
    if (!open || !panel) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const controls = () =>
      [
        ...panel.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
        ),
      ].filter((element) => element.getClientRects().length > 0)
    const frame = requestAnimationFrame(() => (controls()[0] ?? panel).focus())
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        close.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = controls()
      const first = items[0]
      const last = items.at(-1)
      if (!first) {
        event.preventDefault()
        panel!.focus()
        return
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || !panel!.contains(document.activeElement))
      ) {
        event.preventDefault()
        last?.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !panel!.contains(document.activeElement))
      ) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', keydown)
      previous?.focus()
    }
  }, [ref, open])
}
