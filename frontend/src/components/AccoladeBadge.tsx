export function AccoladeBadge({ accolades }: { accolades: string | null }) {
  if (!accolades || accolades === '-') return null
  const isMichelin = /michelin/i.test(accolades)
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800"
      title={accolades}
    >
      {isMichelin ? '★' : '🏅'} {accolades.length > 28 ? `${accolades.slice(0, 28)}…` : accolades}
    </span>
  )
}
