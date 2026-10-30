import { useState } from 'react'

export function useRecentWords(word: string | null): string[] {
  const [history, setHistory] = useState<{ word: string | null; words: string[] }>(() => ({
    word,
    words: word ? [word] : [],
  }))
  if (history.word !== word) {
    setHistory({
      word,
      words: word
        ? [word, ...history.words.filter((entry) => entry !== word)].slice(0, 12)
        : history.words,
    })
  }
  return history.words
}
