import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../contexts/AuthContext'
import { userAPI } from '../../services/api'
import { X, Key, Lock } from 'lucide-react'
import LoadingSpinner from '../UI/LoadingSpinner'
import toast from 'react-hot-toast'

const PasswordModal = ({ user, onSave, onCancel }) => {
  const { user: currentUser, isSuperAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm()

  const watchNewPassword = watch('newPassword')
  const isOwnPassword = currentUser.id === user.id

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      
      const passwordData = {
        newPassword: data.newPassword
      }

      // 如果不是超级管理员修改别人的密码，需要提供当前密码
      if (!isSuperAdmin() || isOwnPassword) {
        passwordData.currentPassword = data.currentPassword
      }

      await userAPI.updatePassword(user.id, passwordData)
      toast.success('密码修改成功')
      onSave()
    } catch (error) {
      console.error('修改密码失败:', error)
      // 错误信息已在API拦截器中处理
    } finally {
      setLoading(false)
    }
  }

  const needCurrentPassword = !isSuperAdmin() || isOwnPassword

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-primary-dark-main rounded-xl border border-gray-700 w-full max-w-md">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">修改密码</h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-gray-300">
              正在为用户 <span className="text-primary-orange font-semibold">{user.username}</span> 修改密码
            </p>
            {isSuperAdmin() && !isOwnPassword && (
              <p className="text-sm text-gray-400 mt-1">
                作为超级管理员，您可以直接设置新密码
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {needCurrentPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  当前密码 *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    {...register('currentPassword', { 
                      required: '请输入当前密码'
                    })}
                    className="input-neon w-full pl-10"
                    placeholder="请输入当前密码"
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                </div>
                {errors.currentPassword && (
                  <p className="text-red-400 text-sm mt-1">{errors.currentPassword.message}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                新密码 *
              </label>
              <div className="relative">
                <input
                  type="password"
                  {...register('newPassword', { 
                    required: '请输入新密码',
                    minLength: { value: 6, message: '密码至少6个字符' }
                  })}
                  className="input-neon w-full pl-10"
                  placeholder="请输入新密码"
                />
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
              {errors.newPassword && (
                <p className="text-red-400 text-sm mt-1">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                确认新密码 *
              </label>
              <div className="relative">
                <input
                  type="password"
                  {...register('confirmPassword', { 
                    required: '请确认新密码',
                    validate: value => value === watchNewPassword || '两次输入的密码不一致'
                  })}
                  className="input-neon w-full pl-10"
                  placeholder="请再次输入新密码"
                />
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* 密码强度提示 */}
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-2">密码要求：</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• 至少6个字符</li>
                <li>• 建议包含大小写字母、数字和特殊字符</li>
                <li>• 避免使用个人信息作为密码</li>
              </ul>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-4 pt-4">
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
                <span>修改密码</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PasswordModal
