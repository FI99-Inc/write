import { test, expect, type TestInfo } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
async function recordMetrics(info: TestInfo, name: string, metrics: Record<string, number>) {
  const path = info.outputPath(name)
  await writeFile(path, JSON.stringify(metrics, null, 2))
  await info.attach(name, { path, contentType: 'application/json' })
}
test('large library renders a bounded page and long prose stays editable', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'New idea', exact: true }).first()).toBeVisible()
  const longBody = Array.from(
    { length: 5000 },
    (_, index) =>
      `Paragraph ${index}: ` + 'A quiet line of writing with several familiar words. '.repeat(4),
  ).join('\n\n')
  await page.evaluate(async (body) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('sonnet5')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const database = request.result
        const transaction = database.transaction(['poems', 'stories'], 'readwrite')
        transaction.objectStore('poems').clear()
        transaction.objectStore('stories').clear()
        const store = transaction.objectStore('stories')
        for (let index = 0; index < 5000; index++)
          store.put({
            id: `fixture-${index}`,
            title: `Fixture ${String(index).padStart(4, '0')}`,
            body: index === 0 ? body : 'Short research note',
            format: 'plain',
            kind: 'story',
            createdAt: 1,
            modifiedAt: 5000 - index,
          })
        transaction.oncomplete = () => {
          database.close()
          resolve()
        }
        transaction.onerror = () => reject(transaction.error)
      }
    })
  }, longBody)
  const libraryStart = Date.now()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Show more writing', exact: true })).toBeVisible()
  const libraryMs = Date.now() - libraryStart
  await expect(page.locator('main > ul > li')).toHaveCount(100)
  expect(libraryMs).toBeLessThan(5000)
  await page.getByRole('textbox', { name: 'Search library', exact: true }).fill('Fixture 0000')
  await page.getByRole('button', { name: /^Fixture 0000/ }).click()
  const plainSurface = page.getByRole('textbox', { name: 'Writing text', exact: true })
  await expect
    .poll(() => plainSurface.evaluate((element) => (element.textContent ?? '').length))
    .toBeGreaterThan(1_000_000)

  await plainSurface.focus()
  await plainSurface.press('ControlOrMeta+End')
  await plainSurface.evaluate((element) => {
    element.addEventListener(
      'beforeinput',
      () => {
        const start = performance.now()
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            ;(window as unknown as { editPaintMs: number }).editPaintMs = performance.now() - start
          }),
        )
      },
      { once: true },
    )
  })
  await page.keyboard.insertText(' Final edit.')
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { editPaintMs?: number }).editPaintMs ?? -1),
    )
    .toBeGreaterThan(0)
  const editMs = await page.evaluate(
    () => (window as unknown as { editPaintMs: number }).editPaintMs,
  )
  expect(await plainSurface.evaluate((element) => (element.textContent ?? '').length)).toBe(
    longBody.replace(/\n/g, '').length + ' Final edit.'.length,
  )
  expect(
    await plainSurface.evaluate((element) => element.textContent?.endsWith(' Final edit.')),
  ).toBe(true)
  expect(editMs).toBeLessThan(1000)
  const resourceNames = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((entry) => entry.name),
  )
  expect(
    resourceNames.some((url) => url.includes('import.worker') || url.includes('export.worker')),
  ).toBe(false)
  await recordMetrics(testInfo, 'performance.json', {
    documents: 5000,
    visibleRows: 100,
    paragraphs: 5000,
    characters: longBody.length,
    libraryMs,
    editMs,
  })
})

test('rich long-form editing meets the interaction budget', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'New story', exact: true }).first()).toBeVisible()
  const paragraphs = Array.from(
    { length: 1000 },
    (_, index) => `Section ${index}. ` + 'Writing stays at the center of a long work. '.repeat(5),
  )
  await page.evaluate(async (lines) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('sonnet5')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const database = request.result
        const transaction = database.transaction('stories', 'readwrite')
        transaction.objectStore('stories').put({
          id: 'long-rich',
          title: 'Long manuscript',
          body: lines.join('\n\n'),
          format: 'rich',
          kind: 'story',
          content: {
            type: 'doc',
            content: lines.map((text) => ({
              type: 'paragraph',
              content: [{ type: 'text', text }],
            })),
          },
          comments: [],
          createdAt: 1,
          modifiedAt: 1,
        })
        transaction.oncomplete = () => {
          database.close()
          resolve()
        }
        transaction.onerror = () => reject(transaction.error)
      }
    })
  }, paragraphs)
  const start = Date.now()
  await page.goto('/story/long-rich')
  const surface = page.locator('[contenteditable="true"]')
  await expect(surface.locator('p')).toHaveCount(1000)
  const openMs = Date.now() - start
  const editStart = Date.now()
  await surface.click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.insertText(' Added line.')
  await expect(surface.locator('p').last()).toContainText('Added line.')
  const editMs = Date.now() - editStart
  expect(openMs).toBeLessThan(5000)
  expect(editMs).toBeLessThan(2500)
  await recordMetrics(testInfo, 'rich-performance.json', {
    paragraphs: 1000,
    words: paragraphs.join(' ').split(/\s+/).length,
    openMs,
    editMs,
  })
})
