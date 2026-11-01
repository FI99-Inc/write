import { test, expect, type Page } from '@playwright/test'

async function fixture(page: Page) {
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'New idea', exact: true }).first(),
  ).toBeVisible()
  await page.evaluate(async () => {
    const now = Date.now(),
      paragraph = (text: string) => ({
        type: 'paragraph',
        content: [{ type: 'text', text }],
      })
    const common = {
      createdAt: now,
      modifiedAt: now,
      status: 'draft',
      tags: [],
      collectionIds: [],
    }
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('sonnet5')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const database = request.result,
          tx = database.transaction(
            ['poems', 'stories', 'projects'],
            'readwrite',
          )
        tx.objectStore('poems').put({
          ...common,
          id: 'ui-poem',
          title: 'Low water',
          body: 'The river dropped six inches in the night.\nWe found the stone beside the light.',
        })
        for (const [id, title, kind, format] of [
          ['ui-rich', 'The crossing', 'story', 'rich'],
          ['ui-plain', 'A room above the station', 'story', 'plain'],
          ['ui-idea', 'Objects to return to', 'idea', 'rich'],
        ]) {
          const lines = Array.from(
            { length: 30 },
            (_, i) => `Paragraph ${i}. The river was quiet in the morning.`,
          )
          tx.objectStore('stories').put({
            ...common,
            id,
            title,
            kind,
            format,
            body: lines.join('\n\n'),
            content: { type: 'doc', content: lines.map(paragraph) },
            comments: [],
          })
        }
        tx.objectStore('stories').put({
          ...common,
          id: 'ui-trashed',
          title: 'Deleted research',
          kind: 'idea',
          body: 'In Trash',
          deletedAt: now,
          format: 'plain',
        })
        tx.objectStore('projects').put({
          id: 'ui-project',
          name: 'River notebook',
          description: '',
          createdAt: now,
          modifiedAt: now,
          items: [
            { documentId: 'ui-rich', kind: 'story', role: 'chapter' },
            { documentId: 'ui-plain', kind: 'story', role: 'scene' },
            { documentId: 'ui-poem', kind: 'poem', role: 'chapter' },
            { documentId: 'ui-idea', kind: 'idea', role: 'reference' },
            { documentId: 'ui-trashed', kind: 'idea', role: 'reference' },
          ],
        })
        tx.oncomplete = () => {
          database.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
    })
  })
}

test('views and appearance preserve the rich editor, selection, scroll, measure, and saved draft', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await fixture(page)
  await page.goto('/story/ui-rich')
  const surface = page.getByRole('textbox', {
    name: 'Writing text',
    exact: true,
  })
  await expect(surface).toBeVisible()
  await surface.fill('A new opening that must survive view changes.')
  await surface.evaluate((element) => {
    const state = window as unknown as { originalSurface: Element }
    state.originalSurface = element
    element.closest('main')!.scrollTop = 40
    const node = element.querySelector('p')!.firstChild!,
      range = document.createRange()
    range.setStart(node, 2)
    range.setEnd(node, 5)
    getSelection()!.removeAllRanges()
    getSelection()!.addRange(range)
    ;(element as HTMLElement).focus()
  })
  const width = await page
    .locator('.writing-column')
    .evaluate((node) => node.getBoundingClientRect().width)
  await page.getByRole('button', { name: 'Quiet', exact: true }).click()
  await expect(surface).toBeFocused()
  expect(await page.evaluate(() => getSelection()?.toString())).toBe('new')
  expect(
    await page
      .locator('.writing-column')
      .evaluate((node) => node.getBoundingClientRect().width),
  ).toBeCloseTo(width, 0)
  await page.getByRole('button', { name: 'Workspace', exact: true }).click()
  await expect(surface).toBeFocused()
  expect(
    await surface.evaluate(
      (node) =>
        node ===
        (window as unknown as { originalSurface: Element }).originalSurface,
    ),
  ).toBe(true)
  expect(await page.evaluate(() => getSelection()?.toString())).toBe('new')
  await page.getByRole('button', { name: /^Appearance:/ }).click()
  await page.getByRole('radio', { name: /^Dusk/ }).check()
  await page.keyboard.press('Escape')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dusk')
  await expect(surface).toHaveText(
    'A new opening that must survive view changes.',
  )
  await expect(
    page.getByRole('status').filter({ hasText: /^Saved$/ }),
  ).toBeVisible()
  await page.reload()
  await expect(surface).toHaveText(
    'A new opening that must survive view changes.',
  )
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dusk')
})

