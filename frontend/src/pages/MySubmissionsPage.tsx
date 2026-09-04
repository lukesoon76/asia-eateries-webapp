import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMySubmissions, type Submission } from '../api'
import { useAuth } from '../lib/auth'

const STATUS_STYLES: Record<Submission['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
}

export function MySubmissionsPage() {
  const { user, loading: authLoading } = useAuth()
  const [submissions, setSubmissions] = useState<Submission[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      getMySubmissions()
        .then(setSubmissions)
        .catch((e) => setError(e.message))
    }
  }, [user])

  if (authLoading) return null

  if (!user) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <p className="text-neutral-600">
          <Link to="/login" className="text-indigo-600 hover:underline">
            Log in
          </Link>{' '}
          to see your submissions.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-neutral-900">My submissions</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {submissions && submissions.length === 0 && (
        <p className="mt-6 text-neutral-500">You haven't submitted any places yet.</p>
      )}

      <div className="mt-6 space-y-3">
        {submissions?.map((s) => (
          <div key={s.id} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-neutral-900">{s.name}</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[s.status]}`}>
                {s.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              {[s.area, s.state_city, s.country].filter(Boolean).join(', ')}
            </p>
            {s.status === 'rejected' && s.reject_reason && (
              <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-700">{s.reject_reason}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
