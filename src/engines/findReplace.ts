export interface SearchOptions {
  caseSensitive: boolean
  wholeWord: boolean
}
export interface TextMatch {
  from: number
  to: number
}
export const MAX_SEARCH_MATCHES = 5000
const wordCharacter = /[\p{L}\p{N}\p{M}_]/u

/** Literal search, including Unicode word edges; replacement text is never interpreted as a pattern. */
export function findTextMatches(
  text: string,
  query: string,
  options: SearchOptions,
  limit = MAX_SEARCH_MATCHES,
): TextMatch[] {
  if (!query) return []
  const escaped = [...query]
    .map((character) =>
      String.raw`\^$.*+?()[]{}|`.includes(character)
        ? String.fromCharCode(92) + character
        : character,
    )
    .join('')
  const pattern = new RegExp(escaped, options.caseSensitive ? 'gu' : 'giu')
  const matches: TextMatch[] = []
  for (const match of text.matchAll(pattern)) {
    const from = match.index,
      to = from + match[0].length
    const before = [...text.slice(Math.max(0, from - 2), from)].at(-1) ?? ''
    const after = [...text.slice(to, to + 2)][0] ?? ''
    if (options.wholeWord && (wordCharacter.test(before) || wordCharacter.test(after))) continue
    matches.push({ from, to })
    if (matches.length >= limit) break
  }
  return matches
}

export function replaceTextMatches(
  text: string,
  matches: TextMatch[],
  replacement: string,
): string {
  const pieces: string[] = []
  let position = 0
  for (const match of matches) {
    pieces.push(text.slice(position, match.from), replacement)
    position = match.to
  }
  pieces.push(text.slice(position))
  return pieces.join('')
}

export function lineRange(text: string, line: number): TextMatch {
  let from = 0
  for (let index = 1; index < line; index++) {
    const next = text.indexOf('\n', from)
    if (next < 0) return { from: text.length, to: text.length }
    from = next + 1
  }
  const end = text.indexOf('\n', from)
  return { from, to: end < 0 ? text.length : end }
}
