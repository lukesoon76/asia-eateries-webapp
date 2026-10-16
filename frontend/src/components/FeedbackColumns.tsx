import { extractFeedback } from '../lib/feedback'

function Column({ title, tone, items, empty }: { title: string; tone: 'positive' | 'negative'; items: string[]; empty: string }) {
  const dot = tone === 'positive' ? 'bg-emerald-500' : 'bg-red-500'
  const heading = tone === 'positive' ? 'text-emerald-800' : 'text-red-800'
  return (
    <div className="min-w-0">
      <h4 className={`text-xs font-semibold uppercase tracking-wide ${heading}`}>{title}</h4>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-400">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-neutral-700">
              <span aria-hidden className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function FeedbackColumns({ notes, accolades }: { notes: string | null; accolades: string | null }) {
  const { positives, negatives } = extractFeedback(notes, accolades)
  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold text-neutral-900">Feedback summary</h3>
      <p className="mt-0.5 text-xs text-neutral-400">Pulled from the entry's notes. Not individual reviews.</p>
      <div className="mt-3 grid grid-cols-1 gap-5 rounded-lg bg-neutral-50 p-4 sm:grid-cols-2">
        <Column title="Positive" tone="positive" items={positives} empty="No positive feedback recorded." />
        <Column title="Negative" tone="negative" items={negatives} empty="No complaints recorded." />
      </div>
    </section>
  )
}
