export interface Filters {
  country: string[]
  state: string[]
  category: string[]
  cuisine: string[]
  min_rating: string
  max_rating: string
  has_accolade: boolean
  verified_only: boolean
  price_contains: string
  area: string
  name: string
  address: string
  notes: string
  source: string
  phone: string
  hours: string
  instagram: string
  signature: string
}

export const EMPTY_FILTERS: Filters = {
  country: [],
  state: [],
  category: [],
  cuisine: [],
  min_rating: '',
  max_rating: '',
  has_accolade: false,
  verified_only: false,
  price_contains: '',
  area: '',
  name: '',
  address: '',
  notes: '',
  source: '',
  phone: '',
  hours: '',
  instagram: '',
  signature: '',
}

const MULTI_KEYS = ['country', 'state', 'category', 'cuisine'] as const
const BOOL_KEYS = ['has_accolade', 'verified_only'] as const
const TEXT_KEYS = [
  'min_rating', 'max_rating', 'price_contains', 'area', 'name', 'address',
  'notes', 'source', 'phone', 'hours', 'instagram', 'signature',
] as const

export function filtersToParams(q: string, filters: Filters, page: number, sortBy: string, order: string): URLSearchParams {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  for (const key of MULTI_KEYS) {
    for (const v of filters[key]) params.append(key, v)
  }
  for (const key of BOOL_KEYS) {
    if (filters[key]) params.set(key, 'true')
  }
  for (const key of TEXT_KEYS) {
    if (filters[key]) params.set(key, filters[key])
  }
  params.set('page', String(page))
  params.set('sort_by', sortBy)
  params.set('order', order)
  return params
}

export function paramsToFilters(params: URLSearchParams): Filters {
  const filters = { ...EMPTY_FILTERS }
  for (const key of MULTI_KEYS) {
    filters[key] = params.getAll(key)
  }
  for (const key of BOOL_KEYS) {
    filters[key] = params.get(key) === 'true'
  }
  for (const key of TEXT_KEYS) {
    filters[key] = params.get(key) ?? ''
  }
  return filters
}

export function countActiveFilters(filters: Filters): number {
  let count = 0
  for (const key of MULTI_KEYS) count += filters[key].length
  for (const key of BOOL_KEYS) if (filters[key]) count += 1
  for (const key of TEXT_KEYS) if (filters[key]) count += 1
  return count
}
