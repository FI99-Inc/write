import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { db } from '@/db/schema'
import { createStory } from '@/db/stories'
import { createProject } from '@/db/projects'
import { SettingsProvider } from '@/engines/SettingsContext'
import { ProjectsPage } from '@/features/projects/ProjectsPage'

const writeGate = vi.hoisted(() => ({
  next: null as Promise<void> | null,
  release: () => {},
}))

vi.mock('@/db/projects', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/projects')>()
  return {
    ...actual,
    addProjectItem: async (
      ...args: Parameters<typeof actual.addProjectItem>
    ) => {
      const pending = writeGate.next
      writeGate.next = null
      if (pending) await pending
      return actual.addProjectItem(...args)
    },
  }
})

beforeEach(async () => {
  localStorage.clear()
  await Promise.all([db.projects.clear(), db.poems.clear(), db.stories.clear()])
})

afterEach(() => {
  writeGate.release()
  writeGate.next = null
  cleanup()
})

it('keeps the next writing choice when an earlier project addition finishes', async () => {
  const idea = await createStory('Research', 'plain', 'idea')
  const story = await createStory('Next chapter', 'plain', 'story')
  const project = await createProject('River notebook')
  const user = userEvent.setup()

  render(
    <SettingsProvider>
      <MemoryRouter initialEntries={[`/projects/${project.id}`]}>
        <Routes>
          <Route path="/projects/:id" element={<ProjectsPage />} />
        </Routes>
      </MemoryRouter>
    </SettingsProvider>,
  )

  const writing = await screen.findByRole('combobox', {
    name: 'Existing writing',
  })
  await screen.findByRole('option', { name: 'Research (idea)' })
  await user.selectOptions(writing, idea.id)
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Use as' }),
    'reference',
  )

  writeGate.next = new Promise<void>((resolve) => {
    writeGate.release = resolve
  })
  const add = screen.getByRole('button', { name: 'Add to project' })
  await user.click(add)
  expect(add).toBeDisabled()

  await user.selectOptions(writing, story.id)
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Use as' }),
    'chapter',
  )
  expect(writing).toHaveValue(story.id)
  await act(async () => {
    writeGate.release()
  })

  await waitFor(() => expect(add).toBeEnabled())
  expect(writing).toHaveValue(story.id)
  await user.click(add)
  await waitFor(() =>
    expect(
      within(
        screen.getByRole('list', { name: 'Project reading order' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(2),
  )
  const saved = await db.projects.get(project.id)
  expect(saved?.items).toEqual([
    { documentId: idea.id, kind: 'idea', role: 'reference' },
    { documentId: story.id, kind: 'story', role: 'chapter' },
  ])
})
