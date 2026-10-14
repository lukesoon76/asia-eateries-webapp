import type { Restaurant } from '../api'
import { displayName, hasHygieneFlag } from '../lib/text'
import { StarRating } from './StarRating'

export function RestaurantRow({
  restaurant,
  onClick,
}: {
  restaurant: Restaurant
  onClick: () => void
}) {
  const meta = [restaurant.category, restaurant.area ?? restaurant.state_city ?? restaurant.country]
    .filter(Boolean)
    .join(' · ')
  const signature = restaurant.signature && restaurant.signature !== '-' ? restaurant.signature : null

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-sm transition hover:border-neutral-300 hover:shadow-md"
    >
      {restaurant.thumbnail_url ? (
        <img
          src={restaurant.thumbnail_url}
          alt=""
          loading="lazy"
          className="h-16 w-16 shrink-0 rounded-lg object-cover sm:h-20 sm:w-20"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-2xl sm:h-20 sm:w-20"
        >
          🍜
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold text-neutral-900">{displayName(restaurant.name)}</h3>
          <StarRating rating={restaurant.rating} />
        </div>
        {meta && <p className="truncate text-xs text-neutral-500">{meta}</p>}
        {signature && <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{signature}</p>}
        {hasHygieneFlag(restaurant.notes) && (
          <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            ⚠️ Flagged
          </span>
        )}
      </div>
    </button>
  )
}
