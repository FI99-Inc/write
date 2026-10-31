import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import type { JSONContent } from '@tiptap/core'
import { docToHtml } from '@/engines/richText/serialize'
import { plainTextToDoc } from '@/engines/richText/plainText'

/** One read-only preview contract: bounded blocks, sanitized HTML, and non-interactive links. */
export function SafeRichPreview({
  content,
  body = '',
  maxBlocks = 50,
  className = '',
}: {
  content?: JSONContent
  body?: string
  maxBlocks?: number
  className?: string
}) {
  const html = useMemo(() => {
    const document = content ?? plainTextToDoc(body)
    return DOMPurify.sanitize(
      docToHtml({ ...document, content: document.content?.slice(0, maxBlocks) }),
      { FORBID_ATTR: ['href'] },
    )
  }, [content, body, maxBlocks])
  return (
    <div className={`story-rich-preview ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
  )
}
