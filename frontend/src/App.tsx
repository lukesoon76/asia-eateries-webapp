import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { AdminReviewPage } from './pages/AdminReviewPage'
import { ChatPage } from './pages/ChatPage'
import { LoginPage } from './pages/LoginPage'
import { MySubmissionsPage } from './pages/MySubmissionsPage'
import { RegisterPage } from './pages/RegisterPage'
import { SearchPage } from './pages/SearchPage'
import { SubmitPage } from './pages/SubmitPage'
import { useAuth } from './lib/auth'

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

function AccountNav() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  if (loading) return null

  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <NavItem to="/login">Log in</NavItem>
        <NavItem to="/register">Register</NavItem>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <NavItem to="/submit">Submit a place</NavItem>
      <NavItem to="/my-submissions">My submissions</NavItem>
      {user.is_admin && <NavItem to="/admin/review">Review queue</NavItem>}
      <span className="px-2 text-sm text-neutral-500">{user.display_name || user.email}</span>
      <button
        type="button"
        onClick={async () => {
          await logout()
          navigate('/')
        }}
        className="rounded-full px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
      >
        Log out
      </button>
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-white/90 px-4 py-2 backdrop-blur">
        <span className="text-sm font-bold tracking-tight text-neutral-900">🍜 Asia Eateries</span>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            <NavItem to="/">Search</NavItem>
            <NavItem to="/chat">Chat</NavItem>
          </div>
          <AccountNav />
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/submit" element={<SubmitPage />} />
        <Route path="/my-submissions" element={<MySubmissionsPage />} />
        <Route path="/admin/review" element={<AdminReviewPage />} />
      </Routes>
    </div>
  )
}
