import DOMPurify from 'dompurify'
import { DOMParser as SchemaParser } from '@tiptap/pm/model'
import type { JSONContent } from '@tiptap/core'
import { getStorySchema } from '@/engines/richText/extensions'
import { normalizeClipboardHtml } from '@/engines/richText/clipboard'
import { plainTextToDoc, docToPlainText } from '@/engines/richText/projection'
export interface ImportedDocument {
  title: string
  body: string
  content: JSONContent
  warnings: string[]
}
const tags = [
  'p',
  'h1',
  'h2',
  'h3',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'del',
  'strike',
  'a',
  'br',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'hr',
]

/** Sanitization precedes any schema parsing or preview. Unsupported media never reaches the page. */
export function parseImportedHtml(
  html: string,
  fallbackTitle: string,
  warnings: string[] = [],
): ImportedDocument {
  const preliminary = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      ...tags,
      'h4',
      'h5',
      'h6',
      'div',
      'span',
      'font',
      'mark',
      'table',
      'tbody',
      'thead',
      'tr',
      'td',
      'th',
      'img',
    ],
    ALLOWED_ATTR: ['href', 'start', 'style', 'alt'],
    FORBID_CONTENTS: ['script', 'style', 'iframe', 'svg', 'math', 'object'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  })
  const staging = new DOMParser().parseFromString(preliminary, 'text/html')
  const notes = [...warnings]
  if (staging.querySelector('table')) {
    notes.push('Tables were converted to paragraphs; check their reading order.')
    staging.querySelectorAll('table').forEach((table) => {
      const fragment = staging.createDocumentFragment()
      table.querySelectorAll('tr').forEach((row) => {
        const paragraph = staging.createElement('p')
        ;[...row.children].forEach((cell, index) => {
          if (index) paragraph.append(staging.createTextNode(' — '))
          paragraph.append(...cell.childNodes)
        })
        fragment.append(paragraph)
      })
      table.replaceWith(fragment)
    })
  }
  staging.querySelectorAll('h4,h5,h6').forEach((heading) => {
    const replacement = staging.createElement('h3')
    replacement.append(...heading.childNodes)
    heading.replaceWith(replacement)
  })
  staging.querySelectorAll('div').forEach((element) => {
    if (!element.querySelector('p,div,ul,ol,blockquote,pre')) {
      const paragraph = staging.createElement('p')
      paragraph.append(...element.childNodes)
      element.replaceWith(paragraph)
    }
  })
  const safe = DOMPurify.sanitize(normalizeClipboardHtml(staging.body.innerHTML), {
    ALLOWED_TAGS: tags,
    ALLOWED_ATTR: ['href', 'start'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  })
  const container = document.createElement('div')
  container.innerHTML = safe
  const first = container.firstElementChild
  let title = fallbackTitle
  if (first?.tagName === 'H1' && first.textContent?.trim()) {
    title = first.textContent.trim()
    first.remove()
  }
  const content = SchemaParser.fromSchema(getStorySchema()).parse(container).toJSON()
  return { title, content, body: docToPlainText(content), warnings: [...new Set(notes)] }
}

function convertInWorker(
  payload: { kind: 'docx'; buffer: ArrayBuffer } | { kind: 'markdown'; text: string },
  signal: AbortSignal,
): Promise<{ html: string; warnings: string[] }> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Import cancelled.', 'AbortError'))
      return
    }
    const worker = new Worker(new URL('./import.worker.ts', import.meta.url), { type: 'module' })
    const finish = () => {
      clearTimeout(timer)
      worker.terminate()
      signal.removeEventListener('abort', cancel)
    }
    const cancel = () => {
      finish()
      reject(new DOMException('Import cancelled.', 'AbortError'))
    }
    const timer = setTimeout(() => {
      finish()
      reject(
        new Error(
          'Conversion took too long. Split this document into smaller chapters and try again.',
        ),
      )
    }, 30_000)
    signal.addEventListener('abort', cancel, { once: true })
    worker.onerror = () => {
      finish()
      reject(
        new Error('Could not read this document. Check that it is a valid Word or Markdown file.'),
      )
    }
    worker.onmessage = (
      event: MessageEvent<{ html: string; warnings: string[]; error?: string }>,
    ) => {
      finish()
      if (event.data.error) reject(new Error(event.data.error))
      else resolve(event.data)
    }
    if (payload.kind === 'docx') worker.postMessage(payload, [payload.buffer])
    else worker.postMessage(payload)
  })
}
export async function readImportFile(file: File, signal: AbortSignal): Promise<ImportedDocument> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!['txt', 'md', 'markdown', 'docx'].includes(extension ?? ''))
    throw new Error('Choose a .txt, .md, or .docx document.')
  if (file.size > (extension === 'docx' ? 15_000_000 : 5_000_000))
    throw new Error('This file is too large. Split it into smaller chapters and try again.')
  const title = file.name.replace(/\.[^.]+$/, '') || 'Imported writing'
  if (extension === 'txt') {
    const body = (await file.text()).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
    if (signal.aborted) throw new DOMException('Import cancelled.', 'AbortError')
    return { title, body, content: plainTextToDoc(body), warnings: [] }
  }
  const converted = await convertInWorker(
    extension === 'docx'
      ? { kind: 'docx', buffer: await file.arrayBuffer() }
      : { kind: 'markdown', text: await file.text() },
    signal,
  )
  if (signal.aborted) throw new DOMException('Import cancelled.', 'AbortError')
  return parseImportedHtml(converted.html, title, converted.warnings)
}
