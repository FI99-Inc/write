import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  extractWords,
  tokenizeLineWithSpans,
  getWordAtPosition,
  findLastWordSpan,
} from '@/engines/normalize'
import { diffLines } from '@/engines/diff'
import { buildDictionaryIndex } from '@/engines/dictionary'
import { validateForm } from '@/engines/formValidation'
import { ghazal } from '@/engines/formTemplates/otherRhymeForms'
import { FOOT_PATTERNS, type Foot } from '@/engines/meter'
import { toDateKey, computeActivityHeatmap } from '@/engines/stats'
import { cacheLineAnalysis } from '@/engines/lineCache'
import { DEFAULT_SETTINGS } from '@/types/settings'
import { loadSettings, saveSettings } from '@/engines/settingsStorage'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

it('uses the same contraction spans for counts, caret lookup and highlighting', () => {
  const text = 'don’t,well-known'
  expect(extractWords(text)).toEqual(["don't", 'well-known'])
  expect(tokenizeLineWithSpans(text).map((span) => span.word)).toEqual(extractWords(text))
  expect(getWordAtPosition(text, 2)?.word).toBe("don't")
  const span = findLastWordSpan('I don’t')!
  expect('I don’t'.slice(span.start, span.end)).toBe('don’t')
})

describe('history diff', () => {
  it('preserves both original texts through a large complete rewrite', () => {
    const before = Array.from({ length: 5000 }, (_, index) => `old ${index}`).join('\n')
    const after = Array.from({ length: 5000 }, (_, index) => `new ${index}`).join('\n')
    const diff = diffLines(before, after)
    expect(
      diff
        .filter((op) => op.type !== 'added')
        .map((op) => op.line)
        .join('\n'),
    ).toBe(before)
    expect(
      diff
        .filter((op) => op.type !== 'removed')
        .map((op) => op.line)
        .join('\n'),
    ).toBe(after)
  })
  it('keeps unchanged long passages when only one line changes', () => {
    const lines = Array.from({ length: 10000 }, (_, index) => `line ${index}`)
    const changed = [...lines]
    changed[5000] = 'replacement'
    const diff = diffLines(lines.join('\n'), changed.join('\n'))
    expect(diff.filter((op) => op.type === 'removed')).toEqual([
      { type: 'removed', line: 'line 5000' },
    ])
    expect(diff.filter((op) => op.type === 'added')).toEqual([
      { type: 'added', line: 'replacement' },
    ])
  })
})

describe('form checks', () => {
  it.each(Object.keys(FOOT_PATTERNS) as Foot[])('uses the actual %s foot length', (foot) => {
    const pattern = FOOT_PATTERNS[foot].join('')
    const dict = buildDictionaryIndex([['word', 'W ER1 D', pattern, 'ER D']])
    const template = {
      id: 'test',
      name: 'test',
      description: '',
      example: '',
      lineRules: [{ meter: { foot, feet: 1 } }],
      stanzaLineCounts: [1],
    }
    expect(validateForm('word', template, dict).every((item) => item.status === 'pass')).toBe(true)
  })
  it('does not constrain Free Verse to zero lines', () => {
    expect(
      validateForm(
        'any number\nof lines',
        {
          id: 'free-verse',
          name: 'Free Verse',
          description: '',
          example: '',
          lineRules: [],
          stanzaLineCounts: [],
        },
        new Map(),
      ),
    ).toEqual([])
  })
  it('checks the first line of a ghazal against the opening radif', () => {
    expect(
      validateForm('not matching\nsome ending', ghazal, new Map()).find((item) => item.line === 1)
        ?.status,
    ).toBe('fail')
  })
})

it('retains current lines beyond 2,000 entries while discarding historical edits', () => {
  const analyze = vi.fn((line: string) => line.length)
  const cached = cacheLineAnalysis(analyze)
  const lines = Array.from({ length: 2500 }, (_, index) => `line ${index}`)
  cached(lines)
  cached([...lines.slice(0, -1), 'changed'])
  expect(analyze).toHaveBeenCalledTimes(2501)
  cached(['only current line'])
  cached(['changed'])
  expect(analyze).toHaveBeenCalledTimes(2503)
})

it('groups activity by the local evening date', () => {
  const evening = new Date(2026, 9, 30, 23, 30)
  expect(toDateKey(evening.getTime())).toBe('2026-10-30')
  expect(computeActivityHeatmap([evening.getTime()]).get('2026-10-30')).toBe(1)
})

it('falls back for invalid settings values and survives storage failure', () => {
  localStorage.setItem(
    'sonnet5-settings',
    JSON.stringify({ fontSize: null, lineHeight: -1, aiEnabled: 'yes', theme: 'invalid' }),
  )
  expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('denied')
  })
  expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow()
})
