import { db } from '@/db/schema'
import { createDocument } from '@/db/documents'
import { updatePoem } from '@/db/poems'
import { updateStory } from '@/db/stories'
import { createSnapshot } from '@/db/snapshots'
import type { DocKind } from '@/types/libraryDoc'
import type { ImportedDocument } from '@/engines/interchange/importDocument'
export async function saveImportedDocument(imported: ImportedDocument, kind: DocKind) {
  return db.transaction('rw', [db.poems, db.stories, db.snapshots], async () => {
    const doc = await createDocument(kind, 'rich')
    const changes = { title: imported.title, body: imported.body }
    if (kind === 'poem') await updatePoem(doc.id, changes)
    else await updateStory(doc.id, { ...changes, content: imported.content, comments: [] })
    await createSnapshot(
      doc.id,
      imported.title,
      imported.body,
      'Imported document',
      imported.content,
      [],
    )
    return doc
  })
}
