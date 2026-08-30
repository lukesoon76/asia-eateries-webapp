import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { sendChatMessage, type Restaurant } from '../api'
import { RestaurantCard } from '../components/RestaurantCard'
import { RestaurantDetailModal } from '../components/RestaurantDetailModal'

interface ChatBubble {
  role: 'user' | 'assistant'
  content: string
  restaurants?: Restaurant[]
}

const EXAMPLE_PROMPTS = [
  'What to eat near PJ Sheraton',
  "What's the best Char Kuey Teow in KL and PJ?",
  'Show me Hakka restaurants in Cheras',
  'Cheap eats in George Town',
]

const STORAGE_KEY = 'asia-eateries-conversation-id'

export function ChatPage() {
  const [messages, setMessages] = useState<ChatBubble[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | undefined>(() =>
    localStorage.getItem(STORAGE_KEY) ?? undefined,
  )
  const [selected, setSelected] = useState<Restaurant | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const res = await sendChatMessage(trimmed, conversationId)
      setConversationId(res.conversation_id)
      localStorage.setItem(STORAGE_KEY, res.conversation_id)
      setMessages((prev) => [...prev, { role: 'assistant', content: res.answer, restaurants: res.restaurants }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function newConversation() {
    setMessages([])
    setConversationId(undefined)
    localStorage.removeItem(STORAGE_KEY)
    setError(null)
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-56px)] w-full max-w-3xl flex-col px-4">
      <div className="flex items-center justify-between border-b border-neutral-200 py-3">
        <h1 className="text-lg font-bold text-neutral-900">Chat</h1>
        <button
          type="button"
          onClick={newConversation}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
        >
          New conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-neutral-500">Ask about restaurants, dishes, or places near you.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${m.role === 'user' ? '' : 'w-full'}`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-neutral-800 border border-neutral-200'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
                {m.restaurants && m.restaurants.length > 0 && (
                  <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
                    {m.restaurants.map((r) => (
                      <div key={r.id} className="w-64 shrink-0">
                        <RestaurantCard restaurant={r} onClick={() => setSelected(r)} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-400">
                Thinking…
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="flex items-center gap-2 border-t border-neutral-200 py-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about food near you..."
          className="flex-1 rounded-full border border-neutral-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          Send
        </button>
      </form>

      {selected && <RestaurantDetailModal restaurant={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
