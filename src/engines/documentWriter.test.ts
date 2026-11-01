import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { createDocumentWriter, readRecovery } from '@/engines/documentWriter'
import { useDocumentSave } from '@/engines/useDocumentSave'

beforeEach(() => {
  vi.useFakeTimers()
  sessionStorage.clear()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('document saving', () => {
  it('flushes the latest edit immediately instead of discarding a debounce', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    const writer = createDocumentWriter(write, vi.fn())
    writer.schedule('a', { body: 'first' })
    writer.schedule('a', { body: 'latest' })
    await writer.flush()
    expect(write).toHaveBeenCalledExactlyOnceWith('a', { body: 'latest' }, expect.any(Number))
    await vi.advanceTimersByTimeAsync(500)
    expect(write).toHaveBeenCalledTimes(1)
  })

  it('does not let an older failed write replace a newer queued draft', async () => {
    const write = vi.fn().mockRejectedValueOnce(new Error('quota')).mockResolvedValue(undefined)
    const state = vi.fn()
    const writer = createDocumentWriter(write, state)
    writer.schedule('a', 'first')
    const first = writer.flush()
    writer.schedule('a', 'second')
    const second = writer.flush()
    await Promise.all([first, second])
    await writer.flush()
    expect(write.mock.calls.map((call) => call.slice(0, 2))).toEqual([
      ['a', 'first'],
      ['a', 'second'],
    ])
    expect(state).toHaveBeenLastCalledWith('saved')
  })

  it('keeps a newer recovery copy while an earlier write is in flight', async () => {
    let release!: () => void
    const write = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            release = resolve
          }),
      )
      .mockResolvedValue(undefined)
    const writer = createDocumentWriter(write, vi.fn())
    writer.schedule('a', 'first')
    const first = writer.flush()
    await Promise.resolve()
    writer.schedule('a', 'newer')
    writer.preserve()
    release()
    await first
    expect(readRecovery('a', 0)).toBe('newer')
    await writer.flush()
    expect(sessionStorage.getItem('write-pending:a')).toBeNull()
  })

  it('retains and retries a failed draft', async () => {
    const write = vi.fn().mockRejectedValueOnce(new Error('storage')).mockResolvedValue(undefined)
    const state = vi.fn()
    const writer = createDocumentWriter(write, state)
    writer.schedule('a', 'recover me')
    await writer.flush()
    expect(state).toHaveBeenLastCalledWith('error')
    expect(readRecovery('a', 0)).toBe('recover me')
    await writer.flush()
    expect(write).toHaveBeenCalledTimes(2)
    expect(state).toHaveBeenLastCalledWith('saved')
  })

  it('flushes a mounted editing hook when navigation unmounts it', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const initial = { body: 'saved' }
    const { rerender, unmount } = renderHook(({ value }) => useDocumentSave('a', value, save), {
      initialProps: { value: initial },
    })
    rerender({ value: { body: 'last keystroke' } })
    unmount()
    await act(async () => {
      await Promise.resolve()
    })
    expect(save).toHaveBeenCalledExactlyOnceWith('a', {
      body: 'last keystroke',
      draftSavedAt: expect.any(Number),
    })
  })
})

it('assigns a newer logical draft revision even if the clock matches the persisted revision', async () => {
  vi.setSystemTime(new Date(100))
  const writer = createDocumentWriter(
    async () => {
      throw new Error('quota')
    },
    () => {},
    100,
  )
  writer.schedule('a', 'newer writing')
  await writer.flush()
  expect(readRecovery('a', 100)).toBe('newer writing')
})
