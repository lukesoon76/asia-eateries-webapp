import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createSubmission, uploadPhoto, type SubmissionInput } from '../api'
import { useAuth } from '../lib/auth'

const EMPTY: SubmissionInput = {
  name: '', country: '', state_city: '', category: '', cuisine: '', area: '', address: '',
  phone: '', hours: '', price_guide: '', instagram_web: '', signature: '', notes: '',
}

const CUISINE_OPTIONS = [
  'Malaysian / Chinese-Malaysian', 'Singaporean / Hawker', 'Peranakan / Nyonya',
  'Cantonese', 'Hokkien', 'Teochew', 'Hakka', 'Sichuan', 'Northern Chinese',
  'Malay', 'Indian / South Asian', 'Thai', 'Japanese', 'Korean', 'Taiwanese',
  'Hong Kong style', 'Vietnamese', 'Western / International', 'Fusion',
]

function Field({
  label, value, onChange, required = false,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
    </label>
  )
}

function CuisineField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isPreset = value === '' || CUISINE_OPTIONS.includes(value)
  const [useOther, setUseOther] = useState(!isPreset)

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-neutral-700">
        Cuisine / Style <span className="text-red-500">*</span>
      </span>
      {useOther ? (
        <div className="flex gap-2">
          <input
            type="text"
            required
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Describe the cuisine/style"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              setUseOther(false)
              onChange('')
            }}
            className="shrink-0 rounded-md border border-neutral-300 px-2 py-2 text-xs text-neutral-600 hover:bg-neutral-50"
          >
            Pick from list
          </button>
        </div>
      ) : (
        <select
          required
          value={value}
          onChange={(e) => {
            if (e.target.value === '__other__') {
              setUseOther(true)
              onChange('')
            } else {
              onChange(e.target.value)
            }
          }}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Select a cuisine…
          </option>
          {CUISINE_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value="__other__">Other…</option>
        </select>
      )}
    </div>
  )
}

function PhotoUpload({ submissionId }: { submissionId: number }) {
  const [uploaded, setUploaded] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const photo = await uploadPhoto({ submissionId }, file)
      setUploaded((prev) => [...prev, photo.url])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-neutral-200 p-4 text-left">
      <p className="text-sm font-medium text-neutral-700">Add photos (optional)</p>
      <p className="mt-0.5 text-xs text-neutral-500">Pictures of the eatery or dishes help reviewers approve it faster.</p>
      {uploaded.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {uploaded.map((url) => (
            <img key={url} src={url} alt="" className="aspect-square w-full rounded-md object-cover" />
          ))}
        </div>
      )}
      <div className="mt-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileSelected}
          disabled={uploading}
          className="text-sm"
        />
        {uploading && <p className="mt-1 text-xs text-neutral-400">Uploading…</p>}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  )
}

export function SubmitPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [form, setForm] = useState<SubmissionInput>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [submittedId, setSubmittedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  if (authLoading) return null

  if (!user) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <p className="text-neutral-600">
          <Link to="/login" className="text-indigo-600 hover:underline">
            Log in
          </Link>{' '}
          to submit a place.
        </p>
      </div>
    )
  }

  function set<K extends keyof SubmissionInput>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // Blank optional strings should be omitted, not sent as empty strings.
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, (v ?? '').trim() === '' ? null : v]),
      ) as unknown as SubmissionInput
      const submission = await createSubmission(payload)
      setSubmittedId(submission.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit')
    } finally {
      setLoading(false)
    }
  }

  if (submittedId !== null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-neutral-900">Thanks!</h1>
        <p className="mt-2 text-neutral-600">
          Your submission is pending review. You'll see it appear in search once it's approved.
        </p>

        <PhotoUpload submissionId={submittedId} />

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setForm(EMPTY)
              setSubmittedId(null)
            }}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Submit another
          </button>
          <button
            type="button"
            onClick={() => navigate('/my-submissions')}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            View my submissions
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold text-neutral-900">Submit a place</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Add a restaurant or stall you know. It'll be reviewed before it appears in search.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Name" value={form.name} onChange={(v) => set('name', v)} required />
        <Field label="Country" value={form.country} onChange={(v) => set('country', v)} required />
        <Field label="State / City" value={form.state_city} onChange={(v) => set('state_city', v)} required />
        <Field label="Category" value={form.category} onChange={(v) => set('category', v)} required />
        <CuisineField value={form.cuisine ?? ''} onChange={(v) => set('cuisine', v)} />
        <Field label="Area / Location" value={form.area ?? ''} onChange={(v) => set('area', v)} required />

        <details className="rounded-md border border-neutral-200 p-3">
          <summary className="cursor-pointer text-sm font-medium text-neutral-700">More details (optional)</summary>
          <div className="mt-3 space-y-3">
            <Field label="Address" value={form.address ?? ''} onChange={(v) => set('address', v)} />
            <Field label="Phone" value={form.phone ?? ''} onChange={(v) => set('phone', v)} />
            <Field label="Typical Hours" value={form.hours ?? ''} onChange={(v) => set('hours', v)} />
            <Field label="Price Guide" value={form.price_guide ?? ''} onChange={(v) => set('price_guide', v)} />
            <Field label="Instagram / Web" value={form.instagram_web ?? ''} onChange={(v) => set('instagram_web', v)} />
            <Field label="What to order / signature" value={form.signature ?? ''} onChange={(v) => set('signature', v)} />
            <Field label="Notes" value={form.notes ?? ''} onChange={(v) => set('notes', v)} />
          </div>
        </details>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Submitting…' : 'Submit for review'}
        </button>
      </form>
    </div>
  )
}