test('panel arrangement persists separately from view and tool tabs support the keyboard', async ({
  page,
}) => {
  await fixture(page)
  await page.goto('/poem/ui-poem')
  await expect(
    page.getByRole('tab', { name: 'Rhymes', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Project', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Project', exact: true }),
  ).toHaveAttribute('aria-expanded', 'false')
  await page.getByRole('button', { name: 'Quiet', exact: true }).click()
  await page.getByRole('button', { name: 'Workspace', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Project', exact: true }),
  ).toHaveAttribute('aria-expanded', 'false')
  const rhymes = page.getByRole('tab', { name: 'Rhymes', exact: true })
  await rhymes.focus()
  await rhymes.press('ArrowRight')
  await expect(
    page.getByRole('tab', { name: 'Thesaurus', exact: true }),
  ).toBeFocused()
  await expect(
    page.getByRole('tab', { name: 'Thesaurus', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Home')
  await expect(rhymes).toBeFocused()
  await page
    .getByRole('button', { name: 'Close workbench panel', exact: true })
    .click()
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Tools', exact: true }),
  ).toHaveAttribute('aria-expanded', 'false')
  await expect(
    page.getByRole('button', { name: 'Project', exact: true }),
  ).toHaveAttribute('aria-expanded', 'false')
})

test('real project order, research, navigation, and creation work from the rail', async ({
  page,
}) => {
  await fixture(page)
  await page.goto('/poem/ui-poem')
  const rail = page.locator('.wr-project-rail')
  await expect(
    rail.getByRole('link', { name: /A room above the station/ }),
  ).toBeVisible()
  await expect(
    rail.getByText('1 poem, 2 stories, 1 idea', { exact: true }),
  ).toBeVisible()
  await expect(rail.getByText('Deleted research')).toHaveCount(0)
  expect(
    await rail
      .locator('.wr-file-list')
      .first()
      .getByRole('link')
      .allTextContents(),
  ).toEqual([
    '1The crossingStory',
    '2A room above the stationStory',
    '3Low waterPoem',
  ])
  await rail.getByRole('link', { name: /A room above the station/ }).click()
  await expect(
    page.getByRole('textbox', { name: 'Story title', exact: true }),
  ).toHaveValue('A room above the station')
  await expect(
    page.getByRole('textbox', { name: 'Writing text', exact: true }),
  ).toContainText('Paragraph 0')
  await page
    .getByRole('button', { name: 'New project idea', exact: true })
    .click()
  await expect(
    page.getByRole('textbox', { name: 'Idea title', exact: true }),
  ).toBeVisible()
  await expect(page.locator('.wr-project-name h2')).toHaveText('River notebook')
  await page
    .locator('.wr-rail-bottom')
    .getByRole('link', { name: 'Find writing', exact: true })
    .click()
  await expect(
    page.getByRole('textbox', { name: 'Search library', exact: true }),
  ).toBeFocused()
})

test('phone and tablet drawers fit, close with Escape, and return focus to their controls', async ({
  page,
}) => {
  await fixture(page)
  await page.goto('/story/ui-rich')
  for (const width of [320, 375, 414, 768]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.locator('.wr-workspace')).toHaveAttribute(
      'data-compact',
      'true',
    )
    const appearance = page.getByRole('button', { name: /^Appearance:/ })
    await expect(appearance).toBeVisible()
    expect(await appearance.innerText()).toContain('Olive')
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    for (const name of ['Project', 'Tools']) {
      const trigger = page.getByRole('button', { name, exact: true })
      await trigger.click()
      await expect(
        page.getByRole('dialog', { name, exact: true }),
      ).toBeVisible()
      await expect(page.locator('dialog:modal')).toHaveCount(1)
      await page.keyboard.press('Escape')
      await expect(page.locator('dialog:modal')).toHaveCount(0)
      await expect(trigger).toBeFocused()
    }
  }
})

test('all appearances persist and maintain text, focus, and poetry color contrast', async ({
  page,
}) => {
  await fixture(page)
  await page.goto('/poem/ui-poem')
  for (const theme of ['Olive', 'Dusk', 'Sand', 'Light', 'Dark']) {
    await page.getByRole('button', { name: /^Appearance:/ }).click()
    await page.getByRole('radio', { name: new RegExp(`^${theme}`) }).check()
    await page.keyboard.press('Escape')
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      theme.toLowerCase(),
    )
    const ratios = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement),
        canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d')!
      canvas.width = canvas.height = 1
      function luminance(name: string) {
        ctx.fillStyle = style.getPropertyValue(name)
        ctx.fillRect(0, 0, 1, 1)
        const [r, g, b] = [...ctx.getImageData(0, 0, 1, 1).data]
          .slice(0, 3)
          .map((value) => {
            const v = value / 255
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
          })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      function ratio(a: string, b: string) {
        const x = luminance(a),
          y = luminance(b)
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
      }
      return {
        body: ratio('--color-ink', '--color-paper'),
        muted: ratio('--color-muted', '--color-panel'),
        selected: ratio('--color-muted', '--color-selected'),
        focus: ratio('--color-focus', '--color-paper'),
        poetry: [
          'indigo',
          'berry',
          'verdigris',
          'rhyme-amber',
          'rhyme-plum',
          'rhyme-steel',
          'rhyme-bronze',
          'rhyme-moss',
        ].map((name) => ratio(`--color-${name}`, '--color-paper')),
      }
    })
    for (const value of [
      ratios.body,
      ratios.muted,
      ratios.selected,
      ...ratios.poetry,
    ])
      expect(value, JSON.stringify({ theme, ratios })).toBeGreaterThanOrEqual(
        4.5,
      )
    expect(ratios.focus).toBeGreaterThanOrEqual(3)
  }
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Appearance: Dark', exact: true }),
  ).toBeVisible()
})

test('large UI text uses drawers and long titles wrap without page overflow', async ({
  page,
}) => {
  await fixture(page)
  await page.goto('/story/ui-rich')
  await page
    .getByRole('textbox', { name: 'Story title', exact: true })
    .fill(
      'A much longer title about a room above the station and the things we left behind',
    )
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await expect(page.locator('.wr-workspace')).toHaveAttribute(
    'data-compact',
    'true',
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.setViewportSize({ width: 320, height: 900 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  expect(
    await page
      .getByRole('textbox', { name: 'Story title', exact: true })
      .evaluate((node) => node.clientHeight > 60),
  ).toBe(true)
})
