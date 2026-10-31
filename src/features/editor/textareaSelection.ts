import type { TextMatch } from '@/engines/findReplace'

/** Measure wrapped text using the textarea's actual typography, rather than assuming one row per newline. */
export function revealTextareaSelection(textarea: HTMLTextAreaElement, match: TextMatch): void {
  textarea.focus()
  textarea.setSelectionRange(match.from, match.to)
  const metrics = getComputedStyle(textarea)
  const mirror = document.createElement('div')
  for (const property of [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'lineHeight',
    'letterSpacing',
    'wordSpacing',
    'textIndent',
    'textAlign',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'whiteSpace',
    'wordBreak',
    'overflowWrap',
    'tabSize',
  ] as const)
    mirror.style[property] = metrics[property]
  Object.assign(mirror.style, {
    position: 'absolute',
    left: '-100000px',
    top: '0',
    width: `${textarea.clientWidth}px`,
    boxSizing: 'border-box',
    visibility: 'hidden',
  })
  mirror.setAttribute('aria-hidden', 'true')
  const marker = document.createElement('span')
  marker.textContent =
    textarea.value.slice(match.from, Math.max(match.from + 1, match.to)) || '\u200b'
  mirror.append(
    document.createTextNode(textarea.value.slice(0, match.from)),
    marker,
    document.createTextNode(
      textarea.value.slice(
        Math.max(match.from + 1, match.to),
        Math.max(match.from + 1, match.to) + 2048,
      ),
    ),
  )
  document.body.append(mirror)
  const markerRect = marker.getBoundingClientRect(),
    mirrorRect = mirror.getBoundingClientRect()
  const top = markerRect.top - mirrorRect.top,
    left = markerRect.left - mirrorRect.left
  mirror.remove()
  if (textarea.scrollHeight > textarea.clientHeight + 1)
    textarea.scrollTop = Math.max(0, top - textarea.clientHeight / 2)
  else {
    let scroller = textarea.parentElement
    while (
      scroller &&
      !(
        ['auto', 'scroll'].includes(getComputedStyle(scroller).overflowY) &&
        scroller.scrollHeight > scroller.clientHeight
      )
    )
      scroller = scroller.parentElement
    if (scroller)
      scroller.scrollTop = Math.max(
        0,
        scroller.scrollTop +
          textarea.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top +
          top -
          scroller.clientHeight / 2,
      )
  }
  if (textarea.scrollWidth > textarea.clientWidth)
    textarea.scrollLeft = Math.max(0, left - textarea.clientWidth / 2)
  textarea.dispatchEvent(new Event('scroll'))
}
