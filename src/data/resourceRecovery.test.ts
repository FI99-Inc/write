import { afterEach, expect, it, vi } from 'vitest'
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

it('retries a failed dictionary fetch instead of caching rejection forever', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce({ ok: true, json: async () => [['cat', 'K AE1 T', '1', 'AE T']] })
  vi.stubGlobal('fetch', fetcher)
  const { loadDictionary } = await import('@/data/loadDictionary')
  await expect(loadDictionary()).rejects.toThrow('503')
  expect((await loadDictionary()).has('cat')).toBe(true)
  expect(fetcher).toHaveBeenCalledTimes(2)
})
it('retries a failed thesaurus fetch', async () => {
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ ok: true, json: async () => [['cat', ['feline']]] })
  vi.stubGlobal('fetch', fetcher)
  const { loadThesaurus } = await import('@/data/loadThesaurus')
  await expect(loadThesaurus()).rejects.toThrow('offline')
  expect((await loadThesaurus()).get('cat')).toEqual(['feline'])
})
