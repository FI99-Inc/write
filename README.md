# WR!TE

A local-first editor for poems and short stories, with the craft tools built in:
live syllable counts, scansion against a target meter, rhyme-scheme detection,
form templates, and version snapshots.

**[write.fi99.ca](https://write.fi99.ca)**

Everything lives in your browser. Your work is stored in IndexedDB, the CMU
pronouncing dictionary and Moby Thesaurus ship with the app, and nothing is sent
anywhere — the whole thing works offline. Two optional features reach the
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

**Library** — search, tags, status, collections, favorites, JSON import/export,
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
