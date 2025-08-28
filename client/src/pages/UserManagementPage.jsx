import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout/Layout'
import UserManagement from '../components/Admin/UserManagement'
import { Shield } from 'lucide-react'

const UserManagementPage = () => {
  const { isSuperAdmin } = useAuth()

  if (!isSuperAdmin()) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Shield className="mx-auto text-gray-400 mb-4" size={64} />
            <h1 className="text-2xl font-bold text-gray-600 mb-2">权限不足</h1>
            <p className="text-gray-500">需要超级管理员权限才能访问用户管理页面</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <UserManagement />
      </div>
    </Layout>
  )
}

export default UserManagementPage
