# WR!TE

A local-first editor for poems, stories, and ideas, with the craft tools built in:
live syllable counts, scansion against a target meter, rhyme-scheme detection,
form templates, and version snapshots.

**[write.fi99.ca](https://write.fi99.ca)**

Everything lives in your browser. Your work is stored in IndexedDB, the CMU
pronouncing dictionary and Moby Thesaurus ship with the app, and nothing is sent
anywhere by default. Writing and loaded tools work offline; the app and analysis data must first load successfully. Offline reload depends on the browser cache. Two optional features reach the
network only after you switch them on: Datamuse lookups for extra rhymes and
synonyms, and an "Ask AI" tab that talks to an Ollama instance you run yourself.

## What's in it

**Poem editor** — a syllable gutter and rhyme-scheme column that stay in step
with the text, a rhyme-color overlay, a clickable scansion overlay you can
correct syllable by syllable, focus mode, and form checking against templates
(sonnet, villanelle, sestina, haiku, acrostic, and others) or your own custom
form.

**Story editor** — a rich-text surface with formatting, headings, lists, and
anchored comment threads, or a plain-text one if you prefer. Word count,
paragraph count, and reading time.

**Workbench** — rhymes, thesaurus, syllables and stress, sound tools
(alliteration, assonance, consonance), meter analysis, prompts, and recent
lookups, in a panel beside the writing surface.

**Ideas** — notes, fragments, and research with the prose editor, comments, and version history. The Ideas document type is separate from the idea workflow status.

**Trash** — recover deleted writing together with its saved versions. Permanent deletion requires confirmation. Library backups include Trash; earlier orphaned history can be recovered from the Trash screen.

**Library** — search, tags, status, editable collection membership, favorites, validated JSON import/export,
a writing-streak heatmap, and per-document version history with diffs.

## Development

```sh
npm install
npm run dev      # vite dev server
npm test         # vitest
npm run lint     # oxlint
npm run build    # tsc -b && vite build
```

The bundled dictionary and thesaurus in `public/data/` are generated from the
raw sources in `scripts/raw/` by `node scripts/build-dictionary.mjs`.

Pushing to `master` deploys to GitHub Pages via `.github/workflows/deploy.yml`.

## Persistence and backup compatibility

Edits are debounced and flushed when leaving the editor or hiding the page. Pending or failed writes have a temporary recovery copy in this tab's session storage where available. Save failures remain visible after navigation. Browser storage denial, forced process termination, and deletion of browser data cannot be made reliable by the app; export library backups for a separate copy.

Backups use version 2 and include Ideas, Trash, comments, and history. Version 1 imports remain supported. Imports validate before writing, remap colliding document/collection/form IDs, and add copies alongside current writing. Legacy comment anchors without a thread are removed while writing and recoverable thread text are kept. Older safely readable form rules remain importable; new custom forms enforce whole-number constraints.

Large history rewrites are compared in bounded memory; very large changed passages may be grouped rather than shown as a minimal edit sequence. Dictionary/rhyme indexes are reused across routes, and print output is built only when printing.
