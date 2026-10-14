import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getFilterOptions, search, type FilterOptions, type Restaurant, type SearchResponse } from '../api'
import { FilterPanel } from '../components/FilterPanel'
import { RestaurantDetailModal } from '../components/RestaurantDetailModal'
import { RestaurantRow } from '../components/RestaurantRow'
import { countActiveFilters, filtersToParams, paramsToFilters, type Filters } from '../lib/filters'

const PAGE_SIZE = 25

export function SearchPage() {
  const [urlParams, setUrlParams] = useSearchParams()
  const [inputValue, setInputValue] = useState(urlParams.get('q') ?? '')
  const filters = paramsToFilters(urlParams)
  const q = urlParams.get('q') ?? ''
  const sortBy = urlParams.get('sort_by') ?? 'id'
  const order = urlParams.get('order') ?? 'asc'

  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [response, setResponse] = useState<SearchResponse | null>(null)
  const [items, setItems] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selected, setSelected] = useState<Restaurant | null>(null)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const engaged = Boolean(q) || countActiveFilters(filters) > 0 || response !== null

  useEffect(() => {
    getFilterOptions().then(setFilterOptions).catch(() => setFilterOptions(null))
  }, [])

  // Debounce free-text input -> URL param `q`.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (inputValue !== q) {
        const next = new URLSearchParams(urlParams)
        if (inputValue) next.set('q', inputValue)
        else next.delete('q')
        setUrlParams(next, { replace: true })
      }
    }, 300)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue])

  useEffect(() => {
    const id = ++requestId.current
    if (!q && countActiveFilters(filters) === 0) {
      setResponse(null)
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    const params = filtersToParams(q, filters, 1, sortBy, order)
    params.set('page_size', String(PAGE_SIZE))
    search(params)
      .then((r) => {
        if (id !== requestId.current) return
        setResponse(r)
        setItems(r.results)
      })
      .catch((e) => {
        if (id === requestId.current) setError(e.message)
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParams.toString()])

  function loadMore() {
    if (!response || loadingMore) return
    const id = requestId.current
    const nextPage = Math.floor(items.length / PAGE_SIZE) + 1
    setLoadingMore(true)
    const params = filtersToParams(q, filters, nextPage, sortBy, order)
    params.set('page_size', String(PAGE_SIZE))
    search(params)
      .then((r) => {
        if (id !== requestId.current) return
        setItems((prev) => [...prev, ...r.results])
      })
      .catch((e) => {
        if (id === requestId.current) setError(e.message)
      })
      .finally(() => {
        if (id === requestId.current) setLoadingMore(false)
      })
  }

  function applyFilters(next: Filters) {
    const params = filtersToParams(q, next, 1, sortBy, order)
    setUrlParams(params)
  }

  function setSort(nextSortBy: string, nextOrder: string) {
    const next = new URLSearchParams(urlParams)
    next.set('sort_by', nextSortBy)
    next.set('order', nextOrder)
    setUrlParams(next)
  }

  const activeCount = countActiveFilters(filters)
  const hasMore = response !== null && items.length < response.total

  return (
    <div className={`mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-5xl flex-col px-4 ${engaged ? 'pt-8' : 'justify-center'}`}>
      {!engaged && (
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900">Asia Eateries</h1>
          <p className="mt-2 text-neutral-500">What to eat now?</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search by name, dish, area, cuisine..."
            className="w-full rounded-full border border-neutral-300 px-5 py-3 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            autoFocus
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterPanelOpen(true)}
          className="relative shrink-0 rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
        >
          Filters
          {activeCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {engaged && (
        <>
          <div className="mt-4 flex items-center justify-between text-sm text-neutral-500">
            <span>
              {loading
                ? 'Searching…'
                : response
                  ? `Showing ${items.length.toLocaleString()} of ${response.total.toLocaleString()} results`
                  : ''}
            </span>
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-neutral-400">Sort:</label>
              <select
                id="sort"
                value={`${sortBy}-${order}`}
                onChange={(e) => {
                  const [sb, o] = e.target.value.split('-')
                  setSort(sb, o)
                }}
                className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
              >
                <option value="id-asc">Default</option>
                <option value="rating-desc">Rating: High to Low</option>
                <option value="rating-asc">Rating: Low to High</option>
                <option value="name-asc">Name: A–Z</option>
                <option value="name-desc">Name: Z–A</option>
              </select>
            </div>
          </div>

          {error && <p className="mt-6 text-center text-sm text-red-600">{error}</p>}

          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {items.map((r) => (
              <RestaurantRow key={r.id} restaurant={r} onClick={() => setSelected(r)} />
            ))}
          </div>

          {response && response.total === 0 && !loading && (
            <p className="mt-10 text-center text-neutral-400">No restaurants match your search and filters.</p>
          )}

          {hasMore && (
            <div className="mb-10 mt-6 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-full border border-neutral-300 bg-white px-5 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      <FilterPanel
        isOpen={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        options={filterOptions}
        appliedFilters={filters}
        onApply={applyFilters}
      />

      {selected && <RestaurantDetailModal restaurant={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
