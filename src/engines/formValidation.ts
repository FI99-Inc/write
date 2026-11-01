import type { DictionaryIndex } from '@/engines/dictionary'
import type { OverrideIndex } from '@/types/override'
import type { FormTemplate, ChecklistItem } from '@/types/form'
import { extractWords, lastWord, firstWord } from '@/engines/normalize'
import { countLineSyllables } from '@/engines/lineStats'
import { scanLine, stressSequence } from '@/engines/scansion'
import { FOOT_PATTERNS, findDeviations } from '@/engines/meter'
import { isPerfectRhyme } from '@/engines/rhyme'

/** Non-blank content lines only — what form templates index against (blank
 * lines are stanza breaks, not counted). */
export function contentLines(body: string): string[] {
  return body.split('\n').filter((line) => line.trim().length > 0)
}

function normalizeForRefrainCompare(line: string): string {
  return extractWords(line).join(' ')
}

/**
 * Checks a poem's content lines against a form template, producing one
 * checklist item per rule (syllables, meter, rhyme-group membership,
 * refrain match). A line the poet hasn't reached yet is "pending", not
 * "fail" — validation informs, it never blocks or discourages.
 */
export function validateForm(
  body: string,
  template: FormTemplate,
  dict: DictionaryIndex,
  overrides?: OverrideIndex,
): ChecklistItem[] {
  if (template.lineRules.length === 0) return []
  const lines = contentLines(body)
  const items: ChecklistItem[] = []

  // Fewer lines than the form calls for just means the poet isn't done yet;
  // more lines than the form calls for is the one line-count case worth
  // flagging, since it means the poem has outgrown the form.
  const lineCountStatus: ChecklistItem['status'] =
    lines.length < template.lineRules.length
      ? 'pending'
      : lines.length === template.lineRules.length
        ? 'pass'
        : 'fail'
  items.push({
    line: 0,
    label: `${template.lineRules.length} line${template.lineRules.length === 1 ? '' : 's'} total`,
    status: lineCountStatus,
  })

  // Group line indices by rhyme label, in template order, so each group's
  // first member acts as the reference the rest are checked against.
  const rhymeGroups = new Map<string, number[]>()
  template.lineRules.forEach((rule, index) => {
    if (!rule.rhymeLabel) return
    const list = rhymeGroups.get(rule.rhymeLabel)
    if (list) list.push(index)
    else rhymeGroups.set(rule.rhymeLabel, [index])
  })
  const rhymeReferenceFor = new Map<number, number>()
  for (const group of rhymeGroups.values()) {
    for (let i = 1; i < group.length; i++) rhymeReferenceFor.set(group[i], group[0])
  }

  template.lineRules.forEach((rule, index) => {
    const lineNumber = index + 1
    const actualLine: string | undefined = lines[index]
    const pending = actualLine === undefined

    if (rule.syllables !== undefined) {
      const actual = pending ? null : countLineSyllables(actualLine, dict, overrides)
      items.push({
        line: lineNumber,
        label: `${rule.syllables} syllables`,
        status: pending ? 'pending' : actual === rule.syllables ? 'pass' : 'fail',
      })
    }

    if (rule.meter) {
      let status: ChecklistItem['status'] = 'pending'
      if (!pending) {
        const stress = stressSequence(scanLine(actualLine, dict, overrides))
        const deviations = findDeviations(stress, rule.meter.foot, rule.meter.feet)
        status =
          deviations.length === 0 &&
          stress.length === rule.meter.feet * FOOT_PATTERNS[rule.meter.foot].length
            ? 'pass'
            : 'fail'
      }
      items.push({
        line: lineNumber,
        label: `${rule.meter.foot === 'iamb' ? 'iambic' : rule.meter.foot === 'trochee' ? 'trochaic' : rule.meter.foot === 'anapest' ? 'anapestic' : 'dactylic'} ${rule.meter.feet}-foot meter`,
        status,
      })
    }

    if (rule.rhymeLabel) {
      const referenceIndex = rhymeReferenceFor.get(index)
      if (referenceIndex !== undefined) {
        const refLine = lines[referenceIndex]
        let status: ChecklistItem['status'] = 'pending'
        let refWord = ''
        if (!pending && refLine !== undefined) {
          refWord = lastWord(refLine) ?? ''
          const actualWord = lastWord(actualLine) ?? ''
          // A refrain line repeating verbatim shares its reference's exact
          // end word — that satisfies "should rhyme" too, even though
          // isPerfectRhyme itself excludes identical-word comparisons (it's
          // built for "suggest a *different* rhyming word", not this check).
          status =
            refWord &&
            actualWord &&
            (actualWord === refWord || isPerfectRhyme(actualWord, refWord, dict))
              ? 'pass'
              : 'fail'
        }
        items.push({
          line: lineNumber,
          label: `should rhyme with line ${referenceIndex + 1}${refWord ? ` ("${refWord}")` : ''}`,
          status,
        })
      }
    }

    if (rule.refrainOf !== undefined) {
      const sourceLine = lines[rule.refrainOf]
      let status: ChecklistItem['status'] = 'pending'
      if (!pending && sourceLine !== undefined) {
        status =
          normalizeForRefrainCompare(actualLine) === normalizeForRefrainCompare(sourceLine)
            ? 'pass'
            : 'fail'
      }
      items.push({
        line: lineNumber,
        label: `refrain — should repeat line ${rule.refrainOf + 1}`,
        status,
      })
    }

    if (rule.endWordMatches !== undefined) {
      const sourceLine = lines[rule.endWordMatches]
      let status: ChecklistItem['status'] = 'pending'
      let sourceWord = ''
      if (!pending && sourceLine !== undefined) {
        sourceWord = lastWord(sourceLine) ?? ''
        const actualWord = lastWord(actualLine) ?? ''
        status = sourceWord && actualWord && sourceWord === actualWord ? 'pass' : 'fail'
      }
      items.push({
        line: lineNumber,
        label: `should close with the same word as line ${rule.endWordMatches + 1}${sourceWord ? ` ("${sourceWord}")` : ''}`,
        status,
      })
    }

    if (rule.startWordMatches !== undefined) {
      const sourceLine = lines[rule.startWordMatches]
      let status: ChecklistItem['status'] = 'pending'
      let sourceWord = ''
      if (!pending && sourceLine !== undefined) {
        sourceWord = firstWord(sourceLine) ?? ''
        const actualWord = firstWord(actualLine) ?? ''
        status = sourceWord && actualWord && sourceWord === actualWord ? 'pass' : 'fail'
      }
      items.push({
        line: lineNumber,
        label: `refrain — should open with the same word as line ${rule.startWordMatches + 1}${sourceWord ? ` ("${sourceWord}")` : ''}`,
        status,
      })
    }
  })

  return items
}
