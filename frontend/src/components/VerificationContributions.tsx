import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { apiCall } from '../api'

interface Contribution {
  id: number
  type: 'comment' | 'photo'
  contributor: string
  created_at: string
  comment?: string
  photo_id?: number
}

interface VerificationData {
  contributions: Contribution[]
  total_comments: number
  total_photos: number
}

export function VerificationContributions({
  restaurantId,
  isUnverified,
}: {
  restaurantId: number
  isUnverified: boolean
}) {
  const { user } = useAuth()
  const [contributions, setContributions] = useState<VerificationData | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoCaption, setPhotoCaption] = useState('')
  const [activeTab, setActiveTab] = useState<'comment' | 'photo'>('comment')

  useEffect(() => {
    if (!isUnverified) return
    apiCall(`/api/restaurants/${restaurantId}/verifications`, { method: 'GET' })
      .then(setContributions)
      .catch(console.error)
  }, [restaurantId, isUnverified])

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('comment_text', commentText)
      await apiCall(`/api/restaurants/${restaurantId}/verify/comment`, {
        method: 'POST',
        body: formData,
      })
      setCommentText('')
      // Refresh contributions
      const updated = await apiCall(`/api/restaurants/${restaurantId}/verifications`, { method: 'GET' })
      setContributions(updated)
    } catch (e) {
      console.error('Failed to add comment:', e)
      alert('Failed to add comment')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitPhoto = async () => {
    if (!photoFile) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', photoFile)
      formData.append('caption', photoCaption)
      await apiCall(`/api/restaurants/${restaurantId}/verify/photo`, {
        method: 'POST',
        body: formData,
      })
      setPhotoFile(null)
      setPhotoCaption('')
      // Refresh contributions
      const updated = await apiCall(`/api/restaurants/${restaurantId}/verifications`, { method: 'GET' })
      setContributions(updated)
    } catch (e) {
      console.error('Failed to upload photo:', e)
      alert('Failed to upload photo')
    } finally {
      setLoading(false)
    }
  }

  if (!isUnverified) return null

  const hasContributions =
    contributions && (contributions.total_comments > 0 || contributions.total_photos > 0)

  return (
    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔍</span>
        <h3 className="font-semibold text-amber-900">Help Verify This Entry</h3>
      </div>
      <p className="mt-1 text-sm text-amber-800">
        This restaurant hasn't been verified yet. Help the community by adding a comment or photo!
      </p>

      {hasContributions && (
        <div className="mt-4 rounded bg-white p-3">
          <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
            Verification contributions ({contributions.total_comments + contributions.total_photos})
          </p>
          <div className="mt-2 space-y-2">
            {contributions.contributions.map((c) => (
              <div key={c.id} className="flex gap-2 text-xs">
                <span className="text-neutral-500">{c.type === 'comment' ? '💬' : '📷'}</span>
                <div className="flex-1">
                  <p className="font-medium text-neutral-700">{c.contributor}</p>
                  {c.comment && <p className="mt-0.5 text-neutral-600">{c.comment}</p>}
                  <p className="mt-1 text-neutral-400">{new Date(c.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {user && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-3 rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          Add contribution
        </button>
      )}

      {!user && (
        <p className="mt-3 text-sm text-amber-700">Sign in to contribute verification comments or photos.</p>
      )}

      {showForm && user && (
        <div className="mt-4 space-y-3 rounded bg-white p-3">
          <div className="flex gap-2 border-b border-neutral-200">
            <button
              type="button"
              onClick={() => setActiveTab('comment')}
              className={`px-3 py-1 text-sm font-medium ${
                activeTab === 'comment'
                  ? 'border-b-2 border-amber-600 text-amber-600'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              Comment
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('photo')}
              className={`px-3 py-1 text-sm font-medium ${
                activeTab === 'photo'
                  ? 'border-b-2 border-amber-600 text-amber-600'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              Photo
            </button>
          </div>

          {activeTab === 'comment' && (
            <div>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share what you know about this restaurant..."
                maxLength={1000}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                rows={3}
              />
              <div className="mt-2 flex justify-between">
                <p className="text-xs text-neutral-500">{commentText.length}/1000</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim() || loading}
                    className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {loading ? 'Posting...' : 'Post comment'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'photo' && (
            <div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="w-full text-sm"
              />
              {photoFile && (
                <p className="mt-1 text-xs text-neutral-600">
                  Selected: {photoFile.name} ({(photoFile.size / 1024 / 1024).toFixed(1)} MB)
                </p>
              )}
              <input
                type="text"
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                placeholder="Optional caption..."
                maxLength={500}
                className="mt-2 w-full rounded border border-neutral-300 px-3 py-1 text-sm focus:border-amber-500 focus:outline-none"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setPhotoFile(null)
                    setPhotoCaption('')
                  }}
                  className="rounded px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitPhoto}
                  disabled={!photoFile || loading}
                  className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {loading ? 'Uploading...' : 'Upload photo'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
