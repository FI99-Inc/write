import type { FormTemplate, LineRule } from '@/types/form'
import { parseRhymeSchemeString } from '@/engines/rhymeSchemeString'

export interface CustomFormInput {
  id: string
  name: string
  /** e.g. "ABAB CDCD EFEF GG". Optional — omit for a form with no rhyme
   * requirement (line count then comes from `syllablesPerLine`). */
  rhymeScheme?: string
  /** One target per line, e.g. [5, 7, 5] for a haiku-shaped form. Optional. */
  syllablesPerLine?: number[]
  /** 1-based line numbers: refrainPairs[6] = 1 means line 6 must repeat
   * line 1 verbatim. */
  refrainPairs?: Record<number, number>
}

/** Builds a FormTemplate from the custom form builder's plain input. Line
 * count comes from whichever of rhymeScheme / syllablesPerLine is longer
 * (they should agree if both are given; the builder UI is expected to keep
 * them in sync, but this doesn't hard-require it). */
export function buildCustomTemplate(input: CustomFormInput): FormTemplate {
  const rhymeLabels = input.rhymeScheme ? parseRhymeSchemeString(input.rhymeScheme) : []
  const syllables = input.syllablesPerLine ?? []
  const lineCount = Math.max(rhymeLabels.length, syllables.length)
  if (syllables.some((count) => !Number.isInteger(count) || count <= 0))
    throw new Error('Syllable targets must be positive whole numbers.')
  for (const [rawLine, source] of Object.entries(input.refrainPairs ?? {})) {
    const line = Number(rawLine)
    if (
      !Number.isInteger(line) ||
      !Number.isInteger(source) ||
      source < 1 ||
      line > lineCount ||
      line <= source
    )
      throw new Error('Each refrain must refer to an earlier line within this form.')
  }

  const lineRules: LineRule[] = Array.from({ length: lineCount }, (_, i) => {
    const rule: LineRule = {}
    if (rhymeLabels[i]) rule.rhymeLabel = rhymeLabels[i]
    if (syllables[i] !== undefined) rule.syllables = syllables[i]
    const refrainSource = input.refrainPairs?.[i + 1]
    if (refrainSource !== undefined) rule.refrainOf = refrainSource - 1
    return rule
  })

  return {
    id: input.id,
    name: input.name,
    description: 'A custom form.',
    example: '',
    lineRules,
    stanzaLineCounts: [lineCount],
    isCustom: true,
  }
}
