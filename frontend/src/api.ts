export interface Restaurant {
  id: number
  source: string | null
  country: string | null
  state_city: string | null
  category: string | null
  cuisine: string | null
  name: string | null
  area: string | null
  address: string | null
  phone: string | null
  hours: string | null
  accolades: string | null
  price_guide: string | null
  instagram_web: string | null
  signature: string | null
  rating: number | null
  notes: string | null
  lat: number | null
  lng: number | null
  geocode_status: string | null
  verified: boolean
  distance_km: number | null
}

export interface SearchResponse {
  total: number
  page: number
  page_size: number
  results: Restaurant[]
}

export interface FilterOptions {
  country: string[]
  state_city: string[]
  category: string[]
  cuisine: string[]
}

export interface ChatResponse {
  answer: string
  restaurants: Restaurant[]
  conversation_id: string
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export function search(params: URLSearchParams): Promise<SearchResponse> {
  return fetchJson(`/api/search?${params.toString()}`)
}

export function getFilterOptions(): Promise<FilterOptions> {
  return fetchJson('/api/filters/options')
}

export function getRestaurant(id: number): Promise<Restaurant> {
  return fetchJson(`/api/restaurants/${id}`)
}

export function sendChatMessage(message: string, conversationId?: string): Promise<ChatResponse> {
  return fetchJson('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversation_id: conversationId }),
  })
}
