import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { emailAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { 
  Mail, 
  Plus, 
  Edit3, 
  Trash2, 
  TestTube, 
  Settings,
  Check,
  X,
  AlertCircle,
  Info,
  ToggleLeft,
  ToggleRight,
  Send,
  Activity,
  CheckCircle,
  XCircle
} from 'lucide-react'
import LoadingSpinner from '../UI/LoadingSpinner'
import toast from 'react-hot-toast'

const EmailManagement = () => {
  const [editingEmail, setEditingEmail] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [showBulkTestModal, setShowBulkTestModal] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState(null)
  const queryClient = useQueryClient()
  const { user, hasPermission, isSuperAdmin } = useAuth()

  // 获取邮箱列表
  const { data: emailsData, isLoading: emailsLoading, refetch: refetchEmails, error: emailsError } = useQuery({
    queryKey: ['emails'],
    queryFn: emailAPI.getAll,
    retry: 3,
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30秒内不重新请求
    onError: (error) => {
      console.error('获取邮箱列表失败:', error)
      toast.error(`获取邮箱列表失败: ${error.response?.data?.message || error.message}`)
    }
  })

  // 获取统计信息
  const { data: statsData } = useQuery({
    queryKey: ['email-stats'],
    queryFn: emailAPI.getStats,
    refetchInterval: 30000, // 30秒刷新一次
    onError: (error) => {
      console.error('获取邮箱统计失败:', error)
    }
  })

  // 切换邮箱状态
  const toggleMutation = useMutation({
    mutationFn: emailAPI.toggle,
    onSuccess: (response) => {
      toast.success(`邮箱已${response.data.active ? '启用' : '禁用'}`)
      refetchEmails()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '切换状态失败')
    }
  })

  // 删除邮箱
  const deleteMutation = useMutation({
    mutationFn: emailAPI.delete,
    onSuccess: (response) => {
      toast.success(`邮箱 "${response.data.emailName}" 删除成功`)
      refetchEmails()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '删除失败')
    }
  })

  const emails = emailsData?.data?.data?.emails || []
  const stats = emailsData?.data?.data?.stats || statsData?.data || {}
  
  // 已修复数据解构问题

  // 权限检查
  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <AlertCircle className="text-yellow-500 mr-2" size={24} />
          <h3 className="text-lg font-semibold text-yellow-800">未登录</h3>
        </div>
        <p className="text-yellow-700">请先登录以访问邮箱管理功能</p>
      </div>
    )
  }

  if (!hasPermission('email.manage')) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <AlertCircle className="text-red-500 mr-2" size={24} />
          <h3 className="text-lg font-semibold text-red-800">权限不足</h3>
        </div>
        <p className="text-red-700">您没有权限访问邮箱管理功能</p>
      </div>
    )
  }

  const handleToggle = (emailId) => {
    toggleMutation.mutate(emailId)
  }

  const handleDelete = (email) => {
    if (window.confirm(`确定要删除邮箱 "${email.name}" 吗？\n\n⚠️ 此操作不可恢复！`)) {
      deleteMutation.mutate(email.id)
    }
  }

  if (emailsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
        <span className="ml-3 text-slate-600">加载邮箱信息...</span>
      </div>
    )
  }

  if (emailsError) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="text-red-500 mr-2" size={24} />
            <h3 className="text-lg font-semibold text-red-800">邮箱加载失败</h3>
          </div>
          <p className="text-red-700 mb-4">
            {emailsError.response?.data?.message || emailsError.message || '未知错误'}
          </p>
          <button
            onClick={() => refetchEmails()}
            className="btn-primary text-sm"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部操作栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <Mail className="mr-2" size={24} />
            邮箱管理
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            管理邮箱池，支持多邮箱切换和失败重试
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowTestModal(true)}
            className="btn-secondary flex items-center text-sm"
          >
            <TestTube size={16} className="mr-1" />
            测试邮箱
          </button>

          <button
            onClick={() => setShowBulkTestModal(true)}
            className="btn-secondary flex items-center text-sm"
          >
            <Send size={16} className="mr-1" />
            批量测试
          </button>
          
          {isSuperAdmin() && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center text-sm"
            >
              <Plus size={16} className="mr-1" />
              添加邮箱
            </button>
          )}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card-neon p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">总邮箱数</p>
              <p className="text-2xl font-bold text-slate-800">{stats.totalEmails || 0}</p>
            </div>
            <Mail className="text-blue-500" size={32} />
          </div>
        </div>
        
        <div className="card-neon p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">启用数量</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeEmails || 0}</p>
            </div>
            <CheckCircle className="text-green-500" size={32} />
          </div>
        </div>
        
        <div className="card-neon p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">禁用数量</p>
              <p className="text-2xl font-bold text-orange-600">{stats.inactiveEmails || 0}</p>
            </div>
            <XCircle className="text-orange-500" size={32} />
          </div>
        </div>

        <div className="card-neon p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">成功率</p>
              <p className="text-2xl font-bold text-green-600">{stats.successRate || '0.0'}%</p>
            </div>
            <Activity className="text-green-500" size={32} />
          </div>
        </div>

        <div className="card-neon p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">今日使用</p>
              <p className="text-2xl font-bold text-blue-600">{stats.recentlyUsed || 0}</p>
            </div>
            <Settings className="text-blue-500" size={32} />
          </div>
        </div>
      </div>

      {/* 邮箱列表 */}
      <div className="card-neon overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">邮箱列表</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  邮箱信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  配置
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  统计
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {emails.map((email) => (
                <tr key={email.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Mail size={16} className="text-slate-600" />
                        <span className="text-slate-800 font-medium">{email.name}</span>
                      </div>
                      <p className="text-slate-600 text-sm">{email.user}</p>
                      <p className="text-slate-500 text-xs">发件人: {email.from || email.user}</p>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-sm text-slate-800">{email.host}:{email.port}</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        email.secure ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {email.secure ? 'SSL/TLS' : 'STARTTLS'}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-sm text-green-600">成功: {email.successCount || 0}</p>
                      <p className="text-sm text-red-600">失败: {email.failureCount || 0}</p>
                      {email.lastUsed && (
                        <p className="text-xs text-slate-500">
                          最后使用: {new Date(email.lastUsed).toLocaleString('zh-CN')}
                        </p>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggle(email.id)}
                      disabled={toggleMutation.isLoading}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        email.status === '启用'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {email.status === '启用' ? (
                        <>
                          <ToggleRight size={14} className="mr-1" />
                          启用
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={14} className="mr-1" />
                          禁用
                        </>
                      )}
                    </button>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedEmail({...email, testType: 'single'})}
                        className="p-2 text-slate-600 hover:text-blue-600 transition-colors"
                        title="测试邮箱"
                      >
                        <TestTube size={16} />
                      </button>
                      
                      {isSuperAdmin() && (
                        <>
                          <button
                            onClick={() => setEditingEmail(email)}
                            className="p-2 text-slate-600 hover:text-green-600 transition-colors"
                            title="编辑邮箱"
                          >
                            <Edit3 size={16} />
                          </button>
                          
                          <button
                            onClick={() => handleDelete(email)}
                            disabled={deleteMutation.isLoading}
                            className="p-2 text-slate-600 hover:text-red-600 transition-colors"
                            title="删除邮箱"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {emails.length === 0 && (
            <div className="text-center py-12">
              <Mail className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">暂无邮箱配置</h3>
              <p className="mt-1 text-sm text-slate-500">
                {isSuperAdmin() ? '点击"添加邮箱"开始配置' : '请联系超级管理员添加邮箱'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 邮箱创建模态框 */}
      {showCreateModal && (
        <EmailCreateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            refetchEmails()
          }}
        />
      )}

      {/* 邮箱编辑模态框 */}
      {editingEmail && (
        <EmailEditModal
          email={editingEmail}
          onClose={() => setEditingEmail(null)}
          onSuccess={() => {
            setEditingEmail(null)
            refetchEmails()
          }}
        />
      )}

      {/* 单个邮箱测试模态框 */}
      {showTestModal && (
        <EmailTestModal
          onClose={() => setShowTestModal(false)}
          emails={emails.filter(e => e.status === '启用')}
        />
      )}

      {/* 批量测试模态框 */}
      {showBulkTestModal && (
        <BulkTestModal
          onClose={() => setShowBulkTestModal(false)}
        />
      )}

      {/* 选中邮箱测试 */}
      {selectedEmail && selectedEmail.testType === 'single' && (
        <EmailTestModal
          onClose={() => setSelectedEmail(null)}
          emails={[selectedEmail]}
          defaultEmailId={selectedEmail.id}
        />
      )}
    </div>
  )
}

// 邮箱创建模态框
const EmailCreateModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    from: '',
    active: true
  })
  
  const mutation = useMutation({
    mutationFn: emailAPI.create,
    onSuccess: () => {
      toast.success('邮箱添加成功')
      onSuccess()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '邮箱添加失败')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.from) {
      formData.from = formData.user
    }
    mutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">添加邮箱</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                邮箱名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="input-neon w-full"
                placeholder="例如：QQ邮箱主号"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  SMTP主机 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({...formData, host: e.target.value})}
                  className="input-neon w-full"
                  placeholder="如：smtp.qq.com, smtp.163.com, smtp.feishu.cn"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  支持所有主流邮箱服务商，系统会自动适配SSL配置
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  端口 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
                  className="input-neon w-full"
                  min="1"
                  max="65535"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                用户名（邮箱地址） <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.user}
                onChange={(e) => setFormData({...formData, user: e.target.value})}
                className="input-neon w-full"
                placeholder="your@email.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                密码/授权码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="input-neon w-full"
                placeholder="邮箱密码或授权码"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                发件人地址
              </label>
              <input
                type="email"
                value={formData.from}
                onChange={(e) => setFormData({...formData, from: e.target.value})}
                className="input-neon w-full"
                placeholder="留空使用用户名"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.secure}
                    onChange={(e) => setFormData({...formData, secure: e.target.checked})}
                    className="rounded border-slate-300"
                  />
                  <span className="ml-2 text-sm text-slate-700">使用SSL直连 (端口465)</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({...formData, active: e.target.checked})}
                    className="rounded border-slate-300"
                  />
                  <span className="ml-2 text-sm text-slate-700">立即启用</span>
                </label>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-medium text-blue-800 text-sm mb-2">💡 配置提示</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• <strong>端口587:</strong> STARTTLS加密，取消勾选SSL直连</li>
                  <li>• <strong>端口465:</strong> SSL直连，勾选SSL直连</li>
                  <li>• <strong>端口25:</strong> 通常无加密或STARTTLS</li>
                  <li>• 系统支持自动SSL兼容性配置</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={mutation.isLoading}
                className="btn-primary"
              >
                {mutation.isLoading ? '添加中...' : '添加'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// 邮箱编辑模态框
const EmailEditModal = ({ email, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: email.name || '',
    host: email.host || '',
    port: email.port || 587,
    secure: email.secure || false,
    user: email.user || '',
    password: '',
    from: email.from || '',
    active: email.status === '启用'
  })
  
  const mutation = useMutation({
    mutationFn: (data) => emailAPI.update(email.id, data),
    onSuccess: () => {
      toast.success('邮箱更新成功')
      onSuccess()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '邮箱更新失败')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const updateData = { ...formData }
    if (!updateData.password) {
      delete updateData.password // 不更新密码
    }
    mutation.mutate(updateData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">编辑邮箱</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">邮箱名称</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="input-neon w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SMTP主机</label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({...formData, host: e.target.value})}
                  className="input-neon w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">端口</label>
                <input
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
                  className="input-neon w-full"
                  min="1"
                  max="65535"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
              <input
                type="email"
                value={formData.user}
                onChange={(e) => setFormData({...formData, user: e.target.value})}
                className="input-neon w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                新密码 <span className="text-sm text-slate-500">(留空保持不变)</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="input-neon w-full"
                placeholder="留空不更新密码"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">发件人地址</label>
              <input
                type="email"
                value={formData.from}
                onChange={(e) => setFormData({...formData, from: e.target.value})}
                className="input-neon w-full"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.secure}
                  onChange={(e) => setFormData({...formData, secure: e.target.checked})}
                  className="rounded border-slate-300"
                />
                <span className="ml-2 text-sm text-slate-700">使用SSL/TLS加密</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({...formData, active: e.target.checked})}
                  className="rounded border-slate-300"
                />
                <span className="ml-2 text-sm text-slate-700">启用邮箱</span>
              </label>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={mutation.isLoading}
                className="btn-primary"
              >
                {mutation.isLoading ? '更新中...' : '更新'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// 邮箱测试模态框
const EmailTestModal = ({ onClose, emails, defaultEmailId }) => {
  const [testData, setTestData] = useState({
    recipient: '',
    emailId: defaultEmailId || ''
  })
  
  const mutation = useMutation({
    mutationFn: emailAPI.test,
    onSuccess: (response) => {
      toast.success(`测试邮件发送成功！使用邮箱: ${response.data.emailName}`)
      onClose()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '测试邮件发送失败')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(testData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">测试邮箱</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                收件人邮箱 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={testData.recipient}
                onChange={(e) => setTestData({...testData, recipient: e.target.value})}
                className="input-neon w-full"
                placeholder="test@example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">选择邮箱</label>
              <select
                value={testData.emailId}
                onChange={(e) => setTestData({...testData, emailId: e.target.value})}
                className="input-neon w-full"
              >
                <option value="">自动选择（轮询）</option>
                {emails.map(email => (
                  <option key={email.id} value={email.id}>
                    {email.name} ({email.user})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={mutation.isLoading}
                className="btn-primary"
              >
                {mutation.isLoading ? '发送中...' : '发送测试'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// 批量测试模态框
const BulkTestModal = ({ onClose }) => {
  const [testData, setTestData] = useState({
    recipients: [''],
    subject: '批量邮件测试',
    content: '这是一封批量测试邮件，用于验证邮箱池的轮询和重试功能。'
  })
  
  const mutation = useMutation({
    mutationFn: emailAPI.bulkTest,
    onSuccess: (response) => {
      const { summary } = response.data
      toast.success(`批量测试完成: ${summary.success}/${summary.total} 成功`)
      onClose()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '批量测试失败')
    }
  })

  const handleAddRecipient = () => {
    setTestData({
      ...testData,
      recipients: [...testData.recipients, '']
    })
  }

  const handleRemoveRecipient = (index) => {
    const newRecipients = testData.recipients.filter((_, i) => i !== index)
    setTestData({
      ...testData,
      recipients: newRecipients.length > 0 ? newRecipients : ['']
    })
  }

  const handleRecipientChange = (index, value) => {
    const newRecipients = [...testData.recipients]
    newRecipients[index] = value
    setTestData({
      ...testData,
      recipients: newRecipients
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const validRecipients = testData.recipients.filter(email => email.trim())
    if (validRecipients.length === 0) {
      toast.error('请至少添加一个收件人')
      return
    }
    
    mutation.mutate({
      ...testData,
      recipients: validRecipients
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">批量邮件测试</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                收件人列表 <span className="text-red-500">*</span>
              </label>
              {testData.recipients.map((recipient, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={recipient}
                    onChange={(e) => handleRecipientChange(index, e.target.value)}
                    className="input-neon flex-1"
                    placeholder={`收件人 ${index + 1}`}
                  />
                  {testData.recipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(index)}
                      className="btn-secondary text-sm px-2"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddRecipient}
                className="btn-secondary text-sm mt-2"
                disabled={testData.recipients.length >= 10}
              >
                <Plus size={16} className="mr-1" />
                添加收件人
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">邮件主题</label>
              <input
                type="text"
                value={testData.subject}
                onChange={(e) => setTestData({...testData, subject: e.target.value})}
                className="input-neon w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">邮件内容</label>
              <textarea
                value={testData.content}
                onChange={(e) => setTestData({...testData, content: e.target.value})}
                className="input-neon w-full"
                rows={4}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={mutation.isLoading}
                className="btn-primary"
              >
                {mutation.isLoading ? '发送中...' : '批量发送'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EmailManagement

