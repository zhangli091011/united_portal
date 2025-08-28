import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { registrationAPI } from '../services/api'
import { Search, Calendar, User, Tag, CheckCircle, XCircle, Clock } from 'lucide-react'
import LoadingSpinner from '../components/UI/LoadingSpinner'

const QueryPage = () => {
  const [result, setResult] = useState(null)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm()

  const queryMutation = useMutation({
    mutationFn: registrationAPI.query,
    onSuccess: (response) => {
      setResult(response.data.data)
    },
    onError: (error) => {
      setResult(null)
    }
  })

  const onSubmit = (data) => {
    queryMutation.mutate(data.registrationId.trim())
  }

  const getStatusIcon = (status) => {
    if (status?.includes('通过')) {
      return <CheckCircle className="text-green-400" size={20} />
    } else if (status?.includes('驳回')) {
      return <XCircle className="text-red-400" size={20} />
    } else {
      return <Clock className="text-yellow-400" size={20} />
    }
  }

  const getStatusColor = (status) => {
    if (status?.includes('通过')) {
      return 'text-green-400'
    } else if (status?.includes('驳回')) {
      return 'text-red-400'
    } else {
      return 'text-yellow-400'
    }
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold neon-text mb-4">
            报名查询
          </h1>
          <p className="text-slate-600 text-lg">
            输入您的报名编号查询报名状态
          </p>
        </div>

        {/* 查询表单 */}
        <div className="card-neon p-8 mb-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                报名编号
              </label>
              <div className="relative">
                <input
                  type="text"
                  {...register('registrationId', { 
                    required: '请输入报名编号',
                    pattern: {
                      value: /^26ZCW\d{11}$/,
                      message: '请输入正确的报名编号格式'
                    }
                  })}
                  className="input-neon w-full pl-12"
                  placeholder="请输入报名编号，如：26ZCW202412010001"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-600" size={20} />
              </div>
              {errors.registrationId && (
                <p className="text-red-400 text-sm mt-1">{errors.registrationId.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={queryMutation.isLoading}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              {queryMutation.isLoading ? (
                <LoadingSpinner size="small" />
              ) : (
                <Search size={20} />
              )}
              <span>
                {queryMutation.isLoading ? '查询中...' : '查询报名信息'}
              </span>
            </button>
          </form>
        </div>

        {/* 查询结果 */}
        {queryMutation.isError && (
          <div className="card-neon p-6 border-red-500/50">
            <div className="flex items-center space-x-3 text-red-400">
              <XCircle size={24} />
              <div>
                <h3 className="font-semibold">查询失败</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {queryMutation.error?.response?.data?.message || '报名记录不存在或编号错误'}
                </p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* 状态卡片 */}
            <div className="card-neon p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">报名状态</h2>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(result.status)}
                  <span className={`font-semibold ${getStatusColor(result.status)}`}>
                    {result.status || '待审核'}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 text-blue-700 mb-2">
                    <Tag size={16} />
                    <span className="font-medium">报名编号</span>
                  </div>
                  <p className="font-mono text-lg text-slate-800">{result.registrationId}</p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 text-blue-700 mb-2">
                    <Calendar size={16} />
                    <span className="font-medium">提交时间</span>
                  </div>
                  <p className="text-slate-800">{new Date(result.createdTime).toLocaleString('zh-CN')}</p>
                </div>
              </div>
            </div>

            {/* 详细信息 */}
            <div className="card-neon p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                <User className="mr-2" size={20} />
                报名详情
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      参演单位
                    </label>
                    <p className="text-slate-800">{result.name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      作品类型
                    </label>
                    <span className="inline-block bg-primary-orange/20 text-primary-orange px-3 py-1 rounded-full text-sm">
                      {result.type}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    作品名称
                  </label>
                  <p className="text-slate-800 text-lg font-medium">{result.programName}</p>
                </div>

                {result.remarks && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      备注信息
                    </label>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                      <p className="text-slate-700 whitespace-pre-wrap">{result.remarks}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 状态说明 */}
            <div className="card-neon p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">状态说明</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-3">
                  <Clock className="text-yellow-400 mt-0.5 flex-shrink-0" size={16} />
                  <div>
                    <p className="text-yellow-400 font-medium">待审核</p>
                    <p className="text-slate-600">您的报名已提交，正在等待审核</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle className="text-green-400 mt-0.5 flex-shrink-0" size={16} />
                  <div>
                    <p className="text-green-400 font-medium">审核通过</p>
                    <p className="text-slate-600">恭喜！您的报名已通过审核</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <XCircle className="text-red-400 mt-0.5 flex-shrink-0" size={16} />
                  <div>
                    <p className="text-red-400 font-medium">审核驳回</p>
                    <p className="text-slate-600">很遗憾，您的报名未通过审核，请查看备注信息</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => {
                  setResult(null)
                  reset()
                }}
                className="btn-secondary flex-1"
              >
                重新查询
              </button>
              
              <a
                href="/register"
                className="btn-primary flex-1 text-center"
              >
                提交新报名
              </a>
            </div>
          </div>
        )}

        {/* 查询提示 */}
        {!result && !queryMutation.isError && (
          <div className="card-neon p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">查询说明</h3>
            <div className="space-y-3 text-slate-600">
              <p>• 请输入完整的报名编号，格式为：26ZCW + 日期 + 序号</p>
              <p>• 报名编号在提交报名后会自动生成并发送到您的QQ邮箱</p>
              <p>• 如果查询不到结果，请检查编号是否正确或联系管理员</p>
              <p>• 审核结果会通过邮件通知，请注意查收</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default QueryPage
