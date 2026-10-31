export type Screen = 'library' | 'editor' | 'project'
export type Kind = 'poem' | 'story' | 'idea'
export type Direction = 'A' | 'B' | 'C' | 'D' | 'E'
export interface DemoDoc {
  id: string
  kind: Kind
  title: string
  body: string
  status: 'Draft' | 'Revising' | 'Done'
  date: string
  collection: string
  favorite?: boolean
}
export const directions = [
  {
    id: 'A',
    name: 'Index',
    description: 'A precise catalog. Everything is close at hand.',
    structure: 'Persistent navigation, dense document index, contextual tools.',
    palette: ['#F8FAFC', '#FFFFFF', '#19212B', '#667485', '#315CBA', '#DDE3EB'],
  },
  {
    id: 'B',
    name: 'Folio',
    description: 'Build a manuscript, one piece at a time.',
    structure: 'Project binder, manuscript spread, research alongside the draft.',
    palette: ['#E8EDF1', '#FFFFFF', '#15263B', '#1C354B', '#3A6D84', '#C9D5DF'],
  },
  {
    id: 'C',
    name: 'Margin',
    description: 'The writing takes almost the whole room.',
    structure: 'Quiet writing, expandable project navigation, and independent tools.',
    palette: ['#FFFFFF', '#F4F6F2', '#313634', '#6C746D', '#45624C', '#DDE4DC'],
  },
  {
    id: 'D',
    name: 'Studio',
    description: 'An active desk for writing and revising.',
    structure: 'Compact rail, split preview, workbench docked below the text.',
    palette: ['#1C252B', '#243139', '#2A3942', '#EDF1EE', '#C9B486', '#9EADB2'],
  },
  {
    id: 'E',
    name: 'Commonplace',
    description: 'A personal notebook with a useful index.',
    structure: 'Document-type tabs, dated entries, a page with a working margin.',
    palette: ['#F5F0E5', '#FFFEF9', '#403A32', '#696A43', '#70464C', '#D6CCBA'],
  },
] as const

const poem = `The river dropped six inches in the night.
We found the stone I thought the flood had taken.
You set your coat beside it in the light
and waited while the morning trains awakened.

I counted windows moving past the bridge.
You tried to read a number on the engine.
The cup you left was balanced on the edge.
I put it in my pocket without thinking.`
const story = `By the time Mara reached the river, the rain had stopped.

Across the water, the station windows held the last of the morning light. She counted three open doors and chose the one nearest the stairs.

In her pocket was a ticket she had meant to throw away.

The man behind the counter looked up. “You can leave your coat here,” he said. Mara kept it on.`
export const initialDocs: DemoDoc[] = [
  {
    id: 'water',
    kind: 'poem',
    title: 'Low water',
    body: poem,
    status: 'Revising',
    date: 'Today',
    collection: 'River notebook',
    favorite: true,
  },
  {
    id: 'crossing',
    kind: 'story',
    title: 'The crossing',
    body: story,
    status: 'Draft',
    date: 'Today',
    collection: 'River notebook',
  },
  {
    id: 'objects',
    kind: 'idea',
    title: 'Objects to return to',
    body: 'The chipped cup. The station clock. A coat left on the chair.\n\nLet each object return with a different meaning.\n\nThe cup belongs in the final scene. The clock does not need to work.',
    status: 'Draft',
    date: 'Today',
    collection: 'River notebook',
    favorite: true,
  },
  {
    id: 'train',
    kind: 'story',
    title: 'A room above the station',
    body: 'The room was small enough to hear the clock downstairs.\n\nMara set her bag on the chair. In the window, the river was a thin band of light.',
    status: 'Revising',
    date: 'Yesterday',
    collection: 'River notebook',
  },
  {
    id: 'oranges',
    kind: 'poem',
    title: 'Winter oranges',
    body: 'You left the oranges beside the sink.\nThe kitchen smelled of rain and cut-up fruit.\nI washed a glass and waited for the kettle.',
    status: 'Done',
    date: 'Yesterday',
    collection: 'Small hours',
  },
  {
    id: 'begin',
    kind: 'idea',
    title: 'Where to begin',
    body: 'Start at the station, after the conversation has already ended. We should not know whose ticket she is carrying.',
    status: 'Draft',
    date: 'Oct 28',
    collection: 'River notebook',
  },
  {
    id: 'coast',
    kind: 'poem',
    title: 'Letter from the coast',
    body: 'I meant to tell you how the house has changed.\nThe chair is where it was. The light is not.\nAt four the neighbor brings the washing in.',
    status: 'Draft',
    date: 'Oct 28',
    collection: 'Small hours',
  },
  {
    id: 'opening',
    kind: 'idea',
    title: 'Opening images',
    body: 'Wet pavement. A paper ticket. The clock reflected in the station window. Keep the opening concrete.',
    status: 'Draft',
    date: 'Oct 27',
    collection: 'Uncollected',
  },
  {
    id: 'visitor',
    kind: 'story',
    title: 'The visitor',
    body: 'We heard the car before we saw it. My father went to the door with the dish towel still over his shoulder.',
    status: 'Done',
    date: 'Oct 26',
    collection: 'Small hours',
  },
  {
    id: 'window',
    kind: 'poem',
    title: 'Window light',
    body: 'The afternoon has reached the other wall.\nA patch of sun is moving up your sleeve.\nYou ask me if the plant has had enough.',
    status: 'Revising',
    date: 'Oct 25',
    collection: 'Small hours',
  },
  {
    id: 'station',
    kind: 'idea',
    title: 'Research: the station',
    body: 'The line opened in 1897. Ask about the old waiting room. Find a photograph of the bridge before it was rebuilt.',
    status: 'Draft',
    date: 'Oct 24',
    collection: 'River notebook',
  },
  {
    id: 'garden',
    kind: 'story',
    title: 'The garden in November',
    body: 'Every Sunday she swept the path, even when there was nothing on it but rain.',
    status: 'Draft',
    date: 'Oct 23',
    collection: 'Uncollected',
  },
]
export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0)
export const plural = (kind: Kind) =>
  kind === 'story' ? 'Stories' : kind === 'poem' ? 'Poems' : 'Ideas'
export const kindName = (kind: Kind) =>
  kind === 'idea' ? 'Idea' : kind === 'poem' ? 'Poem' : 'Story'
