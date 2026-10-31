import { test, expect, type Page } from '@playwright/test'

async function newWriting(page: Page, kind = 'story', title = 'Test writing', body = 'First line') {
  await page.goto('/')
  await page
    .getByRole('button', { name: `New ${kind}`, exact: true })
    .first()
    .click()
  await page
    .getByRole('textbox', { name: `${kind === 'idea' ? 'Idea' : 'Story'} title`, exact: true })
    .fill(title)
  await page.locator('[contenteditable="true"]').fill(body)
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible()
}
async function checkpoint(page: Page, name: string) {
  await page.getByRole('button', { name: 'Checkpoint', exact: true }).click()
  await page.getByLabel('Name (optional)').fill(name)
  await page.getByRole('button', { name: 'Save checkpoint', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
}
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error
  })
})

test('rich paste, find/replace, undo, and saving survive navigation', async ({ page }) => {
  await newWriting(page, 'story', 'Paste and search', 'Before')
  const url = page.url(),
    surface = page.locator('[contenteditable="true"]')
  await surface.click()
  await page.keyboard.press('ControlOrMeta+End')
  await surface.evaluate((element) => {
    const transfer = new DataTransfer()
    transfer.setData('text/html', '<p style="color:red"><b>Bold</b><br/>Second</p><p>Third</p>')
    element.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }),
    )
  })
  await expect(surface.locator('strong')).toHaveText('Bold')
  await page.keyboard.press('ControlOrMeta+z')
  await expect(surface).toHaveText('Before')
  await surface.fill('cat Cat scatter cat')
  await page.getByRole('button', { name: 'Find / replace', exact: true }).click()
  await page.getByRole('textbox', { name: 'Find', exact: true }).fill('cat')
  await page.getByLabel('Whole words', { exact: true }).check()
  await page.getByRole('textbox', { name: 'Replace with', exact: true }).fill('fox')
  await page.getByRole('button', { name: 'Replace all', exact: true }).click()
  await expect(surface).toHaveText('fox fox scatter fox')
  await page.keyboard.press('ControlOrMeta+z')
  await expect(surface).toHaveText('cat Cat scatter cat')
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible()
  await page.getByRole('link', { name: 'Library', exact: true }).click()
  await page.goto(url)
  await expect(surface).toHaveText('cat Cat scatter cat')
})

