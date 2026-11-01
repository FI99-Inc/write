import { Slice, type ResolvedPos } from '@tiptap/pm/model'
import { getStorySchema } from '@/engines/richText/extensions'
import { plainTextToDoc } from '@/engines/richText/projection'

export function parseClipboardText(text: string, context?: ResolvedPos): Slice {
  const schema = context?.doc.type.schema ?? getStorySchema()
  return Slice.maxOpen(schema.nodeFromJSON(plainTextToDoc(text)).content)
}

/** Keep structure and basic marks; foreign styling and comment identities do not travel. */
export function normalizeClipboardHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc
    .querySelectorAll('script,style,meta,link,iframe,object,embed')
    .forEach((element) => element.remove())
  doc
    .querySelectorAll('img')
    .forEach((element) => element.replaceWith(doc.createTextNode(element.alt)))
  for (const element of doc.body.querySelectorAll<HTMLElement>('*')) {
    if (['SPAN', 'FONT'].includes(element.tagName)) {
      const styles = element.style
      const wrappers = [
        ...(styles.fontWeight === 'bold' || Number(styles.fontWeight) >= 600 ? ['strong'] : []),
        ...(styles.fontStyle === 'italic' ? ['em'] : []),
        ...(styles.textDecoration.includes('underline') ? ['u'] : []),
        ...(styles.textDecoration.includes('line-through') ? ['s'] : []),
      ]
      for (const tag of wrappers) {
        const wrapper = doc.createElement(tag)
        wrapper.append(...element.childNodes)
        element.append(wrapper)
      }
    }
    for (const attribute of [...element.attributes]) {
      const allowed =
        (element.tagName === 'A' && attribute.name === 'href') ||
        (element.tagName === 'OL' && attribute.name === 'start')
      if (!allowed) element.removeAttribute(attribute.name)
    }
    if (element.tagName === 'MARK') element.replaceWith(...element.childNodes)
  }
  return doc.body.innerHTML
}
