import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { userAPI } from '../../services/api'
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Shield, 
  ShieldCheck, 
  Key,
  Eye,
  EyeOff,
  Search,
  Filter
} from 'lucide-react'
import LoadingSpinner from '../UI/LoadingSpinner'
import toast from 'react-hot-toast'
import UserModal from './UserModal'
import PasswordModal from './PasswordModal'

const UserManagement = () => {
  const { isSuperAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showUserModal, setShowUserModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'edit'

  useEffect(() => {
    if (!isSuperAdmin()) {
      toast.error('需要超级管理员权限')
      return
    }
    
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersResponse, permissionsResponse] = await Promise.all([
        userAPI.getAll(),
        userAPI.getPermissions()
      ])
      
      setUsers(usersResponse.data.data)
      setPermissions(permissionsResponse.data.data.grouped)
    } catch (error) {
      console.error('加载数据失败:', error)
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = () => {
    setSelectedUser(null)
    setModalMode('create')
    setShowUserModal(true)
  }

  const handleEditUser = (user) => {
    setSelectedUser(user)
    setModalMode('edit')
    setShowUserModal(true)
  }

  const handleChangePassword = (user) => {
    setSelectedUser(user)
    setShowPasswordModal(true)
  }

  const handleDeleteUser = async (user) => {
    if (!confirm(`确定要删除用户 "${user.username}" 吗？`)) {
      return
    }

    try {
      await userAPI.delete(user.id)
      toast.success('用户删除成功')
      loadData()
    } catch (error) {
      console.error('删除用户失败:', error)
    }
  }

  const handleUserSaved = () => {
    setShowUserModal(false)
    setSelectedUser(null)
    loadData()
  }

  const handlePasswordChanged = () => {
    setShowPasswordModal(false)
    setSelectedUser(null)
  }

  // 过滤用户
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  const getRoleDisplay = (role) => {
    switch (role) {
      case 'super_admin':
        return { text: '超级管理员', color: 'text-red-400', icon: ShieldCheck }
      case 'admin':
        return { text: '管理员', color: 'text-blue-400', icon: Shield }
      default:
        return { text: role, color: 'text-black-400', icon: Users }
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('zh-CN')
  }

  if (!isSuperAdmin()) {
    return (
      <div className="text-center py-8">
        <Shield className="mx-auto text-black-400 mb-4" size={48} />
        <h3 className="text-lg font-semibold text-black-600 mb-2">权限不足</h3>
        <p className="text-black-500">需要超级管理员权限才能访问用户管理</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-black mb-2">用户管理</h1>
          <p className="text-black-400">管理系统用户和权限</p>
        </div>
        <button
          onClick={handleCreateUser}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>添加用户</span>
        </button>
      </div>

      {/* 搜索和过滤 */}
      <div className="card-neon p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索用户名或邮箱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-neon w-full pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black-400" size={20} />
            </div>
          </div>

          {/* 角色过滤 */}
          <div className="sm:w-48">
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="input-neon w-full pl-10 appearance-none"
              >
                <option value="all">全部角色</option>
                <option value="super_admin">超级管理员</option>
                <option value="admin">管理员</option>
              </select>
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black-400" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="card-neon overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black-700">
                <th className="text-left py-4 px-6 font-semibold text-black-300">用户</th>
                <th className="text-left py-4 px-6 font-semibold text-black-300">角色</th>
                <th className="text-left py-4 px-6 font-semibold text-black-300">权限数量</th>
                <th className="text-left py-4 px-6 font-semibold text-black-300">最后登录</th>
                <th className="text-left py-4 px-6 font-semibold text-black-300">创建时间</th>
                <th className="text-right py-4 px-6 font-semibold text-black-300">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const roleDisplay = getRoleDisplay(user.role)
                const IconComponent = roleDisplay.icon
                
                return (
                  <tr key={user.id} className="border-b border-black-700 hover:bg-black-800/50">
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-semibold text-black">{user.username}</div>
                        {user.email && (
                          <div className="text-sm text-black-400">{user.email}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <IconComponent className={roleDisplay.color} size={16} />
                        <span className={roleDisplay.color}>{roleDisplay.text}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-black-300">{user.permissions?.length || 0}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-black-400 text-sm">
                        {formatDate(user.last_login)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-black-400 text-sm">
                        {formatDate(user.created_at)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors"
                          title="编辑用户"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleChangePassword(user)}
                          className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10 rounded-lg transition-colors"
                          title="修改密码"
                        >
                          <Key size={16} />
                        </button>
                        {user.role !== 'super_admin' && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                            title="删除用户"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto text-black-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-black-600 mb-2">暂无用户</h3>
              <p className="text-black-500">
                {searchTerm || roleFilter !== 'all' ? '没有找到符合条件的用户' : '还没有任何用户'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-neon p-4 text-center">
          <div className="text-2xl font-bold text-blue-400 mb-1">
            {users.length}
          </div>
          <div className="text-sm text-black-400">总用户数</div>
        </div>
        <div className="card-neon p-4 text-center">
          <div className="text-2xl font-bold text-red-400 mb-1">
            {users.filter(u => u.role === 'super_admin').length}
          </div>
          <div className="text-sm text-black-400">超级管理员</div>
        </div>
        <div className="card-neon p-4 text-center">
          <div className="text-2xl font-bold text-green-400 mb-1">
            {users.filter(u => u.role === 'admin').length}
          </div>
          <div className="text-sm text-black-400">管理员</div>
        </div>
      </div>

      {/* 用户模态框 */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-black rounded-lg shadow-2xl max-w-lg w-full">
            <UserModal
              user={selectedUser}
              permissions={permissions}
              mode={modalMode}
              onSave={handleUserSaved}
              onCancel={() => setShowUserModal(false)}
            />
          </div>
        </div>
      )}

      {/* 密码修改模态框 */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-black rounded-lg shadow-2xl max-w-lg w-full">
            <PasswordModal
              user={selectedUser}
              onSave={handlePasswordChanged}
              onCancel={() => setShowPasswordModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