test('Idea development retains source and named versions; Projects reorder by stable identity', async ({
  page,
}) => {
  await newWriting(page, 'idea', 'Seed idea', 'A seed for a story')
  const ideaUrl = page.url()
  await checkpoint(page, 'First thought')
  await page.getByRole('button', { name: 'Develop Idea', exact: true }).click()
  await page.getByRole('button', { name: 'As story', exact: true }).click()
  await expect(page).toHaveURL(/\/story\//)
  const storyUrl = page.url()
  await expect(page.getByRole('link', { name: 'Source Idea and notes' })).toHaveAttribute(
    'href',
    new URL(ideaUrl).pathname,
  )
  await page.getByRole('link', { name: 'History', exact: true }).click()
  await expect(page.locator('input[value="First thought"]')).toBeVisible()
  await page.goto('/projects')
  await page.getByRole('textbox', { name: 'New project', exact: true }).fill('A book')
  await page.getByRole('button', { name: 'Create project', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Existing writing', exact: true })
    .selectOption({ label: 'Seed idea (idea)' })
  await page.getByRole('combobox', { name: 'Use as', exact: true }).selectOption('reference')
  await page.getByRole('button', { name: 'Add to project', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Existing writing', exact: true })
    .selectOption({ label: 'Seed idea (story)' })
  await page.getByRole('combobox', { name: 'Use as', exact: true }).selectOption('chapter')
  await page.getByRole('button', { name: 'Add to project', exact: true }).click()
  const reading = page.getByRole('list', { name: 'Project reading order' })
  await expect(reading.getByRole('listitem')).toHaveCount(2)
  await reading.getByRole('button', { name: 'Move Seed idea up', exact: true }).last().click()
  await expect(reading.getByRole('listitem').first().getByRole('link')).toHaveAttribute(
    'href',
    new URL(storyUrl).pathname,
  )
  await page.reload()
  await expect(reading.getByRole('listitem').first().getByRole('link')).toHaveAttribute(
    'href',
    new URL(storyUrl).pathname,
  )
})

test('named checkpoint and selected passage restoration preserve the remainder', async ({
  page,
}) => {
  await newWriting(page, 'story', 'Revisions', 'Old opening')
  const surface = page.locator('[contenteditable="true"]')
  await surface.press('ControlOrMeta+End')
  await surface.press('Enter')
  await page.keyboard.insertText('Untouched ending')
  await checkpoint(page, 'Before rewrite')
  await surface.fill('New opening')
  await surface.press('Enter')
  await page.keyboard.insertText('Untouched ending')
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible()
  await page.getByRole('link', { name: 'History', exact: true }).click()
  await expect(page.getByRole('textbox', { name: /Name version/ }).first()).toHaveValue(
    'Before rewrite',
  )
  await page.getByRole('button', { name: 'Restore selected passage', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Passage restored')
  await expect(page.locator('input[value="Before passage restore"]')).toBeVisible()
  await page.getByRole('link', { name: 'Back to writing', exact: true }).click()
  await expect(surface).toContainText('Old opening')
  await expect(surface).toContainText('Untouched ending')
})

test('Markdown and Word worker imports preview safely; Word download reimports', async ({
  page,
}) => {
  await page.goto('/')
  const externalRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('tracker.invalid')) externalRequests.push(request.url())
  })
  await page.getByRole('button', { name: 'Import document', exact: true }).click()
  await page.getByLabel('Document file', { exact: true }).setInputFiles({
    name: 'notes.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(
      '# Imported title\n\n**Bold** and *italic*\n\n- List item\n\n<script>alert(1)</script><img src="https://tracker.invalid/image" onerror="alert(1)" alt="image note"/>',
    ),
  })
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
    'Imported title',
  )
  await expect(page.getByRole('dialog').locator('strong')).toHaveText('Bold')
  await expect(page.getByRole('dialog').locator('script,img,iframe')).toHaveCount(0)
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Import document', exact: true })
    .click()
  const surface = page.locator('[contenteditable="true"]')
  await expect(surface).toContainText('Bold and italic')
  expect(externalRequests).toEqual([])
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download .docx', exact: true }).click()
  const download = await downloadPromise,
    path = await download.path()
  expect(download.suggestedFilename()).toBe('imported-title.docx')
  expect(path).toBeTruthy()
  await page.getByRole('link', { name: 'Library', exact: true }).click()
  await page.getByRole('button', { name: 'Import document', exact: true }).click()
  await page.getByLabel('Document file', { exact: true }).setInputFiles({
    name: 'roundtrip.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: await import('node:fs/promises').then((fs) => fs.readFile(path!)),
  })
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
    'Imported title',
  )
  await expect(page.getByRole('dialog').locator('strong')).toHaveText('Bold')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Import document', exact: true })
    .click()
  await expect(surface.locator('em')).toHaveText('italic')
})

test('backup folder writes real files, survives reload, and restores through preview', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: async () => navigator.storage.getDirectory(),
    })
  })
  await newWriting(page, 'idea', 'Backup seed', 'Keep this writing')
  await page.getByRole('link', { name: 'Library', exact: true }).click()
  await page.getByRole('link', { name: 'Backups', exact: true }).click()
  await page.getByRole('button', { name: 'Choose backup folder', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Backup saved')
  await page.reload()
  await expect(page.getByText('Automatic backups on', { exact: true })).toBeVisible()
  const backup = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const folder = await root.getDirectoryHandle('WR!TE Backups')
    for await (const [name, handle] of (
      folder as unknown as { entries: () => AsyncIterableIterator<[string, FileSystemFileHandle]> }
    ).entries()) {
      const file = await handle.getFile()
      return { name, text: await file.text() }
    }
    throw new Error('No backup file')
  })
  const other = await page.context().newPage()
  await other.goto('/backups')
  // Start both handlers together; background tabs cannot receive simultaneous
  // physical clicks, and Chromium can suspend their actionability frames.
  await Promise.all([
    page.getByRole('button', { name: 'Back up now', exact: true }).dispatchEvent('click'),
    other.getByRole('button', { name: 'Back up now', exact: true }).dispatchEvent('click'),
  ])
  await expect(page.getByRole('status')).toContainText('Backup saved')
  await expect(other.getByRole('status')).toContainText('Backup saved')
  const fileCount = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const folder = await root.getDirectoryHandle('WR!TE Backups')
    let count = 0
    for await (const _entry of (
      folder as unknown as { entries: () => AsyncIterableIterator<unknown> }
    ).entries())
      count++
    return count
  })
  expect(fileCount).toBe(3)
  await other.close()
  expect(backup.text).toContain('Backup seed')
  expect(backup.text).not.toContain('backupPreferences')
  await page.getByLabel('Choose library backup', { exact: true }).setInputFiles({
    name: backup.name,
    mimeType: 'application/json',
    buffer: Buffer.from(backup.text),
  })
  await expect(page.getByRole('dialog', { name: 'Backup preview' })).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('Backup seed')
  await page.getByRole('button', { name: 'Restore as copies', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Restored')
})

