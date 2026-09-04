import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDish, getDishes, getPhotos, rateDish, uploadPhoto, type Dish, type Photo } from '../api'
import { useAuth } from '../lib/auth'

function DishRow({ dish, onRated }: { dish: Dish; onRated: (d: Dish) => void }) {
  const { user } = useAuth()
  const [rating, setRating] = useState(dish.my_rating ?? 8)
  const [saving, setSaving] = useState(false)

  async function submitRating() {
    setSaving(true)
    try {
      onRated(await rateDish(dish.id, rating))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2">
      <div>
        <p className="text-sm font-medium text-neutral-800">{dish.name}</p>
        <p className="text-xs text-neutral-500">
          {dish.avg_rating !== null ? `${dish.avg_rating}/10 · ${dish.rating_count} rating${dish.rating_count === 1 ? '' : 's'}` : 'No ratings yet'}
        </p>
      </div>
      {user && (
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="rounded-md border border-neutral-300 px-1.5 py-1 text-sm"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={submitRating}
            disabled={saving}
            className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {dish.my_rating !== null ? 'Update' : 'Rate'}
          </button>
        </div>
      )}
    </div>
  )
}

export function DishesAndPhotos({ restaurantId }: { restaurantId: number }) {
  const { user } = useAuth()
  const [dishes, setDishes] = useState<Dish[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [newDishName, setNewDishName] = useState('')
  const [addingDish, setAddingDish] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getDishes(restaurantId).then(setDishes).catch(() => {})
    getPhotos(restaurantId).then(setPhotos).catch(() => {})
  }, [restaurantId])

  async function submitNewDish(e: React.FormEvent) {
    e.preventDefault()
    if (!newDishName.trim()) return
    setAddingDish(true)
    setError(null)
    try {
      const dish = await addDish(restaurantId, newDishName.trim())
      setDishes((prev) => (prev.some((d) => d.id === dish.id) ? prev.map((d) => (d.id === dish.id ? dish : d)) : [...prev, dish]))
      setNewDishName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add dish')
    } finally {
      setAddingDish(false)
    }
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const photo = await uploadPhoto({ restaurantId }, file)
      setPhotos((prev) => [photo, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="mt-6 space-y-6 border-t border-neutral-200 pt-5">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">Dishes</h3>
        <div className="mt-2 space-y-2">
          {dishes.length === 0 && <p className="text-sm text-neutral-400">No dishes added yet.</p>}
          {dishes.map((d) => (
            <DishRow key={d.id} dish={d} onRated={(updated) => setDishes((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))} />
          ))}
        </div>
        {user ? (
          <form onSubmit={submitNewDish} className="mt-3 flex gap-2">
            <input
              type="text"
              value={newDishName}
              onChange={(e) => setNewDishName(e.target.value)}
              placeholder="Add a dish, e.g. Char Kuey Teow"
              className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={addingDish}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Add
            </button>
          </form>
        ) : (
          <p className="mt-2 text-xs text-neutral-400">
            <Link to="/login" className="text-indigo-600 hover:underline">
              Log in
            </Link>{' '}
            to add or rate dishes.
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-neutral-900">Photos</h3>
        {photos.length > 0 ? (
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                <img src={p.url} alt={p.caption ?? ''} className="aspect-square w-full rounded-md object-cover" />
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-neutral-400">No photos yet.</p>
        )}
        {user && (
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
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
