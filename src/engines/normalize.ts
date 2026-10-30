/**
 * Normalizes a single token for dictionary lookup: curly quotes and dashes
 * are folded to their plain-ASCII equivalents (the dictionary is keyed on
 * straight apostrophes), then punctuation is trimmed from both ends while
 * preserving internal apostrophes (contractions: "don't") and hyphens
 * (compounds: "well-known").
 */
export function normalizeWord(raw: string): string {
  let word = raw.replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')

  // A token wrapped in a matching pair of quote marks ('word', "word") is a
  // quotation, not an elision — strip both sides. A single-sided apostrophe
  // ("'tis", "dogs'") is meaningful and preserved by the trim below.
  if (word.length > 1) {
    const first = word[0]
    const last = word[word.length - 1]
    if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
      word = word.slice(1, -1)
    }
  }

  return word
    .toLowerCase()
    .replace(/^[^\p{L}']+/u, '')
    .replace(/[^\p{L}']+$/u, '')
}

/** Splits a line into normalized, non-empty words. */
export function extractWords(line: string): string[] {
  return tokenizeLineWithSpans(line).map((span) => span.word)
}

/** The last word of a line — what end-rhyme detection keys off of. */
export function lastWord(line: string): string | null {
  const words = extractWords(line)
  return words.length > 0 ? words[words.length - 1] : null
}

/** The first word of a line — what a short opening-phrase refrain (the
 * rondeau's rentrement) keys off of. */
export function firstWord(line: string): string | null {
  const words = extractWords(line)
  return words.length > 0 ? words[0] : null
}

export interface WordAtPosition {
  word: string
  /** Index of the raw word's first character in `text`. */
  start: number
  /** Index just past the raw word's last character in `text`. */
  end: number
}

function isWordChar(ch: string): boolean {
  return /[\p{L}'‘’ʼ–—-]/u.test(ch)
}

/**
 * Finds the word touching a caret/click position in a larger text (e.g. a
 * textarea's `selectionStart`) — expands outward from `position` to the
 * nearest non-word characters on each side. Returns null when the position
 * sits in whitespace/punctuation with no adjacent word.
 */
export function getWordAtPosition(text: string, position: number): WordAtPosition | null {
  if (position < 0 || position > text.length) return null

  let start = position
  let end = position

  while (start > 0 && isWordChar(text[start - 1])) start--
  while (end < text.length && isWordChar(text[end])) end++

  if (start === end) return null

  const word = normalizeWord(text.slice(start, end))
  if (!word) return null

  return { word, start, end }
}

/** The raw start/end indices of the last word in a line (trailing
 * punctuation excluded), for splicing in per-word styling. Null if the line
 * has no word at all. */
export function findLastWordSpan(line: string): { start: number; end: number } | null {
  let end = line.length
  while (end > 0 && !isWordChar(line[end - 1])) end--
  if (end === 0) return null

  let start = end
  while (start > 0 && isWordChar(line[start - 1])) start--

  return { start, end }
}

export interface WordSpan {
  word: string
  start: number
  end: number
}

/** Every word in a line with its raw character span — what scansion uses to
 * position stress marks above each word's syllables. */
export function tokenizeLineWithSpans(line: string): WordSpan[] {
  const spans: WordSpan[] = []
  let i = 0
  while (i < line.length) {
    if (isWordChar(line[i])) {
      const start = i
      while (i < line.length && isWordChar(line[i])) i++
      const word = normalizeWord(line.slice(start, i))
      if (word) spans.push({ word, start, end: i })
    } else {
      i++
    }
  }
  return spans
}
