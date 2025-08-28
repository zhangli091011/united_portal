import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { registrationAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Send, User, Phone, FileText, Tag, CheckCircle } from 'lucide-react'
import LoadingSpinner from '../components/UI/LoadingSpinner'

const RegistrationPage = () => {
  const [submitted, setSubmitted] = useState(false)
  const [registrationId, setRegistrationId] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm()

  const submitMutation = useMutation({
    mutationFn: registrationAPI.submit,
    onSuccess: (response) => {
      const { registrationId } = response.data.data
      setRegistrationId(registrationId)
      setSubmitted(true)
      toast.success('报名提交成功！')
      reset()
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || '提交失败，请重试'
      
      // 检查是否是邮件发送相关错误
      if (errorMessage.includes('配额') || errorMessage.includes('quota') || 
          errorMessage.includes('limit') || errorMessage.includes('邮件发送失败')) {
        toast.error('报名已成功提交，但邮件发送失败。请记录报名编号，稍后可查询状态。', {
          duration: 6000
        })
      } else {
        toast.error(errorMessage)
      }
    }
  })

  const onSubmit = (data) => {
    submitMutation.mutate(data)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="card-neon p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="text-white" size={40} />
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-800">提交成功！</h2>
              <p className="text-slate-600">
                您的报名信息已成功提交，报名编号为：
              </p>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-blue-700 font-mono text-xl font-bold">
                  {registrationId}
                </p>
              </div>
              <p className="text-sm text-slate-500">
                请保存好您的报名编号，可用于查询报名状态。
                确认邮件已发送至您提供的QQ邮箱。
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setSubmitted(false)
                  setRegistrationId('')
                }}
                className="btn-secondary w-full"
              >
                继续报名
              </button>
              <a
                href="/query"
                className="btn-primary w-full inline-block text-center"
              >
                查询报名状态
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold neon-text mb-4">
            节目报名
          </h1>
          <p className="text-slate-600 text-lg">
            填写您的节目信息，让创意闪耀舞台
          </p>
        </div>

        <div className="card-neon p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-primary-orange flex items-center">
                <User className="mr-2" size={20} />
                基本信息
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    参演单位 *
                  </label>
                  <input
                    type="text"
                    {...register('name', { required: '请输入参演单位' })}
                    className="input-neon w-full"
                    placeholder="请输入参演单位名称"
                  />
                  {errors.name && (
                    <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div> 
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    联系方式 (QQ号) *
                  </label>
                  <input
                    type="text"
                    {...register('contact', { 
                      required: '请输入QQ号',
                      pattern: {
                        value: /^\d{5,12}$/,
                        message: '请输入有效的QQ号'
                      }
                    })}
                    className="input-neon w-full"
                    placeholder="请输入QQ号"
                  />
                  {errors.contact && (
                    <p className="text-red-400 text-sm mt-1">{errors.contact.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 节目信息 */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-primary-orange flex items-center">
                <Tag className="mr-2" size={20} />
                节目信息
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  作品类型 *
                </label>
                <select
                  {...register('type', { required: '请选择作品类型' })}
                  className="input-neon w-full"
                >
                  <option value="">请选择作品类型</option>
                  <option value="公益短片（非合作方请不要选择此项）">公益短片（非合作方请不要选择此项）</option>
                  <option value="小品">小品</option>
                  <option value="相声">相声</option>
                  <option value="乐器">乐器</option>
                  <option value="戏曲">戏曲</option>
                  <option value="说唱">说唱</option>
                  <option value="舞蹈">舞蹈</option>
                  <option value="歌曲">歌曲</option>
                  <option value="魔术">魔术</option>
                  <option value="杂技">杂技</option>
                  <option value="《难忘今宵》合唱">《难忘今宵》合唱</option>
                  <option value="混剪">混剪</option>
                  <option value="其他">其他</option>
                  <option value="公益短片">公益短片</option>
                </select>
                {errors.type && (
                  <p className="text-red-400 text-sm mt-1">{errors.type.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  作品名称 *
                </label>
                <input
                  type="text"
                  {...register('programName', { required: '请输入作品名称' })}
                  className="input-neon w-full"
                  placeholder="请输入您的作品名称"
                />
                {errors.programName && (
                  <p className="text-red-400 text-sm mt-1">{errors.programName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  演职人员 *
                </label>
                <input
                  type="text"
                  {...register('performers', { required: '请输入演职人员' })}
                  className="input-neon w-full"
                  placeholder="请输入参与演出的人员名单"
                />
                {errors.performers && (
                  <p className="text-red-400 text-sm mt-1">{errors.performers.message}</p>
                )}
              </div>
            </div>

            {/* 附加信息 */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-primary-orange flex items-center">
                <FileText className="mr-2" size={20} />
                附加信息
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  演职人员是否出镜
                </label>
                <select
                  {...register('onCamera')}
                  className="input-neon w-full"
                >
                  <option value="">请选择</option>
                  <option value="是">是</option>
                  <option value="否">否</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  版权确认 *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      {...register('copyright', { required: '请确认版权信息' })}
                      value="我确定！"
                      className="text-primary-orange"
                    />
                    <span className="text-slate-700">我确定节目为自创或已获得授权</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      {...register('copyright')}
                      value="自行视频录制"
                      className="text-primary-orange"
                    />
                    <span className="text-slate-700">自行视频录制</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      {...register('copyright')}
                      value="符合版权法的授权"
                      className="text-primary-orange"
                    />
                    <span className="text-slate-700">符合版权法的授权</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      {...register('copyright')}
                      value="其他版权类型"
                      className="text-primary-orange"
                    />
                    <span className="text-slate-700">其他版权类型</span>
                  </label>
                </div>
                {errors.copyright && (
                  <p className="text-red-400 text-sm mt-1">{errors.copyright.message}</p>
                )}
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="pt-6 border-t border-gray-700">
              <button
                type="submit"
                disabled={submitMutation.isLoading}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                {submitMutation.isLoading ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <Send size={20} />
                )}
                <span>
                  {submitMutation.isLoading ? '提交中...' : '提交报名'}
                </span>
              </button>
              
              <p className="text-center text-sm text-gray-400 mt-4">
                提交后将自动生成报名编号，请妥善保存用于查询状态
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RegistrationPage
