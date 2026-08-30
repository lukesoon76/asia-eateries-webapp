import { NavLink, Route, Routes } from 'react-router-dom'
import { ChatPage } from './pages/ChatPage'
import { SearchPage } from './pages/SearchPage'

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-full px-3 py-1.5 text-sm font-medium ${
          isActive ? 'bg-indigo-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

export default function App() {
  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white/90 px-4 backdrop-blur">
        <span className="text-sm font-bold tracking-tight text-neutral-900">🍜 Asia Eateries</span>
        <div className="flex gap-1">
          <NavItem to="/">Search</NavItem>
          <NavItem to="/chat">Chat</NavItem>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </div>
  )
}
