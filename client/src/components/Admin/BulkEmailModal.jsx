import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { registrationAPI } from '../../services/api'
import { X, Mail, Send, Loader2, AlertCircle, CheckCircle2, Users } from 'lucide-react'
import toast from 'react-hot-toast'

const BulkEmailModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  preSelectedStatuses = [], 
  preSelectedTypes = [], 
  selectedRegistrationIds = [], 
  selectedRegistrations = [] 
}) => {
  const [formData, setFormData] = useState({
    emailType: 'custom',
    statusFilter: preSelectedStatuses,
    typeFilter: preSelectedTypes,
    bccEmail: '',
    content: {
      subject: '',
      title: '',
      message: '',
      newStatus: '',
      adminNote: '',
      priority: 'normal',
      urgent: false,
      deadline: '',
      actionRequired: false
    }
  })
  
  const [previewCount, setPreviewCount] = useState(0)
  const [sendingProgress, setSendingProgress] = useState(null)

  // 稳定化数组依赖项
  const statusFilterKey = useMemo(() => formData.statusFilter.join(','), [formData.statusFilter])
  const typeFilterKey = useMemo(() => formData.typeFilter.join(','), [formData.typeFilter])
  const preSelectedStatusesKey = useMemo(() => preSelectedStatuses.join(','), [preSelectedStatuses])
  const preSelectedTypesKey = useMemo(() => preSelectedTypes.join(','), [preSelectedTypes])

  // 获取状态选项
  const { data: statusOptions } = useQuery({
    queryKey: ['status-options'],
    queryFn: registrationAPI.getStatusOptions,
    enabled: isOpen
  })

  // 获取类型选项
  const { data: typeOptions } = useQuery({
    queryKey: ['type-options'],
    queryFn: registrationAPI.getTypeOptions,
    enabled: isOpen
  })

  // 获取报名列表预览数量
  const { data: registrationsData, isLoading: isLoadingRegistrations, error: registrationsError } = useQuery({
    queryKey: ['registrations-preview', statusFilterKey, typeFilterKey],
    queryFn: async () => {
      console.log('🔄 开始获取报名数据...')
      console.log('🔄 API URL:', import.meta.env.VITE_API_BASE_URL || 'https://united.quantumlight.cc/api')
      try {
        const result = await registrationAPI.getAll({ 
          page: 1, 
          pageSize: 1000
          // 不在API层面过滤，在前端进行全面过滤
        })
        console.log('✅ API调用成功，返回数据:', result)
        return result
      } catch (error) {
        console.error('❌ API调用失败:', error)
        console.error('❌ 错误详情:', error.response?.data)
        throw error
      }
    },
    enabled: isOpen && selectedRegistrations.length === 0,
    retry: 1,
    staleTime: 0
  })

  // 处理获取到的数据并计算预览数量
  useEffect(() => {
    // 如果有具体选中的记录，优先使用这些记录
    if (selectedRegistrations.length > 0) {
      const validItems = selectedRegistrations.filter(item => {
        if (!item.contact) {
          return false
        }
        return true
      })
      
      console.log('📊 有效的预选记录数:', validItems.length)
      setPreviewCount(validItems.length)
      return
    }
    
    // 否则使用API数据和筛选条件
    if (registrationsData) {
      console.log('📊 收到报名数据响应:', registrationsData)
      
      // 计算符合条件的记录数
      const allItems = registrationsData?.data?.data?.items || []
      console.log('📊 获取到的所有记录数:', allItems.length)
      console.log('📊 当前筛选条件:', { 
        statusFilter: formData.statusFilter, 
        typeFilter: formData.typeFilter 
      })
      
      if (allItems.length === 0) {
        console.log('⚠️ API返回的记录数为0')
        setPreviewCount(0)
        return
      }
      
      const filteredItems = allItems.filter(item => {
        // 检查联系方式
        if (!item.contact) {
          console.log('⚠️ 跳过记录（无联系方式）:', item.registrationId)
          return false
        }
        
        // 状态过滤
        if (formData.statusFilter.length > 0 && !formData.statusFilter.includes(item.status)) {
          return false
        }
        
        // 类型过滤
        if (formData.typeFilter.length > 0 && !formData.typeFilter.includes(item.type)) {
          return false
        }
        
        return true
      })
      
      console.log('📊 符合条件的记录数:', filteredItems.length)
      setPreviewCount(filteredItems.length)
    } else if (registrationsError) {
      console.error('❌ 获取报名数据失败:', registrationsError)
      setPreviewCount(0)
    }
  }, [selectedRegistrations, registrationsData, registrationsError, statusFilterKey, typeFilterKey, formData.statusFilter, formData.typeFilter])

  // 发送批量邮件
  const sendBulkEmailMutation = useMutation({
    mutationFn: registrationAPI.sendBulkEmail,
    onSuccess: (response) => {
      const result = response.data.data
      toast.success(`批量邮件发送完成！成功 ${result.success} 份，失败 ${result.failed} 份`)
      setSendingProgress(result)
      onSuccess?.(response.data)
      
      // 3秒后关闭模态框
      setTimeout(() => {
        onClose()
        setSendingProgress(null)
      }, 3000)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '批量邮件发送失败')
      setSendingProgress(null)
    }
  })

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 批量邮件弹窗打开，初始化表单...')
      setFormData({
        emailType: 'custom',
        statusFilter: [...preSelectedStatuses],
        typeFilter: [...preSelectedTypes],
        bccEmail: '',
        content: {
          subject: '',
          title: '',
          message: '',
          newStatus: '',
          adminNote: '',
          priority: 'normal',
          urgent: false,
          deadline: '',
          actionRequired: false
        }
      })
      setPreviewCount(0)
      setSendingProgress(null)
    } else {
      console.log('🔄 批量邮件弹窗关闭')
    }
  }, [isOpen, preSelectedStatusesKey, preSelectedTypesKey])

  const handleInputChange = (field, value) => {
    if (field.startsWith('content.')) {
      const contentField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        content: {
          ...prev.content,
          [contentField]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleMultiSelectChange = (field, value) => {
    setFormData(prev => {
      const currentValues = prev[field]
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
      
      return {
        ...prev,
        [field]: newValues
      }
    })
  }

  const validateForm = () => {
    if (formData.emailType === 'status_update' && !formData.content.newStatus) {
      toast.error('状态更新邮件需要选择新状态')
      return false
    }

    if ((formData.emailType === 'custom' || formData.emailType === 'reminder') && 
        !formData.content.title && !formData.content.message) {
      toast.error('请填写邮件标题或内容')
      return false
    }

    // 验证BCC邮箱格式
    if (formData.bccEmail && formData.bccEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.bccEmail.trim())) {
        toast.error('密送邮箱格式不正确')
        return false
      }
    }

    // 补发邮件不需要额外验证，直接使用已有的报名信息
    if (formData.emailType === 'resend') {
      // 补发邮件只需要确保有记录即可
    }

    if (previewCount === 0) {
      const message = formData.statusFilter.length === 0 && formData.typeFilter.length === 0
        ? '没有可发送邮件的记录，可能所有记录都缺少联系方式'
        : '当前筛选条件下没有符合条件的报名记录'
      toast.error(message)
      return false
    }

    return true
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    const confirmMessage = `确定要向 ${previewCount} 个报名记录发送邮件吗？`
    if (!window.confirm(confirmMessage)) return

    // 构建发送数据
    const sendData = {
      ...formData,
      // 如果有具体选中的记录，使用记录ID；否则使用筛选条件
      ...(selectedRegistrationIds.length > 0 
        ? { registrationIds: selectedRegistrationIds, statusFilter: [], typeFilter: [] }
        : {}
      )
    }

    console.log('📧 发送批量邮件数据:', sendData)
    sendBulkEmailMutation.mutate(sendData)
  }

  if (!isOpen) return null

  const emailTypeOptions = [
    { value: 'resend', label: '补发邮件', description: '补发报名确认邮件和节目信息' },
    { value: 'custom', label: '自定义通知', description: '发送自定义内容的通知邮件' },
    { value: 'reminder', label: '重要提醒', description: '发送重要事项提醒邮件' },
    { value: 'status_update', label: '状态更新', description: '批量更新报名状态并发送通知' }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card-neon max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
              <Mail size={24} />
              <span>批量发送邮件</span>
            </h3>
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-600 p-1"
              disabled={sendBulkEmailMutation.isLoading}
            >
              <X size={20} />
            </button>
          </div>

          {/* 发送进度显示 */}
          {sendingProgress && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle2 size={20} className="text-green-500" />
                <h4 className="font-medium text-slate-800">发送完成</h4>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{sendingProgress.success}</div>
                  <div className="text-slate-600">成功发送</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{sendingProgress.failed}</div>
                  <div className="text-slate-600">发送失败</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{sendingProgress.total}</div>
                  <div className="text-slate-600">总计</div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 邮件类型选择 */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-slate-800 border-b border-slate-200 pb-2">
                邮件类型
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {emailTypeOptions.map(option => (
                  <label
                    key={option.value}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.emailType === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="emailType"
                      value={option.value}
                      checked={formData.emailType === option.value}
                      onChange={(e) => handleInputChange('emailType', e.target.value)}
                      className="sr-only"
                    />
                    <div className="text-sm font-medium text-slate-800 mb-1">{option.label}</div>
                    <div className="text-xs text-slate-600">{option.description}</div>
                  </label>
                ))}
              </div>
            </div>

            {/* 过滤条件 */}
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-medium text-slate-800 border-b border-slate-200 pb-2">
                  发送对象筛选
                </h4>
                {selectedRegistrations.length > 0 ? (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">
                      ✅ 已选择 {selectedRegistrations.length} 个具体记录，将发送给这些记录：
                    </p>
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      <div className="text-xs text-green-700 space-y-1">
                        {selectedRegistrations.map(item => (
                          <div key={item.id} className="flex items-center space-x-2">
                            <span>• {item.name}</span>
                            <span className="text-green-600">({item.registrationId})</span>
                            <span className="text-green-500">{item.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 mt-2">
                    可选择状态或类型进行筛选，不选择任何条件将发送给所有有联系方式的报名记录
                  </p>
                )}
              </div>
              
              {/* 只在没有预选记录时显示筛选选项 */}
              {selectedRegistrations.length === 0 && (
                <>
                  {/* 状态过滤 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      按状态筛选 ({formData.statusFilter.length} 项已选)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3">
                      {statusOptions?.data?.data?.map(status => (
                        <label key={status} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={formData.statusFilter.includes(status)}
                            onChange={() => handleMultiSelectChange('statusFilter', status)}
                            className="rounded border-slate-300"
                          />
                          <span className="text-slate-700">{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 类型过滤 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      按类型筛选 ({formData.typeFilter.length} 项已选)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3">
                      {typeOptions?.data?.data?.map(type => (
                        <label key={type} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={formData.typeFilter.includes(type)}
                            onChange={() => handleMultiSelectChange('typeFilter', type)}
                            className="rounded border-slate-300"
                          />
                          <span className="text-slate-700">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 预览统计 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Users size={20} className="text-blue-600" />
                  <span className="text-blue-800 font-medium">
                    {isLoadingRegistrations ? (
                      <>
                        <Loader2 size={16} className="inline animate-spin mr-2" />
                        正在获取报名数据...
                      </>
                    ) : (
                      <>预计发送给 <span className="text-xl font-bold">{previewCount}</span> 个报名记录</>
                    )}
                  </span>
                </div>
                
                {registrationsError && (
                  <div className="mt-2 flex items-center space-x-2 text-red-600">
                    <AlertCircle size={16} />
                    <span className="text-sm">获取报名数据失败: {registrationsError.message}</span>
                  </div>
                )}
                
                {!isLoadingRegistrations && !registrationsError && previewCount === 0 && (
                  <div className="mt-2 flex items-center space-x-2 text-orange-600">
                    <AlertCircle size={16} />
                    <span className="text-sm">
                      {formData.statusFilter.length > 0 || formData.typeFilter.length > 0 
                        ? '当前筛选条件下没有符合条件的记录' 
                        : '没有可发送邮件的记录（可能都缺少联系方式）'
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 密送邮箱 */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-slate-800 border-b border-slate-200 pb-2">
                发送设置
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  密送邮箱 (BCC) <span className="text-slate-500">可选</span>
                </label>
                <input
                  type="email"
                  value={formData.bccEmail}
                  onChange={(e) => handleInputChange('bccEmail', e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-slate-500 mt-1">
                  可选择一个邮箱地址作为密送收件人，该地址将收到所有发送的邮件副本
                </p>
              </div>
            </div>

            {/* 邮件内容 */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-slate-800 border-b border-slate-200 pb-2">
                邮件内容
              </h4>

              {formData.emailType === 'resend' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 font-medium mb-2">📧 补发邮件说明</p>
                  <p className="text-blue-700 text-sm">
                    将重新发送报名确认邮件，包含节目编号、节目信息和平台查询链接。
                    使用全新的UI设计，提供更好的阅读体验。
                  </p>
                </div>
              )}

              {formData.emailType === 'status_update' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    新状态 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.content.newStatus}
                    onChange={(e) => handleInputChange('content.newStatus', e.target.value)}
                    className="input-neon w-full"
                  >
                    <option value="">请选择新状态</option>
                    {statusOptions?.data?.data?.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              )}

              {(formData.emailType === 'custom' || formData.emailType === 'reminder') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      邮件主题
                    </label>
                    <input
                      type="text"
                      value={formData.content.subject}
                      onChange={(e) => handleInputChange('content.subject', e.target.value)}
                      className="input-neon w-full"
                      placeholder="如不填写将使用默认主题"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      通知标题 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.content.title}
                      onChange={(e) => handleInputChange('content.title', e.target.value)}
                      className="input-neon w-full"
                      placeholder="请输入通知标题"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      通知内容 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.content.message}
                      onChange={(e) => handleInputChange('content.message', e.target.value)}
                      className="input-neon w-full"
                      placeholder="请输入通知内容"
                      rows={5}
                    />
                  </div>

                  {formData.emailType === 'reminder' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            截止时间
                          </label>
                          <input
                            type="datetime-local"
                            value={formData.content.deadline}
                            onChange={(e) => handleInputChange('content.deadline', e.target.value)}
                            className="input-neon w-full"
                          />
                        </div>
                        <div className="flex items-center space-x-4 pt-6">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.content.urgent}
                              onChange={(e) => handleInputChange('content.urgent', e.target.checked)}
                              className="rounded border-slate-300"
                            />
                            <span className="text-sm text-slate-700">紧急提醒</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.content.actionRequired}
                              onChange={(e) => handleInputChange('content.actionRequired', e.target.checked)}
                              className="rounded border-slate-300"
                            />
                            <span className="text-sm text-slate-700">需要操作</span>
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  管理员备注
                </label>
                <textarea
                  value={formData.content.adminNote}
                  onChange={(e) => handleInputChange('content.adminNote', e.target.value)}
                  className="input-neon w-full"
                  placeholder="可选的管理员备注信息"
                  rows={2}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={sendBulkEmailMutation.isLoading}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center space-x-2"
                disabled={sendBulkEmailMutation.isLoading || previewCount === 0}
              >
                {sendBulkEmailMutation.isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                <span>
                  {sendBulkEmailMutation.isLoading 
                    ? '发送中...' 
                    : `发送邮件 (${previewCount})`
                  }
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default BulkEmailModal
