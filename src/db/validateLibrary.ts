import type { LibraryExportData } from '@/db/libraryExport'

type RecordValue = Record<string, unknown>
function record(value: unknown, label: string): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`Invalid ${label}.`)
  return value as RecordValue
}
function string(value: unknown, label: string): void {
  if (typeof value !== 'string') throw new Error(`Invalid ${label}.`)
}
function number(value: unknown, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new Error(`Invalid ${label}.`)
}
function strings(value: unknown, label: string): void {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string'))
    throw new Error(`Invalid ${label}.`)
}
function unique(rows: RecordValue[], label: string): void {
  const keys = new Set<unknown>()
  for (const row of rows) {
    string(row.id, `${label} id`)
    if (!row.id || keys.has(row.id)) throw new Error(`Duplicate or empty ${label} id.`)
    keys.add(row.id)
  }
}
function comments(value: unknown): void {
  if (!Array.isArray(value)) throw new Error('Invalid comments.')
  const rows = value.map((item) => record(item, 'comment'))
  unique(rows, 'comment')
  for (const item of rows) {
    string(item.text, 'comment text')
    number(item.createdAt, 'comment date')
    if (typeof item.resolved !== 'boolean') throw new Error('Invalid comment state.')
  }
}

/** Validate before a preview or any writes. Version 1 backups remain supported. */
export async function parseLibraryExport(value: unknown): Promise<LibraryExportData> {
  const data = record(value, 'library file')
  if (data.version !== 1 && data.version !== 2) throw new Error('Unsupported library version.')
  number(data.exportedAt, 'export date')
  const normalized: RecordValue = { ...data, stories: data.stories ?? [] }
  const rows: Record<string, RecordValue[]> = {}
  for (const key of [
    'poems',
    'stories',
    'snapshots',
    'collections',
    'customForms',
    'wordOverrides',
  ] as const) {
    const list = normalized[key]
    if (!Array.isArray(list)) throw new Error(`Missing or invalid ${key}.`)
    rows[key] = list.map((item) => record(item, key))
    if (key !== 'wordOverrides') unique(rows[key], key)
  }
  const documents = [...rows.poems, ...rows.stories]
  unique(documents, 'document')
  for (const item of documents) {
    string(item.title, 'document title')
    string(item.body, 'document text')
    number(item.createdAt, 'creation date')
    number(item.modifiedAt, 'modified date')
    if (item.draftSavedAt !== undefined) number(item.draftSavedAt, 'saved draft revision')
    for (const key of ['tags', 'collectionIds'])
      if (item[key] !== undefined) strings(item[key], key)
    if (item.deletedAt !== undefined) number(item.deletedAt, 'Trash date')
    if (
      item.status !== undefined &&
      !['idea', 'draft', 'revising', 'done'].includes(String(item.status))
    )
      throw new Error('Invalid document status.')
    if (item.favorite !== undefined && typeof item.favorite !== 'boolean')
      throw new Error('Invalid favorite state.')
  }
  for (const item of rows.poems) {
    if (item.formId !== undefined && item.formId !== null) string(item.formId, 'form id')
    if (item.acrosticWord !== undefined) string(item.acrosticWord, 'acrostic word')
    for (const key of ['rhymeOverrides', 'scansionOverrides'])
      if (item[key] !== undefined) {
        for (const [position, override] of Object.entries(record(item[key], key))) {
          if (
            !(key === 'rhymeOverrides'
              ? /^\d+$/.test(position) && typeof override === 'string'
              : /^\d+-\d+$/.test(position) && (override === 0 || override === 1))
          )
            throw new Error(`Invalid ${key}.`)
        }
      }
    if (item.targetMeter !== undefined && item.targetMeter !== null) {
      const meter = record(item.targetMeter, 'target meter')
      if (
        !['iamb', 'trochee', 'anapest', 'dactyl'].includes(String(meter.foot)) ||
        !Number.isSafeInteger(meter.feet) ||
        Number(meter.feet) < 1 ||
        Number(meter.feet) > 6
      )
        throw new Error('Invalid target meter.')
    }
  }
  for (const item of rows.stories) {
    if (item.kind !== undefined && item.kind !== 'story' && item.kind !== 'idea')
      throw new Error('Invalid prose type.')
    if (item.format !== undefined && item.format !== 'rich' && item.format !== 'plain')
      throw new Error('Invalid writing format.')
    if (item.format === 'rich' && item.content === undefined) {
      const { plainTextToDoc } = await import('@/engines/richText/projection')
      item.content = plainTextToDoc(item.body as string)
    }
  }
  for (const item of rows.snapshots) {
    string(item.poemId, 'snapshot owner')
    string(item.title, 'snapshot title')
    string(item.body, 'snapshot text')
    number(item.createdAt, 'snapshot date')
    if (item.label !== undefined) string(item.label, 'snapshot label')
  }
  for (const item of rows.collections) {
    string(item.name, 'collection name')
    number(item.createdAt, 'collection date')
  }
  for (const item of rows.customForms) {
    for (const key of ['name', 'description', 'example']) string(item[key], `form ${key}`)
    if (!Array.isArray(item.lineRules) || !Array.isArray(item.stanzaLineCounts))
      throw new Error('Invalid form rules.')
    for (const count of item.stanzaLineCounts)
      if (typeof count !== 'number' || !Number.isFinite(count) || count < 0)
        throw new Error('Invalid stanza count.')
    for (const rawRule of item.lineRules) {
      const rule = record(rawRule, 'form rule')
      for (const key of ['syllables', 'refrainOf', 'endWordMatches', 'startWordMatches'])
        if (
          rule[key] !== undefined &&
          (typeof rule[key] !== 'number' || !Number.isFinite(rule[key]) || Number(rule[key]) < 0)
        )
          throw new Error('Invalid form constraint.')
      if (rule.rhymeLabel !== undefined) string(rule.rhymeLabel, 'rhyme label')
      if (rule.meter !== undefined) {
        const meter = record(rule.meter, 'meter')
        if (
          !['iamb', 'trochee', 'anapest', 'dactyl'].includes(String(meter.foot)) ||
          !Number.isSafeInteger(meter.feet) ||
          Number(meter.feet) < 1 ||
          Number(meter.feet) > 6
        )
          throw new Error('Invalid meter.')
      }
    }
  }
  for (const item of rows.wordOverrides) {
    string(item.word, 'word override')
    if (
      item.syllables !== undefined &&
      (typeof item.syllables !== 'number' ||
        !Number.isFinite(item.syllables) ||
        item.syllables < 0 ||
        item.syllables > 100)
    )
      throw new Error('Invalid syllable override.')
    if (
      item.stressPattern !== undefined &&
      (typeof item.stressPattern !== 'string' ||
        !/^[01]*$/.test(item.stressPattern) ||
        item.stressPattern.length > 100)
    )
      throw new Error('Invalid stress override.')
  }
  // Reject JSON prototype keys throughout payloads, without recursive stack growth.
  const stack: { value: unknown; leaving: boolean }[] = [{ value: normalized, leaving: false }]
  const ancestors = new Set<object>()
  const validated = new Set<object>()
  while (stack.length) {
    const { value: item, leaving } = stack.pop()!
    if (!item || typeof item !== 'object') continue
    if (leaving) {
      ancestors.delete(item)
      validated.add(item)
      continue
    }
    if (validated.has(item)) continue
    if (ancestors.has(item)) throw new Error('Library data must be acyclic.')
    ancestors.add(item)
    stack.push({ value: item, leaving: true })
    for (const [key, child] of Object.entries(item)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key))
        throw new Error('Unsafe library field.')
      stack.push({ value: child, leaving: false })
    }
  }
  const rich = [...rows.stories, ...rows.snapshots].filter((item) => item.content !== undefined)
  if (rich.length) {
    const [{ getStorySchema }, { docToPlainText }] = await Promise.all([
      import('@/engines/richText/extensions'),
      import('@/engines/richText/projection'),
    ])
    const schema = getStorySchema()
    for (const item of rich) {
      const content = record(item.content, 'rich document')
      const nodes: RecordValue[] = [content]
      while (nodes.length) {
        const node = nodes.pop()!
        if (typeof node.type !== 'string' || !schema.nodes[node.type])
          throw new Error('Unsupported rich document node.')
        if (node.attrs !== undefined) {
          const attrs = record(node.attrs, 'node attributes')
          if (
            node.type === 'heading' &&
            attrs.level !== undefined &&
            (!Number.isInteger(attrs.level) || ![1, 2, 3].includes(Number(attrs.level)))
          )
            throw new Error('Invalid heading level.')
          if (
            node.type === 'orderedList' &&
            attrs.start !== undefined &&
            !Number.isSafeInteger(attrs.start)
          )
            throw new Error('Invalid list start.')
          if (
            attrs.textAlign !== undefined &&
            attrs.textAlign !== null &&
            !['left', 'center', 'right', 'justify'].includes(String(attrs.textAlign))
          )
            throw new Error('Invalid alignment.')
          if (node.type === 'codeBlock' && attrs.language !== undefined && attrs.language !== null)
            string(attrs.language, 'code language')
        }
        if (node.content !== undefined) {
          if (!Array.isArray(node.content)) throw new Error('Invalid rich document content.')
          nodes.push(...node.content.map((child) => record(child, 'rich node')))
        }
        if (node.marks !== undefined) {
          if (!Array.isArray(node.marks)) throw new Error('Invalid formatting marks.')
          for (const rawMark of node.marks) {
            const mark = record(rawMark, 'formatting mark')
            if (typeof mark.type !== 'string' || !schema.marks[mark.type])
              throw new Error('Unsupported formatting mark.')
            if (mark.attrs !== undefined) {
              const attrs = record(mark.attrs, 'mark attributes')
              if (mark.type === 'link') {
                for (const field of ['href', 'target', 'rel', 'class'])
                  if (attrs[field] !== undefined && attrs[field] !== null)
                    string(attrs[field], `link ${field}`)
                if (
                  typeof attrs.href === 'string' &&
                  /^(?:javascript|vbscript|data):/i.test(
                    [...attrs.href]
                      .filter((character) => {
                        const code = character.charCodeAt(0)
                        return code > 32 && (code < 127 || code > 159)
                      })
                      .join(''),
                  )
                )
                  throw new Error('Unsafe link URL.')
              }
              if (
                mark.type === 'comment' &&
                attrs.commentId !== undefined &&
                attrs.commentId !== null
              )
                string(attrs.commentId, 'comment anchor')
              if (attrs.color !== undefined && attrs.color !== null) {
                string(attrs.color, 'text color')
                const test = document.createElement('span')
                test.style.color = attrs.color as string
                if (!test.style.color) throw new Error('Invalid text color.')
              }
            }
          }
        }
      }
      const doc = schema.nodeFromJSON(content)
      if (doc.type !== schema.topNodeType) throw new Error('Invalid document root.')
      doc.check()
      const canonical = doc.toJSON()
      item.content = canonical
      item.body = docToPlainText(canonical)
    }
  }
  for (const item of [...rows.stories, ...rows.snapshots]) {
    if (item.comments !== undefined) comments(item.comments)
    if (item.content !== undefined) {
      const { reconcileCommentAnchors } = await import('@/engines/richText/reconcileComments')
      item.content = reconcileCommentAnchors(
        item.content as import('@tiptap/core').JSONContent,
        (item.comments ?? []) as import('@/types/story').StoryComment[],
      )
    }
  }
  return normalized as unknown as LibraryExportData
}
