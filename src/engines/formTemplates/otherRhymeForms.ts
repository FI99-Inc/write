import type { FormTemplate, LineRule } from '@/types/form'
import { parseRhymeSchemeString } from '@/engines/rhymeSchemeString'

const GHAZAL_COUPLETS = 5

function ghazalLineRules(): LineRule[] {
  const rules: LineRule[] = []
  for (let couplet = 0; couplet < GHAZAL_COUPLETS; couplet++) {
    rules.push(couplet === 0 ? { endWordMatches: 1 } : {})
    rules.push(couplet === 0 ? {} : { endWordMatches: 1 })
  }
  return rules
}

export const ghazal: FormTemplate = {
  id: 'ghazal',
  name: 'Ghazal',
  description:
    'A series of self-contained couplets (5 shown here, though ghazals often run longer). Both lines of the opening couplet end on the same word or short phrase (the radif); every couplet after that repeats the radif only at the end of its second line.',
  example: [
    'My heart forgets, and then remembers, again',
    'Each door I close, I find myself at again',
    '',
    'The candle burns down low, then flickers bright',
    'I swear that I will not fall for this again',
    '',
    'You said the word that broke the quiet, once',
    'and left me listening for it again',
    '',
    'Some nights the silence sounds like your voice',
    'and I mistake the wind for you, again',
    '',
    'Poem, keep this ache from turning small —',
    'let every ending open, again and again',
  ].join('\n'),
  lineRules: ghazalLineRules(),
  stanzaLineCounts: [2, 2, 2, 2, 2],
}

function rondeauLineRules(): LineRule[] {
  const abbaLabels = parseRhymeSchemeString('AABBA')
  return [
    ...abbaLabels.map((rhymeLabel) => ({ rhymeLabel })),
    { rhymeLabel: 'A' },
    { rhymeLabel: 'A' },
    { rhymeLabel: 'B' },
    { startWordMatches: 0 }, // short refrain, quatrain
    { rhymeLabel: 'A' },
    { rhymeLabel: 'A' },
    { rhymeLabel: 'B' },
    { rhymeLabel: 'B' },
    { rhymeLabel: 'A' },
    { startWordMatches: 0 }, // short refrain, sestet
  ]
}

export const rondeau: FormTemplate = {
  id: 'rondeau',
  name: 'Rondeau',
  description:
    '15 lines across a quintet, a quatrain, and a sestet (rhymed AABBA AABR AABBAR), where R is a short refrain repeating the opening words of line 1 — not the whole line.',
  example: [
    'Autumn light begins to fade away',
    'and something in me wants the year to stay',
    'I did not think the change would feel so slight',
    'but every morning now arrives less bright',
    'as if the season second-guessed its way',
    '',
    'I watch the geese that gather and delay',
    'then vanish south before the break of day',
    'I keep a lamp lit longer than I might',
    'Autumn light',
    '',
    'returns each year in one form or array',
    'as if it never truly went away',
    "I tell myself I'll greet it with delight",
    'and mean it, mostly, by the end of night',
    'some quieter, more grateful kind of day',
    'Autumn light',
  ].join('\n'),
  lineRules: rondeauLineRules(),
  stanzaLineCounts: [5, 4, 6],
}

function terzaRimaLineRules(): LineRule[] {
  // ABA BCB CDC DED, then a closing couplet rhyming with the last tercet's middle line.
  return [
    { rhymeLabel: 'A' },
    { rhymeLabel: 'B' },
    { rhymeLabel: 'A' },
    { rhymeLabel: 'B' },
    { rhymeLabel: 'C' },
    { rhymeLabel: 'B' },
    { rhymeLabel: 'C' },
    { rhymeLabel: 'D' },
    { rhymeLabel: 'C' },
    { rhymeLabel: 'D' },
    { rhymeLabel: 'E' },
    { rhymeLabel: 'D' },
    { rhymeLabel: 'E' },
    { rhymeLabel: 'E' },
  ]
}

export const terzaRima: FormTemplate = {
  id: 'terza-rima',
  name: 'Terza Rima',
  description:
    "Interlocking three-line stanzas rhymed ABA BCB CDC..., where each stanza's middle rhyme becomes the next stanza's outer rhyme. This template uses four tercets closed with a couplet rhyming with the last tercet's middle line — a common closing convention, though length varies.",
  example: [
    'I walk this shore each evening, unafraid',
    'and watch the gulls that circle out of sight',
    'of storms the sea has quietly remade',
    '',
    'Each footprint fades before the fall of night',
    'I think of everything the years have known',
    'as if the dark could make the picture right',
    '',
    'the way this shoreline never stays alone',
    'it shifts, it drifts, before the tide has passed',
    'and yet some feeling here has always grown',
    '',
    'a patience built to something meant to last',
    "I come here now to ask what's really true",
    'some steady thing the tide has somehow cast',
    '',
    'the answer shifts each time I ask anew',
    'but coming back is something I still do',
  ].join('\n'),
  lineRules: terzaRimaLineRules(),
  stanzaLineCounts: [3, 3, 3, 3, 2],
}

export const balladStanza: FormTemplate = {
  id: 'ballad-stanza',
  name: 'Ballad Stanza',
  description:
    'Quatrains alternating iambic tetrameter and trimeter, rhymed ABCB (only the 2nd and 4th lines rhyme) — the meter and rhyme of the traditional narrative ballad.',
  example: [
    'The wind came down across the moor',
    'and no one saw it land,',
    'It rattled every cottage door',
    'and no one made a stand.',
  ].join('\n'),
  lineRules: [
    { meter: { foot: 'iamb', feet: 4 } },
    { rhymeLabel: 'B', meter: { foot: 'iamb', feet: 3 } },
    { meter: { foot: 'iamb', feet: 4 } },
    { rhymeLabel: 'B', meter: { foot: 'iamb', feet: 3 } },
  ],
  stanzaLineCounts: [4],
}
