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

export interface User {
  id: number
  email: string
  display_name: string | null
  is_admin: boolean
}

export interface Submission {
  id: number
  status: 'pending' | 'approved' | 'rejected'
  submitted_by: number
  name: string
  country: string
  state_city: string
  category: string
  cuisine: string | null
  area: string | null
  address: string | null
  phone: string | null
  hours: string | null
  price_guide: string | null
  instagram_web: string | null
  signature: string | null
  notes: string | null
  reject_reason: string | null
  promoted_restaurant_id: number | null
  created_at: string
}

export type SubmissionInput = Pick<
  Submission,
  | 'name' | 'country' | 'state_city' | 'category' | 'cuisine' | 'area' | 'address'
  | 'phone' | 'hours' | 'price_guide' | 'instagram_web' | 'signature' | 'notes'
>

export interface Dish {
  id: number
  restaurant_id: number
  name: string
  avg_rating: number | null
  rating_count: number
  my_rating: number | null
}

export interface Photo {
  id: number
  restaurant_id: number | null
  dish_id: number | null
  caption: string | null
  url: string
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: 'include' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
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
  return fetchJson('/api/chat', jsonInit('POST', { message, conversation_id: conversationId }))
}

// --- Auth ---

export function getMe(): Promise<User | null> {
  return fetchJson('/api/auth/me')
}

export function register(email: string, password: string, displayName?: string): Promise<User> {
  return fetchJson('/api/auth/register', jsonInit('POST', { email, password, display_name: displayName }))
}

export function login(email: string, password: string): Promise<User> {
  return fetchJson('/api/auth/login', jsonInit('POST', { email, password }))
}

export function logout(): Promise<{ ok: boolean }> {
  return fetchJson('/api/auth/logout', { method: 'POST' })
}

// --- Submissions ---

export function createSubmission(input: SubmissionInput): Promise<Submission> {
  return fetchJson('/api/submissions', jsonInit('POST', input))
}

export function getMySubmissions(): Promise<Submission[]> {
  return fetchJson('/api/submissions/mine')
}

export function getAdminSubmissions(status: string): Promise<Submission[]> {
  return fetchJson(`/api/admin/submissions?status=${status}`)
}

export function approveSubmission(id: number): Promise<Submission> {
  return fetchJson(`/api/admin/submissions/${id}/approve`, { method: 'POST' })
}

export function rejectSubmission(id: number, reason?: string): Promise<Submission> {
  return fetchJson(`/api/admin/submissions/${id}/reject`, jsonInit('POST', { reason }))
}

// --- Dishes ---

export function getDishes(restaurantId: number): Promise<Dish[]> {
  return fetchJson(`/api/restaurants/${restaurantId}/dishes`)
}

export function addDish(restaurantId: number, name: string): Promise<Dish> {
  return fetchJson(`/api/restaurants/${restaurantId}/dishes`, jsonInit('POST', { name }))
}

export function rateDish(dishId: number, rating: number): Promise<Dish> {
  return fetchJson(`/api/dishes/${dishId}/rate`, jsonInit('POST', { rating }))
}

// --- Photos ---

export function getPhotos(restaurantId: number): Promise<Photo[]> {
  return fetchJson(`/api/restaurants/${restaurantId}/photos`)
}

export async function uploadPhoto(
  target: { restaurantId?: number; submissionId?: number },
  file: File,
  opts: { dishId?: number; caption?: string } = {},
): Promise<Photo> {
  const form = new FormData()
  form.append('file', file)
  if (target.restaurantId) form.append('restaurant_id', String(target.restaurantId))
  if (target.submissionId) form.append('submission_id', String(target.submissionId))
  if (opts.dishId) form.append('dish_id', String(opts.dishId))
  if (opts.caption) form.append('caption', opts.caption)
  const res = await fetch('/api/photos', { method: 'POST', body: form, credentials: 'include' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Upload failed: ${res.status}`)
  }
  return res.json()
}
