import type { Restaurant } from '../api'
import { displayName, hasHygieneFlag } from '../lib/text'
import { AccoladeBadge } from './AccoladeBadge'
import { StarRating } from './StarRating'

export function RestaurantCard({
  restaurant,
  onClick,
}: {
  restaurant: Restaurant
  onClick: () => void
}) {
  const location = [restaurant.area, restaurant.state_city ?? restaurant.country]
    .filter(Boolean)
    .join(', ')

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug text-neutral-900">{displayName(restaurant.name)}</h3>
        <StarRating rating={restaurant.rating} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {restaurant.category && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
            {restaurant.category}
          </span>
        )}
        {restaurant.cuisine && restaurant.cuisine !== restaurant.category && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
            {restaurant.cuisine}
          </span>
        )}
        <AccoladeBadge accolades={restaurant.accolades} />
        {hasHygieneFlag(restaurant.notes) && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            ⚠️ Flagged
          </span>
        )}
      </div>

      {location && <p className="text-sm text-neutral-500">{location}</p>}

      {restaurant.signature && restaurant.signature !== '-' && (
        <p className="line-clamp-2 text-sm text-neutral-600">{restaurant.signature}</p>
      )}

      {restaurant.distance_km !== null && (
        <p className="text-xs font-medium text-indigo-600">{restaurant.distance_km.toFixed(1)} km away</p>
      )}
    </button>
  )
}
