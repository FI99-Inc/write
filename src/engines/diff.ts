export interface DiffOp {
  type: 'same' | 'added' | 'removed'
  line: string
}

/** Linear-space LCS. Very large changed passages are grouped instead of blocking typing. */
export function diffLines(oldText: string, newText: string): DiffOp[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const ops: DiffOp[] = []
  function row(a: string[], b: string[], reverse: boolean): Uint32Array {
    const result = new Uint32Array(b.length + 1)
    for (let i = 0; i < a.length; i++) {
      let diagonal = 0
      for (let j = 0; j < b.length; j++) {
        const previous = result[j + 1]
        result[j + 1] =
          a[reverse ? a.length - i - 1 : i] === b[reverse ? b.length - j - 1 : j]
            ? diagonal + 1
            : Math.max(result[j], previous)
        diagonal = previous
      }
    }
    return result
  }
  function compare(a: string[], b: string[]): void {
    let start = 0
    while (start < a.length && start < b.length && a[start] === b[start]) {
      ops.push({ type: 'same', line: a[start++] })
    }
    let end = 0
    while (
      end < a.length - start &&
      end < b.length - start &&
      a[a.length - end - 1] === b[b.length - end - 1]
    )
      end++
    const left = a.slice(start, a.length - end)
    const right = b.slice(start, b.length - end)
    if (!left.length || !right.length || left.length * right.length > 2_000_000) {
      for (const line of left) ops.push({ type: 'removed', line })
      for (const line of right) ops.push({ type: 'added', line })
    } else if (left.length === 1) {
      const match = right.indexOf(left[0])
      if (match < 0) {
        ops.push({ type: 'removed', line: left[0] })
        for (const line of right) ops.push({ type: 'added', line })
      } else {
        right.forEach((line, index) => ops.push({ type: index === match ? 'same' : 'added', line }))
      }
    } else {
      const middle = Math.floor(left.length / 2)
      const first = row(left.slice(0, middle), right, false)
      const second = row(left.slice(middle), right, true)
      let split = 0
      for (let j = 1; j <= right.length; j++) {
        if (first[j] + second[right.length - j] > first[split] + second[right.length - split])
          split = j
      }
      compare(left.slice(0, middle), right.slice(0, split))
      compare(left.slice(middle), right.slice(split))
    }
    for (let i = a.length - end; i < a.length; i++) ops.push({ type: 'same', line: a[i] })
  }
  compare(oldLines, newLines)
  return ops
}
