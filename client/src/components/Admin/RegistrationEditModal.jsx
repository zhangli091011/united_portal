import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { registrationAPI } from '../../services/api'
import { X, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const RegistrationEditModal = ({ registration, isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    programName: '',
    type: '',
    performers: '',
    copyright: '',
    description: '',
    onCamera: '',
    status: '',
    remarks: ''
  })
  
  const [errors, setErrors] = useState({})
  const queryClient = useQueryClient()

  // 获取状态选项
  const { data: statusOptions } = useQuery({
    queryKey: ['status-options'],
    queryFn: () => registrationAPI.getStatusOptions?.() || Promise.resolve({ data: { data: [
      '未按规范填写表格',
      '作品所有者自愿取消',
      '已联系',
      '有待斟酌',
      '一审通过',
      '二审通过',
      '终审通过',
      '初审驳回',
      '团队独立立项',
      '拒绝联系',
      '无法联系'
    ]}}),
    enabled: isOpen
  })

  // 获取类型选项
  const { data: typeOptions } = useQuery({
    queryKey: ['type-options'],
    queryFn: () => registrationAPI.getTypeOptions?.() || Promise.resolve({ data: { data: [
      '公益短片（非合作方请不要选择此项）',
      '小品',
      '相声',
      '乐器',
      '戏曲',
      '说唱',
      '舞蹈',
      '歌曲',
      '魔术',
      '杂技',
      '《难忘今宵》合唱',
      '混剪',
      '其他',
      '公益短片'
    ]}}),
    enabled: isOpen
  })

  // 初始化表单数据
  useEffect(() => {
    if (registration && isOpen) {
      setFormData({
        name: registration.name || '',
        contact: registration.contact || '',
        programName: registration.programName || '',
        type: registration.type || '',
        performers: registration.performers || '',
        copyright: registration.copyright || '',
        description: registration.description || '',
        onCamera: registration.onCamera || '',
        status: registration.status || '',
        remarks: registration.remarks || ''
      })
      setErrors({})
    }
  }, [registration, isOpen])

  // 更新报名信息
  const updateMutation = useMutation({
    mutationFn: (data) => registrationAPI.update(registration.id, data),
    onSuccess: (response) => {
      toast.success('更新成功')
      queryClient.invalidateQueries(['registrations'])
      queryClient.invalidateQueries(['dashboard'])
      onSuccess?.(response.data)
      onClose()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '更新失败')
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
    }
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = '参演单位不能为空'
    }
    
    if (!formData.contact.trim()) {
      newErrors.contact = '联系方式不能为空'
    } else if (!/^\d{5,12}$/.test(formData.contact)) {
      newErrors.contact = '联系方式格式不正确（5-12位数字）'
    }
    
    if (!formData.programName.trim()) {
      newErrors.programName = '作品名称不能为空'
    }
    
    if (!formData.type) {
      newErrors.type = '作品类型不能为空'
    }
    
    if (!formData.performers.trim()) {
      newErrors.performers = '演职人员不能为空'
    }
    
    if (!formData.copyright.trim()) {
      newErrors.copyright = '版权确认不能为空'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('请检查表单中的错误')
      return
    }
    
    updateMutation.mutate(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card-neon max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800">编辑报名信息</h3>
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-600 p-1"
              disabled={updateMutation.isLoading}
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-slate-800 border-b border-slate-200 pb-2">
                基本信息
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    参演单位 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`input-neon w-full ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="请输入参演单位名称"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    联系方式(QQ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => handleInputChange('contact', e.target.value)}
                    className={`input-neon w-full ${errors.contact ? 'border-red-500' : ''}`}
                    placeholder="请输入QQ号码"
                  />
                  {errors.contact && (
                    <p className="text-red-500 text-sm mt-1">{errors.contact}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 节目信息 */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-slate-800 border-b border-slate-200 pb-2">
                节目信息
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    作品名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.programName}
                    onChange={(e) => handleInputChange('programName', e.target.value)}
                    className={`input-neon w-full ${errors.programName ? 'border-red-500' : ''}`}
                    placeholder="请输入作品名称"
                  />
                  {errors.programName && (
                    <p className="text-red-500 text-sm mt-1">{errors.programName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    作品类型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className={`input-neon w-full ${errors.type ? 'border-red-500' : ''}`}
                  >
                    <option value="">请选择作品类型</option>
                    {typeOptions?.data?.data?.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.type && (
                    <p className="text-red-500 text-sm mt-1">{errors.type}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  演职人员 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.performers}
                  onChange={(e) => handleInputChange('performers', e.target.value)}
                  className={`input-neon w-full ${errors.performers ? 'border-red-500' : ''}`}
                  placeholder="请输入演职人员信息"
                  rows={3}
                />
                {errors.performers && (
                  <p className="text-red-500 text-sm mt-1">{errors.performers}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  版权确认 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.copyright}
                  onChange={(e) => handleInputChange('copyright', e.target.value)}
                  className={`input-neon w-full ${errors.copyright ? 'border-red-500' : ''}`}
                  placeholder="请确认版权信息"
                  rows={2}
                />
                {errors.copyright && (
                  <p className="text-red-500 text-sm mt-1">{errors.copyright}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  是否出镜
                </label>
                <select
                  value={formData.onCamera}
                  onChange={(e) => handleInputChange('onCamera', e.target.value)}
                  className="input-neon w-full"
                >
                  <option value="">请选择</option>
                  <option value="是">是</option>
                  <option value="否">否</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  作品介绍
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="input-neon w-full"
                  placeholder="请输入作品介绍（可选）"
                  rows={4}
                />
              </div>
            </div>

            {/* 管理信息 */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-slate-800 border-b border-slate-200 pb-2">
                管理信息
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  状态
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="input-neon w-full"
                >
                  <option value="">请选择状态</option>
                  {statusOptions?.data?.data?.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  备注
                </label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  className="input-neon w-full"
                  placeholder="管理员备注信息"
                  rows={3}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={updateMutation.isLoading}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center space-x-2"
                disabled={updateMutation.isLoading}
              >
                {updateMutation.isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                <span>{updateMutation.isLoading ? '保存中...' : '保存更改'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RegistrationEditModal
