import type { Node } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import {
  findTextMatches,
  MAX_SEARCH_MATCHES,
  type SearchOptions,
  type TextMatch,
} from '@/engines/findReplace'

export function findRichMatches(doc: Node, query: string, options: SearchOptions): TextMatch[] {
  if (!query) return []
  const matches: TextMatch[] = []
  doc.descendants((node, position) => {
    if (matches.length >= MAX_SEARCH_MATCHES) return false
    if (!node.isTextblock) return
    for (const match of findTextMatches(
      node.textBetween(0, node.content.size, '', '\n'),
      query,
      options,
      MAX_SEARCH_MATCHES - matches.length,
    ))
      matches.push({ from: position + 1 + match.from, to: position + 1 + match.to })
    return false
  })
  return matches
}
export const searchKey = new PluginKey<DecorationSet>('writing-search')
export function searchPlugin(query: string, options: SearchOptions): Plugin<DecorationSet> {
  const decorate = (doc: Node) =>
    DecorationSet.create(
      doc,
      findRichMatches(doc, query, options).map((match) =>
        Decoration.inline(match.from, match.to, { class: 'search-match' }),
      ),
    )
  return new Plugin({
    key: searchKey,
    state: {
      init: (_, state) => decorate(state.doc),
      apply: (tr, previous) =>
        tr.docChanged ? decorate(tr.doc) : previous.map(tr.mapping, tr.doc),
    },
    props: { decorations: (state) => searchKey.getState(state) },
  })
}
