import type { DocKind } from '@/types/libraryDoc'

export type ProjectRole = 'chapter' | 'scene' | 'reference'
export interface ProjectItem {
  documentId: string
  kind: DocKind
  role: ProjectRole
}
export interface Project {
  id: string
  name: string
  description: string
  createdAt: number
  modifiedAt: number
  /** The order in this list is the reading order, independent of modification date. */
  items: ProjectItem[]
}
