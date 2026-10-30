import type { PoemStatus } from '@/types/poem'
import { POEM_STATUSES } from '@/types/poem'
import type { Collection } from '@/types/collection'
import type { DocKind } from '@/types/libraryDoc'

interface LibraryToolbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  kind: DocKind | null
  onKindChange: (kind: DocKind | null) => void
  status: PoemStatus | null
  onStatusChange: (status: PoemStatus | null) => void
  tag: string | null
  onTagChange: (tag: string | null) => void
  tags: string[]
  collectionId: string | null
  onCollectionChange: (id: string | null) => void
  collections: Collection[]
  favoriteOnly: boolean
  onFavoriteOnlyChange: (value: boolean) => void
  viewMode: 'list' | 'grid'
  onViewModeChange: (mode: 'list' | 'grid') => void
}

export function LibraryToolbar({
  searchQuery,
  onSearchChange,
  kind,
  onKindChange,
  status,
  onStatusChange,
  tag,
  onTagChange,
  tags,
  collectionId,
  onCollectionChange,
  collections,
  favoriteOnly,
  onFavoriteOnlyChange,
  viewMode,
  onViewModeChange,
}: LibraryToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-canvas-line px-4 py-3 text-sm sm:gap-3 sm:px-8">
      {/* Full width below sm so search gets its own row and the filters wrap
       * underneath it, rather than everything fighting over 360px. */}
      <input
        aria-label="Search library"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search your library…"
        className="w-full rounded border border-canvas-line bg-canvas px-3 py-2 outline-none focus:border-indigo sm:w-auto sm:min-w-[10rem] sm:flex-1 sm:py-1.5"
      />

      <div className="flex gap-1 rounded-full border border-canvas-line p-0.5">
        {([null, 'poem', 'story', 'idea'] as const).map((k) => (
          <button
            key={k ?? 'all'}
            type="button"
            onClick={() => onKindChange(k)}
            aria-pressed={kind === k}
            className={`rounded-full px-3 py-1.5 text-xs sm:py-1 ${
              kind === k ? 'bg-indigo text-paper' : 'text-ink/50 hover:text-indigo'
            }`}
          >
            {k === 'poem' ? 'Poems' : k === 'story' ? 'Stories' : k === 'idea' ? 'Ideas' : 'All'}
          </button>
        ))}
      </div>

      <select
        aria-label="Filter by status"
        value={status ?? ''}
        onChange={(e) => onStatusChange((e.target.value || null) as PoemStatus | null)}
        className="max-w-[45vw] rounded border border-canvas-line bg-canvas px-2 py-1.5 text-ink/70 sm:max-w-none"
      >
        <option value="">Any status</option>
        {POEM_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {tags.length > 0 && (
        <select
          aria-label="Filter by tag"
          value={tag ?? ''}
          onChange={(e) => onTagChange(e.target.value || null)}
          className="max-w-[45vw] rounded border border-canvas-line bg-canvas px-2 py-1.5 text-ink/70 sm:max-w-none"
        >
          <option value="">Any tag</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      )}

      {collections.length > 0 && (
        <select
          aria-label="Filter by collection"
          value={collectionId ?? ''}
          onChange={(e) => onCollectionChange(e.target.value || null)}
          className="max-w-[45vw] rounded border border-canvas-line bg-canvas px-2 py-1.5 text-ink/70 sm:max-w-none"
        >
          <option value="">Any collection</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={() => onFavoriteOnlyChange(!favoriteOnly)}
        aria-pressed={favoriteOnly}
        className={`rounded-full px-3 py-1.5 ${favoriteOnly ? 'bg-indigo text-paper' : 'text-ink/50 hover:text-indigo'}`}
      >
        Favorites
      </button>

      <div className="ml-auto flex items-center gap-1 rounded-full border border-canvas-line p-0.5">
        <button
          type="button"
          onClick={() => onViewModeChange('list')}
          aria-pressed={viewMode === 'list'}
          className={`rounded-full px-3 py-1.5 text-xs sm:py-1 ${viewMode === 'list' ? 'bg-indigo text-paper' : 'text-ink/50'}`}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('grid')}
          aria-pressed={viewMode === 'grid'}
          className={`rounded-full px-3 py-1.5 text-xs sm:py-1 ${viewMode === 'grid' ? 'bg-indigo text-paper' : 'text-ink/50'}`}
        >
          Grid
        </button>
      </div>
    </div>
  )
}
