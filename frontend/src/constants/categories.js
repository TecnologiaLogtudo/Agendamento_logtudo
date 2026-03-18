export const DEFAULT_CATEGORY_NAMES = [
  'Carros em rota',
  'Reentrega',
  'Em viagem',
  'Indisponíveis',
  'Perdidas',
  'Diária',
  'Spot/Parado',
]

const createCategoryState = (name) => ({
  name,
  count: 0,
  plates: [],
  profile: '',
  items: name === 'Perdidas' ? [{ count: 0, profile: '' }] : [],
})

const buildFallbackCategories = () =>
  DEFAULT_CATEGORY_NAMES.map((name, index) => ({
    id: `fallback-${index}`,
    name,
  }))

export const getFallbackCategories = () => buildFallbackCategories()

export const buildCategoryState = (names = DEFAULT_CATEGORY_NAMES) =>
  names.map(createCategoryState)

export const normalizeCategoryResponse = (backendList) => {
  if (!Array.isArray(backendList) || backendList.length === 0) {
    return buildFallbackCategories()
  }

  const filtered = backendList.filter((cat) => cat && typeof cat.name === 'string')
  return filtered.length > 0 ? filtered : buildFallbackCategories()
}
