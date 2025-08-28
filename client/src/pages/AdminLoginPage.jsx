import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authAPI } from '../services/api'
import { Shield, User, Lock, ExternalLink } from 'lucide-react'
import LoadingSpinner from '../components/UI/LoadingSpinner'
import toast from 'react-hot-toast'

const AdminLoginPage = () => {
  const [loginType, setLoginType] = useState('username')
  const [feishuAuthUrl, setFeishuAuthUrl] = useState('')
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm()

  useEffect(() => {
    // 如果已经登录，重定向到后台
    if (user) {
      navigate('/admin/dashboard')
      return
    }

    // 获取飞书授权URL
    const fetchFeishuAuthUrl = async () => {
      try {
        const response = await authAPI.feishuAuthUrl()
        setFeishuAuthUrl(response.data.authUrl)
      } catch (error) {
        console.error('获取飞书授权URL失败:', error)
      }
    }

    fetchFeishuAuthUrl()

    // 处理飞书授权回调
    const urlParams = new URLSearchParams(location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')

    if (code && state === 'united_portal') {
      handleFeishuCallback(code)
    }
  }, [user, navigate, location])

  const handleFeishuCallback = async (code) => {
    try {
      await login({ code }, 'feishu')
      toast.success('飞书登录成功！')
      navigate('/admin/dashboard', { replace: true })
    } catch (error) {
      toast.error('飞书登录失败：' + (error.response?.data?.message || error.message))
    }
  }

  const onSubmit = async (data) => {
    try {
      await login(data, loginType)
      toast.success('登录成功！')
      // 使用replace而不是push，避免回退到登录页
      navigate('/admin/dashboard', { replace: true })
    } catch (error) {
      // 错误已在AuthContext中处理
      console.error('登录错误:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="card-neon p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-orange to-neon-blue rounded-2xl flex items-center justify-center">
                <Shield className="text-white" size={32} />
              </div>
            </div>
            <h1 className="text-2xl font-bold neon-text mb-2 text-slate-600">中春晚 United Portal</h1>
          </div>

          {/* 登录方式选择 */}
          <div className="mb-6">
            <div className="flex rounded-lg bg-primary-dark-secondary p-1">
              <button
                type="button"
                onClick={() => setLoginType('username')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  loginType === 'username'
                    ? 'bg-primary-orange text-white'
                    : 'text-slate-600 hover:text-white'
                }`}
              >
                用户名登录
              </button>
              <button
                type="button"
                onClick={() => setLoginType('employee')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  loginType === 'employee'
                    ? 'bg-primary-orange text-white'
                    : 'text-slate-600 hover:text-white'
                }`}
              >
                员工编码登录
              </button>
            </div>
          </div>

          {loginType === 'username' ? (
            /* 用户名登录表单 */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  用户名
                </label>
                <div className="relative">
                  <input
                    type="text"
                    {...register('username', { required: '请输入用户名' })}
                    className="input-neon w-full pl-12"
                    placeholder="请输入用户名"
                  />
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-600" size={20} />
                </div>
                {errors.username && (
                  <p className="text-red-400 text-sm mt-1">{errors.username.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  密码
                </label>
                <div className="relative">
                  <input
                    type="password"
                    {...register('password', { required: '请输入密码' })}
                    className="input-neon w-full pl-12"
                    placeholder="请输入密码"
                  />
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-600" size={20} />
                </div>
                {errors.password && (
                  <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <Shield size={20} />
                )}
                <span>{isSubmitting ? '登录中...' : '登录'}</span>
              </button>
            </form>
          ) : loginType === 'employee' ? (
            /* 员工编码登录表单 */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  员工编码
                </label>
                <div className="relative">
                  <input
                    type="text"
                    {...register('employeeCode', { required: '请输入员工编码' })}
                    className="input-neon w-full pl-12"
                    placeholder="请输入员工编码"
                  />
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-600" size={20} />
                </div>
                {errors.employeeCode && (
                  <p className="text-red-400 text-sm mt-1">{errors.employeeCode.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  密码
                </label>
                <div className="relative">
                  <input
                    type="password"
                    {...register('password', { required: '请输入密码' })}
                    className="input-neon w-full pl-12"
                    placeholder="请输入密码"
                  />
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-600" size={20} />
                </div>
                {errors.password && (
                  <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <Shield size={20} />
                )}
                <span>{isSubmitting ? '登录中...' : '登录'}</span>
              </button>
            </form>
          ) : (
            // 飞书授权登录
            <div className="space-y-6">
              <div className="text-center">
                <div className="bg-primary-dark-secondary p-6 rounded-lg mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <ExternalLink className="text-white" size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">飞书授权登录</h3>
                  <p className="text-slate-600 text-sm">
                    点击下方按钮将跳转到飞书进行身份验证
                  </p>
                </div>
              </div>

              {feishuAuthUrl ? (
                <a
                  href={feishuAuthUrl}
                  className="btn-primary w-full flex items-center justify-center space-x-2"
                >
                  <ExternalLink size={20} />
                  <span>跳转到飞书登录</span>
                </a>
              ) : (
                <div className="text-center">
                  <LoadingSpinner />
                  <p className="text-slate-600 text-sm mt-2">正在获取授权链接...</p>
                </div>
              )}

              <div className="text-center">
                <p className="text-slate-600 text-xs">
                  使用飞书登录需要管理员权限<br/>
                  如有问题请联系系统管理员
                </p>
              </div>
            </div>
          )}

          {/* 分割线 */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <a
                href="/"
                className="text-slate-600 hover:text-primary-orange transition-colors"
              >
                返回首页
              </a>
                <span className="text-slate-600">quantumlight. © 2024</span>
            </div>
          </div>
        </div>

        {/* 开发环境提示 */}
      </div>
    </div>
  )
}

export default AdminLoginPage
