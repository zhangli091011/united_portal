import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { DebugProvider } from './contexts/DebugContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout/Layout'
import HomePage from './pages/HomePage'
import RegistrationPage from './pages/RegistrationPage'
import QueryPage from './pages/QueryPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboard from './pages/AdminDashboard'
import ThemeManagement from './pages/ThemeManagement'
import UserManagementPage from './pages/UserManagementPage'
import NewsPage from './pages/NewsPage'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import AuthDebug from './components/Debug/AuthDebug'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DebugProvider>
          <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/query" element={<QueryPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/theme" 
            element={
              <ProtectedRoute>
                <ThemeManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute>
                <UserManagementPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
          </Layout>
          <AuthDebug />
        </DebugProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
