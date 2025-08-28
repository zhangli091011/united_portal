import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { userAPI } from '../../services/api'
import { X, User, Mail, Shield, Key, Check } from 'lucide-react'
import LoadingSpinner from '../UI/LoadingSpinner'
import toast from 'react-hot-toast'

const UserModal = ({ user, permissions, mode, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState([])
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm()

  const watchRole = watch('role', 'admin')

  useEffect(() => {
    if (user && mode === 'edit') {
      setValue('username', user.username)
      setValue('email', user.email || '')
      setValue('role', user.role)
      setSelectedPermissions(user.permissions || [])
    } else {
      // 创建模式的默认值
      setValue('role', 'admin')
      setSelectedPermissions([])
    }
  }, [user, mode, setValue])

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      
      const userData = {
        username: data.username,
        email: data.email || null,
        role: data.role,
        permissions: selectedPermissions
      }

      if (mode === 'create') {
        if (!data.password) {
          toast.error('请输入密码')
          return
        }
        userData.password = data.password
        await userAPI.create(userData)
        toast.success('用户创建成功')
      } else {
        await userAPI.update(user.id, userData)
        toast.success('用户更新成功')
      }

      onSave()
    } catch (error) {
      console.error('保存用户失败:', error)
      // 错误信息已在API拦截器中处理
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionToggle = (permissionName) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionName)) {
        return prev.filter(p => p !== permissionName)
      } else {
        return [...prev, permissionName]
      }
    })
  }

  const handleSelectAllPermissions = (category) => {
    const categoryPermissions = permissions[category]?.map(p => p.name) || []
    const allSelected = categoryPermissions.every(p => selectedPermissions.includes(p))
    
    if (allSelected) {
      // 取消选择该分类的所有权限
      setSelectedPermissions(prev => prev.filter(p => !categoryPermissions.includes(p)))
    } else {
      // 选择该分类的所有权限
      setSelectedPermissions(prev => {
        const newPermissions = [...prev]
        categoryPermissions.forEach(p => {
          if (!newPermissions.includes(p)) {
            newPermissions.push(p)
          }
        })
        return newPermissions
      })
    }
  }

  const getRolePresetPermissions = (role) => {
    switch (role) {
      case 'super_admin':
        // 超级管理员拥有所有权限
        return Object.values(permissions).flat().map(p => p.name)
      case 'admin':
        // 普通管理员的默认权限
        return [
          'registration.view', 'registration.edit', 'registration.delete', 'registration.export',
          'news.manage', 'stats.view'
        ]
      default:
        return []
    }
  }

  const handleRoleChange = (role) => {
    setValue('role', role)
    if (role === 'super_admin') {
      // 超级管理员自动获得所有权限
      const allPermissions = Object.values(permissions).flat().map(p => p.name)
      setSelectedPermissions(allPermissions)
    } else {
      // 设置角色预设权限
      const presetPermissions = getRolePresetPermissions(role)
      setSelectedPermissions(presetPermissions)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-primary-dark-main rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {mode === 'create' ? '添加用户' : '编辑用户'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  用户名 *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    {...register('username', { 
                      required: '请输入用户名',
                      minLength: { value: 3, message: '用户名至少3个字符' },
                      maxLength: { value: 50, message: '用户名不能超过50个字符' }
                    })}
                    className="input-neon w-full pl-10"
                    placeholder="请输入用户名"
                  />
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                </div>
                {errors.username && (
                  <p className="text-red-400 text-sm mt-1">{errors.username.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  邮箱
                </label>
                <div className="relative">
                  <input
                    type="email"
                    {...register('email', {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: '请输入有效的邮箱地址'
                      }
                    })}
                    className="input-neon w-full pl-10"
                    placeholder="请输入邮箱地址"
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                </div>
                {errors.email && (
                  <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              {mode === 'create' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    密码 *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      {...register('password', { 
                        required: '请输入密码',
                        minLength: { value: 6, message: '密码至少6个字符' }
                      })}
                      className="input-neon w-full pl-10"
                      placeholder="请输入密码"
                    />
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  </div>
                  {errors.password && (
                    <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  角色 *
                </label>
                <div className="relative">
                  <select
                    {...register('role', { required: '请选择角色' })}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="input-neon w-full pl-10 appearance-none"
                  >
                    <option value="admin">管理员</option>
                    <option value="super_admin">超级管理员</option>
                  </select>
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                </div>
                {errors.role && (
                  <p className="text-red-400 text-sm mt-1">{errors.role.message}</p>
                )}
              </div>
            </div>

            {/* 权限设置 */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">权限设置</h3>
              
              {watchRole === 'super_admin' ? (
                <div className="card-neon p-4 text-center">
                  <Shield className="mx-auto text-red-400 mb-2" size={32} />
                  <p className="text-gray-300">超级管理员拥有所有系统权限</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(permissions).map(([category, categoryPermissions]) => {
                    const allSelected = categoryPermissions.every(p => selectedPermissions.includes(p.name))
                    const someSelected = categoryPermissions.some(p => selectedPermissions.includes(p.name))
                    
                    return (
                      <div key={category} className="card-neon p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-white">{category}</h4>
                          <button
                            type="button"
                            onClick={() => handleSelectAllPermissions(category)}
                            className={`text-sm px-3 py-1 rounded transition-colors ${
                              allSelected 
                                ? 'bg-primary-orange text-white' 
                                : someSelected
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {allSelected ? '取消全选' : someSelected ? '全选' : '全选'}
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {categoryPermissions.map((permission) => (
                            <label
                              key={permission.name}
                              className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700/50 cursor-pointer"
                            >
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.includes(permission.name)}
                                  onChange={() => handlePermissionToggle(permission.name)}
                                  className="sr-only"
                                />
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                  selectedPermissions.includes(permission.name)
                                    ? 'bg-primary-orange border-primary-orange'
                                    : 'border-gray-500'
                                }`}>
                                  {selectedPermissions.includes(permission.name) && (
                                    <Check className="text-white" size={12} />
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-white">{permission.description}</div>
                                <div className="text-xs text-gray-400">{permission.name}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center space-x-2"
              >
                {loading && <LoadingSpinner size="small" />}
                <span>{mode === 'create' ? '创建用户' : '保存更改'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default UserModal
