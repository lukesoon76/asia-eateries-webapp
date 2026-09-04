import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  autocompleteAddress,
  createSubmission,
  getFilterOptions,
  reverseGeocode,
  uploadPhoto,
  type AddressSuggestion,
  type SubmissionInput,
} from '../api'
import { LocationMap } from '../components/LocationMap'
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

// A searchable dropdown backed by the categories already in use across the
// dataset (400+ distinct values -- too many for a plain <select>), via the
// native <datalist> autocomplete. Typing a value not in the list is still
// allowed, since the category taxonomy keeps growing as new places are added.
function CategoryField({
  label, value, onChange, options, required = false,
}: { label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        type="text"
        required={required}
        list="category-options"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start typing or pick an existing category…"
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <datalist id="category-options">
        {options.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
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

// Free OpenStreetMap/Nominatim-backed address lookup -- debounced as-you-type,
// shows a suggestion list, and on pick also hands back country/state/area so
// the caller can auto-fill those fields when the user hasn't typed them yet.
function AddressField({
  value, onChange, onSuggestionPicked,
}: { value: string; onChange: (v: string) => void; onSuggestionPicked: (s: AddressSuggestion) => void }) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function onInputChange(v: string) {
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (v.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await autocompleteAddress(v)
        setSuggestions(results)
        setOpen(results.length > 0)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 400)
  }

  function pick(s: AddressSuggestion) {
    // A debounced fetch from the keystrokes that produced this suggestion
    // list may still be in flight; cancel it so it can't reopen the dropdown
    // right after the user has picked something.
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSuggestions([])
    onChange(s.display_name)
    onSuggestionPicked(s)
    setOpen(false)
  }

  return (
    <div className="relative">
      <span className="mb-1 block text-sm font-medium text-neutral-700">
        Address <span className="text-red-500">*</span>
      </span>
      <input
        type="text"
        required
        value={value}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Start typing the address…"
        autoComplete="off"
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      {loading && <p className="mt-1 text-xs text-neutral-400">Searching…</p>}
      {open && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
              >
                {s.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs text-neutral-400">Picking a suggestion also fills in Country / State / Area below.</p>
    </div>
  )
}

// Local-only file picker used on the main form, before the submission (and
// therefore a submission_id to attach photos to) exists yet. Files are held
// in memory and only actually uploaded once the submission is created.
function PhotoPicker({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previews = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }))

  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files])

  function addFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return
    onChange([...files, ...Array.from(selected)])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-neutral-700">Photos (optional)</span>
      <p className="mb-2 text-xs text-neutral-500">Pictures of the eatery or dishes help reviewers approve it faster.</p>
      {previews.length > 0 && (
        <div className="mb-2 grid grid-cols-4 gap-2">
          {previews.map((p, i) => (
            <div key={p.url} className="group relative">
              <img src={p.url} alt="" className="aspect-square w-full rounded-md object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
                aria-label="Remove photo"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => addFiles(e.target.files)}
        className="text-sm"
      />
    </div>
  )
}

function PhotoUpload({ submissionId, initialPhotos = [] }: { submissionId: number; initialPhotos?: string[] }) {
  const [uploaded, setUploaded] = useState<string[]>(initialPhotos)
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
      <p className="text-sm font-medium text-neutral-700">
        {initialPhotos.length > 0 ? 'Add more photos (optional)' : 'Add photos (optional)'}
      </p>
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
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([])
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([])
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])

  useEffect(() => {
    getFilterOptions()
      .then((opts) => setCategoryOptions(opts.category))
      .catch(() => {})
  }, [])

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

  function onAddressSuggestionPicked(s: AddressSuggestion) {
    setForm((f) => ({
      ...f,
      country: f.country.trim() ? f.country : s.country ?? f.country,
      state_city: f.state_city.trim() ? f.state_city : s.state ?? f.state_city,
      area: (f.area ?? '').trim() ? f.area : s.area ?? f.area,
    }))
    setPickedLocation({ lat: s.lat, lng: s.lng })
  }

  async function onMapPick(lat: number, lng: number) {
    // Move the pin immediately; fill in the text fields once reverse
    // geocoding resolves (the pin placement itself never depends on it).
    setPickedLocation({ lat, lng })
    try {
      const result = await reverseGeocode(lat, lng)
      if (!result) return
      setForm((f) => ({
        ...f,
        // A map click is a deliberate "the place is here" action, so the
        // Address field always reflects it -- unlike Country/State/Area,
        // which only fill in when the user hasn't already typed something.
        address: result.display_name,
        country: f.country.trim() ? f.country : result.country ?? f.country,
        state_city: f.state_city.trim() ? f.state_city : result.state ?? f.state_city,
        area: (f.area ?? '').trim() ? f.area : result.area ?? f.area,
      }))
    } catch {
      // Leave the pin placed even if reverse geocoding fails -- the user can
      // still type the address by hand.
    }
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

      // Now that the submission exists, upload any photos picked before
      // submitting. Uploaded one at a time; a failed photo doesn't block the
      // submission itself -- it already succeeded -- so just surface it.
      const urls: string[] = []
      let photoError: string | null = null
      for (const file of pendingPhotos) {
        try {
          const photo = await uploadPhoto({ submissionId: submission.id }, file)
          urls.push(photo.url)
        } catch (err) {
          photoError = err instanceof Error ? err.message : 'A photo failed to upload'
        }
      }
      setUploadedPhotoUrls(urls)
      if (photoError) setError(photoError)
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

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <PhotoUpload submissionId={submittedId} initialPhotos={uploadedPhotoUrls} />

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setForm(EMPTY)
              setSubmittedId(null)
              setPendingPhotos([])
              setUploadedPhotoUrls([])
              setError(null)
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
        <AddressField
          value={form.address ?? ''}
          onChange={(v) => set('address', v)}
          onSuggestionPicked={onAddressSuggestionPicked}
        />
        <LocationMap value={pickedLocation} onPick={onMapPick} />
        <Field label="Country" value={form.country} onChange={(v) => set('country', v)} required />
        <Field label="State / City" value={form.state_city} onChange={(v) => set('state_city', v)} required />
        <CategoryField
          label="Category"
          value={form.category}
          onChange={(v) => set('category', v)}
          options={categoryOptions}
          required
        />
        <CuisineField value={form.cuisine ?? ''} onChange={(v) => set('cuisine', v)} />
        <Field label="Area / Location" value={form.area ?? ''} onChange={(v) => set('area', v)} required />

        <PhotoPicker files={pendingPhotos} onChange={setPendingPhotos} />

        <details className="rounded-md border border-neutral-200 p-3">
          <summary className="cursor-pointer text-sm font-medium text-neutral-700">More details (optional)</summary>
          <div className="mt-3 space-y-3">
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
