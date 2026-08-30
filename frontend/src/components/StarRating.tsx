export function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        Unverified
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
      <span aria-hidden>★</span>
      {rating.toFixed(1)}
    </span>
  )
}