test('mobile editor controls and import dialog fit without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await newWriting(page, 'story', 'Mobile', 'Select and comment on writing')
  await page.getByRole('button', { name: 'Find / replace', exact: true }).click()
  await page.getByRole('textbox', { name: 'Find', exact: true }).fill('writing')
  await page.getByRole('button', { name: 'Next match', exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByRole('button', { name: 'Close find', exact: true }).click()
  await page.getByRole('button', { name: 'More formatting', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Clear color', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Add comment', exact: true }).first().click()
  await expect(page.getByRole('textbox', { name: 'Comment text', exact: true })).toBeFocused()
  await page.getByRole('textbox', { name: 'Comment text', exact: true }).fill('Mobile comment')
  await page.getByRole('button', { name: 'Close workbench panel', exact: true }).click()

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('search positions follow list formatting and initial Previous finds the last match', async ({
  page,
}) => {
  await newWriting(page, 'story', 'Live positions', 'cat cat')
  await page.getByRole('button', { name: 'Find / replace', exact: true }).click()
  await page.getByRole('textbox', { name: 'Find', exact: true }).fill('cat')
  await page.getByRole('textbox', { name: 'Replace with', exact: true }).fill('fox')
  await page.getByRole('button', { name: 'Previous match', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: '2 of 2 matches' })).toBeVisible()
  await page.getByRole('button', { name: 'Bullet list', exact: true }).click()
  await page.getByRole('button', { name: 'Replace match', exact: true }).click()
  await expect(page.locator('[contenteditable="true"] ul')).toHaveText('cat fox')
})

test('failed save stays recoverable after leaving the editor', async ({ page }) => {
  await newWriting(page, 'story', 'Recovery', 'Saved original')
  await page.evaluate(() => {
    const state = window as unknown as { denyStorySave: boolean }
    state.denyStorySave = true
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof original>) {
      if (this.name === 'stories' && state.denyStorySave)
        throw new DOMException('Test quota failure', 'QuotaExceededError')
      return original.apply(this, args)
    }
  })
  await page.locator('[contenteditable="true"]').fill('Recover this latest draft')
  await page.getByRole('link', { name: 'Library', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Some recent changes could not be saved')
  await page.evaluate(() => {
    ;(window as unknown as { denyStorySave: boolean }).denyStorySave = false
  })
  await page.getByRole('link', { name: 'Reopen writing to retry', exact: true }).click()
  await expect(page.locator('[contenteditable="true"]')).toHaveText('Recover this latest draft')
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('[contenteditable="true"]')).toHaveText('Recover this latest draft')
})

test('Trash restores writing and history, then purges both only after confirmation', async ({
  page,
}) => {
  await newWriting(page, 'story', 'Trash lifecycle', 'Keep until I confirm')
  const url = page.url()
  await checkpoint(page, 'Preserved history')
  await page.getByRole('link', { name: 'Library', exact: true }).click()
  await page.getByRole('button', { name: 'Move to Trash: "Trash lifecycle"', exact: true }).click()
  await page.getByRole('button', { name: 'Move to Trash', exact: true }).click()
  await page.getByRole('link', { name: 'Trash', exact: true }).click()
  let row = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: 'Trash lifecycle', exact: true }) })
  await row.getByRole('button', { name: 'Restore', exact: true }).click()
  await page.goto(url)
  await expect(page.locator('[contenteditable="true"]')).toHaveText('Keep until I confirm')
  await page.getByRole('link', { name: 'History', exact: true }).click()
  await expect(page.locator('input[value="Preserved history"]')).toBeVisible()
  await page.goto('/')
  await page.getByRole('button', { name: 'Move to Trash: "Trash lifecycle"', exact: true }).click()
  await page.getByRole('button', { name: 'Move to Trash', exact: true }).click()
  await page.getByRole('link', { name: 'Trash', exact: true }).click()
  row = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: 'Trash lifecycle', exact: true }) })
  await row.getByRole('button', { name: 'Delete permanently', exact: true }).click()
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Confirm permanent deletion', exact: true }).click()
  await expect(row).toHaveCount(0)
  await page.goto(url)
  await expect(
    page.getByText('This writing is unavailable. It may be in Trash.', { exact: true }),
  ).toBeVisible()
})

