/** The imperative surface the workbench sidebar drives, regardless of whether
 * the active editor is the plain textarea or the rich TipTap editor. */
export interface StorySurfaceHandle {
  /** The word under the caret/selection, for Thesaurus/Recent lookups. */
  getActiveWord(): string | null
  /** Insert text at the caret (used by "insert word" from the sidebar). */
  insertText(text: string): void
  /** The plain-text projection, for AI context. */
  getPlainText(): string
  getTextarea?(): HTMLTextAreaElement | null
}
