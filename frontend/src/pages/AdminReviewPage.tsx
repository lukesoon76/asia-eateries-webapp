import { useEffect, useState } from 'react'
import { approveSubmission, getAdminSubmissions, rejectSubmission, type Submission } from '../api'
import { useAuth } from '../lib/auth'

export function AdminReviewPage() {
  const { user, loading: authLoading } = useAuth()
  const [submissions, setSubmissions] = useState<Submission[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  function load() {
    getAdminSubmissions('pending')
      .then(setSubmissions)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    if (user?.is_admin) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (authLoading) return null

  if (!user?.is_admin) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-neutral-500">Admins only.</p>
  }

  async function approve(id: number) {
    setBusyId(id)
    try {
      await approveSubmission(id)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve')
    } finally {
      setBusyId(null)
    }
  }

  async function reject(id: number) {
    const reason = window.prompt('Reason for rejecting (optional):') ?? undefined
    setBusyId(id)
    try {
      await rejectSubmission(id, reason)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-neutral-900">Review queue</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {submissions && submissions.length === 0 && (
        <p className="mt-6 text-neutral-500">Nothing pending review.</p>
      )}

      <div className="mt-6 space-y-3">
        {submissions?.map((s) => (
          <div key={s.id} className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="font-semibold text-neutral-900">{s.name}</h3>
            <p className="text-sm text-neutral-500">
              {[s.category, s.cuisine, s.area, s.state_city, s.country].filter(Boolean).join(' · ')}
            </p>
            {s.address && <p className="mt-1 text-sm text-neutral-600">{s.address}</p>}
            {s.signature && <p className="mt-1 text-sm text-neutral-600">{s.signature}</p>}
            {s.notes && <p className="mt-1 text-sm text-neutral-500">{s.notes}</p>}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busyId === s.id}
                onClick={() => approve(s.id)}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={busyId === s.id}
                onClick={() => reject(s.id)}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