test('wrapped plain prose search scrolls the found passage into view', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Plain text', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'New story', exact: true }).first().click()
  const text = 'A paragraph that wraps onto many visual lines. '.repeat(600) + 'needle'
  const textarea = page.getByRole('textbox', { name: 'Writing text', exact: true })
  await textarea.fill(text)
  await page.getByRole('button', { name: 'Find / replace', exact: true }).click()
  await page.getByRole('textbox', { name: 'Find', exact: true }).fill('needle')
  await page.getByRole('button', { name: 'Next match', exact: true }).click()
  const scroll = await page.locator('main').evaluate((element) => ({
    top: element.scrollTop,
    height: element.scrollHeight,
    client: element.clientHeight,
  }))
  expect(scroll.top).toBeGreaterThan((scroll.height - scroll.client) * 0.8)
  expect(await textarea.evaluate(() => window.getSelection()?.toString())).toBe('needle')
})

test('TXT line breaks survive import and invalid Word files leave the dialog usable', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Import document', exact: true }).click()
  await page.getByLabel('Document file', { exact: true }).setInputFiles({
    name: 'broken.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: Buffer.from('This is not a Word archive'),
  })
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Import document', exact: true }),
  ).toBeDisabled()
  await page.getByLabel('Document file', { exact: true }).setInputFiles({
    name: 'lines.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('\uFEFFFirst\r\nSecond\r\n\r\n\r\nLast'),
  })
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('lines')
  await page.getByRole('combobox', { name: 'Add as', exact: true }).selectOption('poem')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Import document', exact: true })
    .click()
  await expect(page.getByRole('textbox', { name: 'Poem text', exact: true })).toHaveValue(
    'First\nSecond\n\n\nLast',
  )
})

test('plain writing preserves Enter, multiline paste, undo, line navigation, and reload', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Plain text', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'New story', exact: true }).first().click()
  await expect(page).toHaveURL(/\/story\//)
  const url = page.url(),
    surface = page.getByRole('textbox', { name: 'Writing text', exact: true })
  const text = () =>
    surface.evaluate((element) =>
      [...element.children].map((child) => child.textContent ?? '').join('\n'),
    )
  await surface.fill('First')
  await surface.press('ControlOrMeta+End')
  await surface.press('Enter')
  await page.keyboard.insertText('Second')
  await expect.poll(text).toBe('First\nSecond')
  await surface.evaluate((element) => {
    const data = new DataTransfer()
    data.setData('text/plain', '\n\n\nThird\n')
    element.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    )
  })
  await expect.poll(text).toBe('First\nSecond\n\n\nThird\n')
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(text).toBe('First\nSecond')
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect.poll(text).toBe('First\nSecond\n\n\nThird\n')
  await surface.press('ControlOrMeta+a')
  await page.keyboard.press('ControlOrMeta+c')
  await surface.fill('')
  await page.keyboard.press('ControlOrMeta+v')
  await expect.poll(text).toBe('First\nSecond\n\n\nThird\n')
  await surface.press('ControlOrMeta+a')
  await page.keyboard.press('ControlOrMeta+x')
  await expect.poll(text).toBe('')
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(text).toBe('First\nSecond\n\n\nThird\n')
  await page.getByRole('button', { name: 'Find / replace', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Jump to line', exact: true }).fill('5')
  await page.getByRole('button', { name: 'Go to line', exact: true }).click()
  // TipTap applies DOM focus on the next animation frame.
  await expect(surface).toBeFocused()
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe('Third')
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible()
  await page.getByRole('link', { name: 'Library', exact: true }).click()
  await page.goto(url)
  await expect.poll(text).toBe('First\nSecond\n\n\nThird\n')
})
