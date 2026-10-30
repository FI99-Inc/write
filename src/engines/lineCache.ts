/** Retain only lines in the current document, never historical versions or a thrashing fixed-size window. */
export function cacheLineAnalysis<T>(
  analyze: (line: string) => T,
): (lines: readonly string[]) => T[] {
  let previous = new Map<string, T>()
  return (lines) => {
    const current = new Map<string, T>()
    const values = lines.map((line) => {
      const value = current.has(line)
        ? current.get(line)!
        : previous.has(line)
          ? previous.get(line)!
          : analyze(line)
      current.set(line, value)
      return value
    })
    previous = current
    return values
  }
}
