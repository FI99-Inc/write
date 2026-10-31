import {
  Document,
  Paragraph,
  TextRun,
  ExternalHyperlink,
  Packer,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  LevelFormat,
  type ILevelsOptions,
  type ParagraphChild,
} from 'docx'
import type { JSONContent } from '@tiptap/core'
import { plainTextToDoc } from '@/engines/richText/plainText'

/** Semantic Word export: no HTML embedding, executable fields, or external media. */
export async function documentToDocx(
  title: string,
  body: string,
  content?: JSONContent,
): Promise<ArrayBuffer> {
  const numbering: { reference: string; levels: ILevelsOptions[] }[] = []
  let listId = 0
  function inline(node: JSONContent): ParagraphChild[] {
    if (node.type === 'hardBreak') return [new TextRun({ break: 1 })]
    if (node.type !== 'text') return (node.content ?? []).flatMap(inline)
    const marks = node.marks ?? []
    const has = (type: string) => marks.some((mark) => mark.type === type)
    const color = marks.find((mark) => mark.type === 'textStyle')?.attrs?.color
    const highlight = marks.find((mark) => mark.type === 'highlight')?.attrs?.color
    const runs = (node.text ?? '').split('\n').map(
      (text, index) =>
        new TextRun({
          text,
          break: index > 0 ? 1 : undefined,
          bold: has('bold'),
          italics: has('italic'),
          strike: has('strike'),
          underline: has('underline') ? {} : undefined,
          font: has('code') ? 'Courier New' : undefined,
          color:
            typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color.slice(1) : undefined,
          shading:
            typeof highlight === 'string' && /^#[0-9a-f]{6}$/i.test(highlight)
              ? { fill: highlight.slice(1) }
              : undefined,
        }),
    )
    const href = marks.find((mark) => mark.type === 'link')?.attrs?.href
    return typeof href === 'string' && /^(https?:|mailto:)/i.test(href)
      ? [new ExternalHyperlink({ link: href, children: runs })]
      : runs
  }
  function blocks(
    nodes: JSONContent[],
    depth = 0,
    list?: { reference?: string; level: number },
    quote = false,
  ): Paragraph[] {
    const result: Paragraph[] = []
    for (const node of nodes) {
      if (node.type === 'bulletList' || node.type === 'orderedList') {
        const level = Math.min(depth, 8)
        const reference = node.type === 'orderedList' ? `list-${++listId}` : undefined
        if (reference)
          numbering.push({
            reference,
            levels: Array.from({ length: 9 }, (_, index) => ({
              level: index,
              format: LevelFormat.DECIMAL,
              text: `%${index + 1}.`,
              alignment: AlignmentType.LEFT,
              start: index === level ? Number(node.attrs?.start ?? 1) : 1,
              style: { paragraph: { indent: { left: 720 * (index + 1), hanging: 360 } } },
            })),
          })
        for (const item of node.content ?? [])
          result.push(...blocks(item.content ?? [], depth + 1, { reference, level }, quote))
      } else if (node.type === 'blockquote')
        result.push(...blocks(node.content ?? [], depth, undefined, true))
      else if (node.type === 'horizontalRule')
        result.push(
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'AAAAAA' } },
          }),
        )
      else if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'codeBlock') {
        const level = Number(node.attrs?.level ?? 1)
        const alignment =
          node.attrs?.textAlign === 'center'
            ? AlignmentType.CENTER
            : node.attrs?.textAlign === 'right'
              ? AlignmentType.RIGHT
              : node.attrs?.textAlign === 'justify'
                ? AlignmentType.JUSTIFIED
                : AlignmentType.LEFT
        result.push(
          new Paragraph({
            children: inline(node),
            heading:
              node.type === 'heading'
                ? [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][
                    Math.min(3, Math.max(1, level)) - 1
                  ]
                : undefined,
            alignment,
            numbering: list?.reference
              ? { reference: list.reference, level: list.level }
              : undefined,
            bullet: list && !list.reference ? { level: list.level } : undefined,
            indent: quote ? { left: 720 } : undefined,
            spacing: { after: 160 },
            style: node.type === 'codeBlock' ? 'Code' : undefined,
          }),
        )
        // Only the first paragraph of a list item carries its marker.
        list = undefined
      } else if (node.content) result.push(...blocks(node.content, depth, list, quote))
    }
    return result
  }
  const paragraphs = blocks((content ?? plainTextToDoc(body)).content ?? [])
  const document = new Document({
    title,
    creator: '',
    numbering: { config: numbering },
    styles: {
      default: {
        document: { run: { font: 'Georgia', size: 24 }, paragraph: { spacing: { line: 360 } } },
      },
      paragraphStyles: [
        { id: 'Code', name: 'Code', basedOn: 'Normal', run: { font: 'Courier New' } },
      ],
    },
    sections: [
      {
        children: [
          new Paragraph({ text: title || 'Untitled', heading: HeadingLevel.TITLE }),
          ...paragraphs,
        ],
      },
    ],
  })
  return Packer.toArrayBuffer(document)
}
