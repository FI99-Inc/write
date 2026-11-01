import type { JSONContent } from '@tiptap/core'
import { DOMSerializer } from '@tiptap/pm/model'
import { getStorySchema } from '@/engines/richText/extensions'

export function docToHtml(doc: JSONContent): string {
  const schema = getStorySchema()
  const wrapper = document.createElement('div')
  wrapper.append(
    DOMSerializer.fromSchema(schema).serializeFragment(schema.nodeFromJSON(doc).content),
  )
  return wrapper.innerHTML
}

function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+>~|-]/g, '\\$&')
}
function inline(nodes: JSONContent[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === 'hardBreak') return '  \n'
      if (node.type !== 'text') return inline(node.content)
      const code = node.marks?.some((mark) => mark.type === 'code')
      let text = code ? (node.text ?? '') : escapeMarkdown(node.text ?? '')
      if (code) {
        const fence = '`'.repeat(
          Math.max(1, ...[...text.matchAll(/`+/g)].map((match) => match[0].length + 1)),
        )
        text = `${fence} ${text} ${fence}`
      }
      for (const mark of node.marks ?? []) {
        if (mark.type === 'bold') text = `**${text}**`
        if (mark.type === 'italic') text = `*${text}*`
        if (mark.type === 'strike') text = `~~${text}~~`
        if (mark.type === 'link')
          text = `[${text}](${String(mark.attrs?.href ?? '').replace(/[()\s]/g, (char) => encodeURIComponent(char))})`
      }
      return text
    })
    .join('')
}

function block(node: JSONContent): string {
  switch (node.type) {
    case 'heading':
      return `${'#'.repeat(node.attrs?.level ?? 1)} ${inline(node.content)}`
    case 'paragraph':
      return inline(node.content)
    case 'blockquote':
      return (node.content ?? [])
        .map(block)
        .join('\n\n')
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')
    case 'bulletList':
    case 'orderedList':
      return (node.content ?? [])
        .map((item, index) => {
          const marker = node.type === 'bulletList' ? '- ' : `${(node.attrs?.start ?? 1) + index}. `
          const text = (item.content ?? []).map(block).join('\n\n')
          const lines = text.split('\n')
          return (
            marker +
            lines[0] +
            lines
              .slice(1)
              .map((line) => `\n${' '.repeat(marker.length)}${line}`)
              .join('')
          )
        })
        .join('\n')
    case 'codeBlock': {
      const text = (node.content ?? []).map((child) => child.text ?? '').join('')
      const fence = '`'.repeat(
        Math.max(3, ...[...text.matchAll(/`+/g)].map((match) => match[0].length + 1)),
      )
      return `${fence}${String(node.attrs?.language ?? '').replace(/[^a-z0-9+-]/gi, '')}\n${text}\n${fence}`
    }
    case 'horizontalRule':
      return '---'
    default:
      return node.text ?? (node.content ?? []).map(block).join('\n\n')
  }
}

export function docToMarkdown(title: string, doc: JSONContent): string {
  const heading = escapeMarkdown(title.trim().replace(/\s*\n\s*/g, ' ') || 'Untitled')
  return `# ${heading}\n\n${(doc.content ?? []).map(block).join('\n\n')}`.trimEnd()
}
