export const APPEARANCES = [
  {
    value: 'olive',
    label: 'Olive',
    description: 'Warm charcoal, cream, and muted brass.',
    dark: true,
  },
  {
    value: 'dusk',
    label: 'Dusk',
    description: 'A softer, lighter olive-grey.',
    dark: true,
  },
  {
    value: 'sand',
    label: 'Sand',
    description: 'A middle tone with dark ink.',
    dark: false,
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Near-white paper and green accents.',
    dark: false,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Deep charcoal and green accents.',
    dark: true,
  },
] as const
export type Appearance = (typeof APPEARANCES)[number]['value']
export function isAppearance(value: unknown): value is Appearance {
  return APPEARANCES.some((option) => option.value === value)
}
