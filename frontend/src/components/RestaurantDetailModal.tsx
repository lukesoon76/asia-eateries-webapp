import { useEffect } from 'react'
import type { Restaurant } from '../api'
import { hasHygieneFlag } from '../lib/text'
import { AccoladeBadge } from './AccoladeBadge'
import { DishesAndPhotos } from './DishesAndPhotos'
import { StarRating } from './StarRating'

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value || value === '-') return null
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-neutral-800">{value}</dd>
    </div>
  )
}

export function RestaurantDetailModal({
  restaurant,
  onClose,
}: {
  restaurant: Restaurant
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const flagged = hasHygieneFlag(restaurant.notes)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-neutral-900">{restaurant.name}</h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StarRating rating={restaurant.rating} />
          <AccoladeBadge accolades={restaurant.accolades} />
          {restaurant.category && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
              {restaurant.category}
            </span>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Country" value={restaurant.country} />
          <Field label="State / City" value={restaurant.state_city} />
          <Field label="Area / Location" value={restaurant.area} />
          <Field label="Cuisine / Style" value={restaurant.cuisine} />
          <Field label="Address" value={restaurant.address} />
          <Field label="Phone" value={restaurant.phone} />
          <Field label="Typical Hours" value={restaurant.hours} />
          <Field label="Price Guide" value={restaurant.price_guide} />
          <Field label="Instagram / Web" value={restaurant.instagram_web} />
          <Field label="Source" value={restaurant.source} />
        </dl>

        <Field label="What To Order / Signature" value={restaurant.signature} />

        {restaurant.notes && restaurant.notes !== '-' && (
          <div className="mt-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">Notes</dt>
            <dd
              className={`mt-1 whitespace-pre-line rounded-lg p-3 text-sm ${
                flagged ? 'border border-amber-300 bg-amber-50 text-amber-900' : 'bg-neutral-50 text-neutral-700'
              }`}
            >
              {restaurant.notes}
            </dd>
          </div>
        )}

        <DishesAndPhotos restaurantId={restaurant.id} />
      </div>
    </div>
  )
}
