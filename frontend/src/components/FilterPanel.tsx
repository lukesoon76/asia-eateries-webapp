import { useEffect, useState } from 'react'
import type { FilterOptions } from '../api'
import { countActiveFilters, EMPTY_FILTERS, type Filters } from '../lib/filters'
import { MultiSelect } from './MultiSelect'

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
    </label>
  )
}

export function FilterPanel({
  isOpen,
  onClose,
  options,
  appliedFilters,
  onApply,
}: {
  isOpen: boolean
  onClose: () => void
  options: FilterOptions | null
  appliedFilters: Filters
  onApply: (filters: Filters) => void
}) {
  const [draft, setDraft] = useState<Filters>(appliedFilters)

  useEffect(() => {
    setDraft(appliedFilters)
  }, [appliedFilters, isOpen])

  if (!isOpen) return null

  const activeCount = countActiveFilters(draft)

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/40 sm:bg-black/10"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="h-full w-full max-w-sm overflow-y-auto border-l border-neutral-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">
            Advanced Filters
            {activeCount > 0 && (
              <span className="ml-2 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                {activeCount}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close filters"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <MultiSelect
            label="Country"
            options={options?.country ?? []}
            selected={draft.country}
            onChange={(v) => setDraft({ ...draft, country: v })}
          />
          <MultiSelect
            label="State / City"
            options={options?.state_city ?? []}
            selected={draft.state}
            onChange={(v) => setDraft({ ...draft, state: v })}
          />
          <MultiSelect
            label="Category"
            options={options?.category ?? []}
            selected={draft.category}
            onChange={(v) => setDraft({ ...draft, category: v })}
          />
          <MultiSelect
            label="Cuisine"
            options={options?.cuisine ?? []}
            selected={draft.cuisine}
            onChange={(v) => setDraft({ ...draft, cuisine: v })}
          />

          <div>
            <span className="mb-1 block text-sm font-medium text-neutral-700">Google Rating range</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={draft.min_rating}
                onChange={(e) => setDraft({ ...draft, min_rating: e.target.value })}
                placeholder="Min"
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
              <span className="text-neutral-400">–</span>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={draft.max_rating}
                onChange={(e) => setDraft({ ...draft, max_rating: e.target.value })}
                placeholder="Max"
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={draft.has_accolade}
              onChange={(e) => setDraft({ ...draft, has_accolade: e.target.checked })}
              className="rounded border-neutral-300"
            />
            Has accolade (Michelin, Bib Gourmand, etc.)
          </label>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={draft.verified_only}
              onChange={(e) => setDraft({ ...draft, verified_only: e.target.checked })}
              className="rounded border-neutral-300"
            />
            Verified only (has a Google Rating)
          </label>

          <TextField label="Price Guide contains" value={draft.price_contains} onChange={(v) => setDraft({ ...draft, price_contains: v })} />

          <details className="rounded-md border border-neutral-200 p-3">
            <summary className="cursor-pointer text-sm font-medium text-neutral-700">Other fields</summary>
            <div className="mt-3 space-y-3">
              <TextField label="Area / Location contains" value={draft.area} onChange={(v) => setDraft({ ...draft, area: v })} />
              <TextField label="Name contains" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
              <TextField label="Address contains" value={draft.address} onChange={(v) => setDraft({ ...draft, address: v })} />
              <TextField label="Notes contains" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
              <TextField label="Source contains" value={draft.source} onChange={(v) => setDraft({ ...draft, source: v })} />
              <TextField label="Phone contains" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
              <TextField label="Typical Hours contains" value={draft.hours} onChange={(v) => setDraft({ ...draft, hours: v })} />
              <TextField label="Instagram/Web contains" value={draft.instagram} onChange={(v) => setDraft({ ...draft, instagram: v })} />
              <TextField label="Signature Dishes contains" value={draft.signature} onChange={(v) => setDraft({ ...draft, signature: v })} />
            </div>
          </details>
        </div>

        <div className="sticky bottom-0 mt-6 flex gap-2 border-t border-neutral-200 bg-white pt-4">
          <button
            type="button"
            onClick={() => {
              setDraft(EMPTY_FILTERS)
              onApply(EMPTY_FILTERS)
            }}
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft)
              onClose()
            }}
            className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}
