import { useDeferredValue, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, Link } from 'react-router-dom'
import { createDocument, listDocuments } from '@/db/documents'
import { listCollections } from '@/db/collections'
import { listCustomForms } from '@/db/customForms'
import { useSettings } from '@/engines/useSettings'
import { filterPoems, allTags } from '@/engines/libraryFilter'
import { BUILT_IN_TEMPLATES_BY_ID } from '@/engines/formTemplates/index'
import type { PoemStatus } from '@/types/poem'
import { documentPath, type DocKind } from '@/types/libraryDoc'
import { LibraryListItem } from '@/features/library/LibraryListItem'
import { LibraryToolbar } from '@/features/library/LibraryToolbar'
import { CollectionsPanel } from '@/features/library/CollectionsPanel'
import { ImportExportPanel } from '@/features/library/ImportExportPanel'
import { SettingsPanel } from '@/features/settings/SettingsPanel'

export function LibraryPage() {
  const { settings } = useSettings()
  const docs = useLiveQuery(() => listDocuments(), [])
  const collections = useLiveQuery(() => listCollections(), []) ?? []
  const customForms = useLiveQuery(() => listCustomForms(), []) ?? []
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [kind, setKind] = useState<DocKind | null>(null)
  const [status, setStatus] = useState<PoemStatus | null>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [collectionId, setCollectionId] = useState<string | null>(null)
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const deferredSearch = useDeferredValue(searchQuery)

  const tags = useMemo(() => allTags(docs ?? []), [docs])

  const filteredDocs = useMemo(() => {
    if (!docs) return undefined
    return filterPoems(docs, {
      searchQuery: deferredSearch,
      kind,
      status,
      tag,
      collectionId,
      favoriteOnly,
    })
  }, [docs, deferredSearch, kind, status, tag, collectionId, favoriteOnly])

  function formName(formId?: string | null): string | null {
    if (!formId) return null
    return (
      BUILT_IN_TEMPLATES_BY_ID[formId]?.name ??
      customForms.find((f) => f.id === formId)?.name ??
      null
    )
  }

  async function handleNew(kind: DocKind) {
    const doc = await createDocument(kind, settings.storyEditorMode)
    navigate(documentPath(doc))
  }

  return (
    <div className="min-h-full bg-canvas">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-canvas-line px-4 py-4 sm:px-8 sm:py-6">
        {/* The exclamation stands in for the I — the mark of emphasis sitting
         * inside the word itself. Tracked out so it reads as a masthead. */}
        <h1 className="mr-auto font-display text-xl tracking-[0.2em] text-ink sm:text-2xl">
          WR<span className="text-indigo">!</span>TE
        </h1>
        <nav aria-label="Library actions" className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link to="/stats" className="header-action">
            Stats
          </Link>
          <ImportExportPanel />
          <SettingsPanel />
          <Link to="/trash" className="header-action">
            Trash
          </Link>
        </nav>
        {/* `w-full` drops the pair onto its own full-width row below sm,
         * where they'd otherwise be squeezed to a couple of characters. */}
        <div className="flex w-full gap-2 sm:w-auto sm:gap-3">
          <button
            type="button"
            onClick={() => void handleNew('idea')}
            className="flex-1 rounded-full border border-canvas-line px-3 py-2.5 text-sm font-medium text-ink/70 hover:border-indigo hover:text-indigo sm:flex-none"
          >
            New idea
          </button>
          <button
            type="button"
            onClick={() => void handleNew('story')}
            className="flex-1 rounded-full border border-canvas-line px-3 py-2.5 sm:px-5 text-sm font-medium text-ink/70 transition-colors hover:border-indigo hover:text-indigo sm:flex-none sm:py-2"
          >
            New story
          </button>
          <button
            type="button"
            onClick={() => void handleNew('poem')}
            className="flex-1 rounded-full bg-indigo px-3 py-2.5 sm:px-5 text-sm font-medium text-paper transition-colors hover:bg-indigo-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo sm:flex-none sm:py-2"
          >
            New poem
          </button>
        </div>
      </header>

      <CollectionsPanel collections={collections} />

      <LibraryToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        kind={kind}
        onKindChange={setKind}
        status={status}
        onStatusChange={setStatus}
        tag={tag}
        onTagChange={setTag}
        tags={tags}
        collectionId={collectionId}
        onCollectionChange={setCollectionId}
        collections={collections}
        favoriteOnly={favoriteOnly}
        onFavoriteOnlyChange={setFavoriteOnly}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
        {docs === undefined ? (
          <p className="text-sm text-ink/50">Loading your library…</p>
        ) : docs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-canvas-line px-5 py-12 text-center sm:px-6 sm:py-16">
            <p className="font-display text-lg text-ink/70">An empty shelf.</p>
            <p className="mt-2 text-sm text-ink/50">Start a poem, story, or idea.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleNew('story')}
                className="rounded-full border border-canvas-line px-3 py-2.5 sm:px-5 text-sm font-medium text-ink/70 transition-colors hover:border-indigo hover:text-indigo sm:py-2"
              >
                New story
              </button>
              <button
                type="button"
                onClick={() => void handleNew('poem')}
                className="rounded-full bg-indigo px-3 py-2.5 sm:px-5 text-sm font-medium text-paper transition-colors hover:bg-indigo-soft sm:py-2"
              >
                New poem
              </button>
            </div>
          </div>
        ) : filteredDocs && filteredDocs.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink/50">Nothing matches these filters.</p>
        ) : viewMode === 'list' ? (
          <ul className="divide-y divide-canvas-line rounded-lg border border-canvas-line bg-paper">
            {filteredDocs?.map((doc) => (
              <li key={doc.id}>
                <LibraryListItem
                  doc={doc}
                  collections={collections}
                  formName={formName(doc.formId)}
                  viewMode="list"
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocs?.map((doc) => (
              <LibraryListItem
                key={doc.id}
                doc={doc}
                collections={collections}
                formName={formName(doc.formId)}
                viewMode="grid"
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
