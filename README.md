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

**Writing workspace** — Quiet puts away the Project and Tools rails; Workspace restores their saved arrangement. Panels open independently, with native drawers on smaller screens. Appearance offers Olive, Dusk, Sand, Light, and Dark; new settings use Olive, while existing choices and writing preferences carry forward. Titles wrap, tool tabs support keyboard navigation, and document actions remain available in both views.

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

**Projects** — organize existing writing as chapters, scenes, and research, with reading order, drag reordering, keyboard controls, and navigation between entries. Removing a Project keeps its writing. Developing an Idea creates a linked poem or story and copies its versions; the original Idea and its rich notes stay available.

**Revisions** — name checkpoints, compare any two versions, preview formatting, and restore selected lines or rich-text blocks. Restores save a safety version first and reject stale targets.

**Find and replace** — literal document search with case and Unicode-aware whole-word matching; one-step replacement undo; jump to a heading or line. Search highlights follow formatting changes. Very broad searches are capped at 5,000 displayed matches; narrow the query to replace all.

**Document interchange** — preview local TXT, Markdown, and DOCX imports as new writing; export Word documents alongside existing text, Markdown, HTML, and print/PDF options. Conversion runs in cancellable workers. Basic formatting, lists, headings, code, and line breaks are supported. Word page layout, images, and anchored Word comments are outside this editor's document model; library JSON is the lossless format for app history and metadata. TXT/Markdown inputs are limited to 5 MB; DOCX to 15 MB, with a 30-second conversion deadline.

**Backups** — download a complete library copy, preview a restore, or connect a folder for automatic backups in supporting browsers. While the app is open and visible, changed libraries are checked at a 5-, 10-, or 30-minute interval. Each folder connection maintains twelve rotating app-owned files in a dedicated subfolder. Previous connections' files are retained. Permission may require reconnecting after browser restart. Writes are coordinated across tabs and reported successful only after file close; changing folders resets its health status. Unsupported browsers retain download and restore workflows. Folder handles and permissions are never exported.

**Writing comfort** — adjustable writing width and typography, a compact formatting toolbar, a quieter workbench tool chooser, and mobile comment selection/focus. Optional AI tools appear in the workbench when enabled in Settings.

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
npx playwright install chromium
npm run test:e2e # production build required; isolated browser regression + performance checks
npm run test:perf # large-library and long-document budgets
```

The bundled dictionary and thesaurus in `public/data/` are generated from the
raw sources in `scripts/raw/` by `node scripts/build-dictionary.mjs`.

Pushing to `master` deploys to GitHub Pages via `.github/workflows/deploy.yml`.

Browser checks use the production preview on loopback port 4174. On Windows, `$env:PLAYWRIGHT_CHANNEL='chrome'` selects installed Chrome; CI installs Chromium. Tests use isolated browser contexts, not a writer's existing browser profile. Performance fixtures cover 5,000 documents, a 5,000-paragraph plain manuscript, and a 1,000-paragraph rich manuscript. The large-library screen mounts 100 rows at a time. CI runs unit tests, lint, build, and browser checks before deploying.

## Persistence and backup compatibility

Edits are debounced and flushed when leaving the editor or hiding the page. Pending or failed writes have a temporary recovery copy in this tab's session storage where available. Save failures remain visible after navigation. Browser storage denial, forced process termination, and deletion of browser data cannot be made reliable by the app; export library backups for a separate copy.

Backups use version 3 and include Projects, source Idea links, Ideas, Trash, comments, and history. Version 1 and 2 imports remain supported. IndexedDB version 9 adds Projects and local backup preferences without rewriting existing writing. Imports validate before writing, remap colliding document/Project/collection/form IDs, and add copies alongside current writing. Legacy comment anchors without a thread are removed while writing and recoverable thread text are kept. Older safely readable form rules remain importable; new custom forms enforce whole-number constraints.

Large history rewrites are compared in bounded memory; very large changed passages may be grouped rather than shown as a minimal edit sequence. Dictionary/rhyme indexes are reused across routes, and print output is built only when printing.


Plain writing uses an incremental paragraph editor with one literal line per paragraph. It keeps raw plain-text storage, single-newline Enter, exact copy/cut/paste line breaks, and native undo, while avoiding the measured large-textarea input bottleneck.
