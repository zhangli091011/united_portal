import { Link, useLocation } from 'react-router-dom'
import { Home, User, Search, Newspaper, Settings } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

const Header = () => {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { theme } = useTheme()

  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/register', label: '报名', icon: User },
    { path: '/query', label: '查询', icon: Search },
    { path: '/news', label: '新闻', icon: Newspaper },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            {theme.logoUrl ? (
              <img
                src={theme.logoUrl}
                alt="Logo"
                className="w-8 h-8 rounded-lg object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">{theme.siteName?.charAt(0) || '中'}</span>
              </div>
            )}
            <span className="text-xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
              {theme.siteName || '中春晚'} {theme.siteSubtitle || 'United Portal'}
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                  location.pathname === path
                    ? 'text-blue-700 bg-blue-50 font-semibold'
                    : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50 font-medium'
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <Link
                  to="/admin/dashboard"
                  className="flex items-center space-x-2 text-slate-700 hover:text-blue-700 transition-colors font-medium"
                >
                  <Settings size={18} />
                  <span className="hidden sm:inline">管理后台</span>
                </Link>
                <button
                  onClick={logout}
                  className="btn-secondary text-sm"
                >
                  退出
                </button>
              </div>
            ) : (
              <Link
                to="/admin/login"
                className="btn-primary"
              >
                管理员登录
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
