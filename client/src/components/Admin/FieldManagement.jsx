import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fieldAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { 
  Database, 
  Plus, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  Settings,
  Check,
  X,
  AlertCircle,
  Info
} from 'lucide-react'
import LoadingSpinner from '../UI/LoadingSpinner'
import toast from 'react-hot-toast'

const FieldManagement = () => {
  const [editingField, setEditingField] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedField, setSelectedField] = useState(null)
  const queryClient = useQueryClient()
  const { user, hasPermission, isSuperAdmin } = useAuth()

  // 获取字段列表
  const { data: fieldsData, isLoading: fieldsLoading, refetch: refetchFields, error: fieldsError } = useQuery({
    queryKey: ['fields'],
    queryFn: fieldAPI.getAll,
    retry: 3,
    onError: (error) => {
      console.error('获取字段列表失败:', error)
      console.error('错误详情:', error.response?.data)
      toast.error(`获取字段列表失败: ${error.response?.data?.message || error.message}`)
    },
    onSuccess: (data) => {
      console.log('✅ 字段列表获取成功:', data)
    }
  })

  // 获取字段类型配置
  const { data: typesData } = useQuery({
    queryKey: ['field-types'],
    queryFn: fieldAPI.getTypes,
    onError: (error) => {
      console.error('获取字段类型失败:', error)
    }
  })

  // 同步字段
  const syncMutation = useMutation({
    mutationFn: fieldAPI.sync,
    onSuccess: (response) => {
      toast.success(`同步成功！共同步 ${response.data.totalFields} 个字段`)
      refetchFields()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '同步失败')
    }
  })

  // 删除字段
  const deleteMutation = useMutation({
    mutationFn: fieldAPI.delete,
    onSuccess: (response) => {
      toast.success(`字段 "${response.data.fieldName}" 删除成功`)
      queryClient.invalidateQueries('fields')
      refetchFields()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '删除失败')
    }
  })

  const fields = fieldsData?.data?.fields || []
  const types = typesData?.data || []

  // 调试信息
  console.log('🔍 FieldManagement 调试信息:', {
    user,
    isSuperAdmin: isSuperAdmin(),
    hasFieldViewPermission: hasPermission('field.view'),
    hasFieldManagePermission: hasPermission('field.manage'),
    fieldsData,
    fields,
    fieldsCount: fields.length,
    typesData,
    types,
    fieldsLoading,
    fieldsError
  })

  // 权限检查
  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <AlertCircle className="text-yellow-500 mr-2" size={24} />
          <h3 className="text-lg font-semibold text-yellow-800">未登录</h3>
        </div>
        <p className="text-yellow-700">请先登录以访问字段管理功能</p>
      </div>
    )
  }

  if (!isSuperAdmin()) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <AlertCircle className="text-red-500 mr-2" size={24} />
          <h3 className="text-lg font-semibold text-red-800">权限不足</h3>
        </div>
        <p className="text-red-700">只有超级管理员可以访问字段管理功能</p>
      </div>
    )
  }

  const handleSync = () => {
    syncMutation.mutate()
  }

  const handleDelete = (field) => {
    if (field.isPrimary) {
      toast.error('不能删除主键字段')
      return
    }
    
    if (window.confirm(`确定要删除字段 "${field.name}" 吗？\n\n⚠️ 此操作不可恢复，且会删除该字段的所有数据！`)) {
      deleteMutation.mutate(field.id)
    }
  }

  const getFieldTypeInfo = (type) => {
    return types.find(t => t.type === type) || { name: type, editable: true, hasOptions: false }
  }

  const getFieldIcon = (type) => {
    const iconMap = {
      text: '📝',
      number: '🔢',
      select: '📋',
      multiSelect: '☑️',
      date: '📅',
      checkbox: '✅',
      user: '👤',
      phone: '📞',
      url: '🔗',
      email: '📧',
      currency: '💰',
      rating: '⭐',
      progress: '📊',
      createdTime: '🕐',
      modifiedTime: '🕐',
      createdUser: '👤',
      modifiedUser: '👤',
      autoNumber: '🔢'
    }
    return iconMap[type] || '📄'
  }

  if (fieldsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
        <span className="ml-3 text-slate-600">加载字段信息...</span>
      </div>
    )
  }

  if (fieldsError) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="text-red-500 mr-2" size={24} />
            <h3 className="text-lg font-semibold text-red-800">字段加载失败</h3>
          </div>
          <p className="text-red-700 mb-4">
            {fieldsError.response?.data?.message || fieldsError.message || '未知错误'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => refetchFields()}
              className="btn-primary text-sm"
            >
              重试
            </button>
            <button
              onClick={handleSync}
              disabled={syncMutation.isLoading}
              className="btn-secondary text-sm"
            >
              {syncMutation.isLoading ? '同步中...' : '尝试同步'}
            </button>
          </div>
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
            <Database className="mr-2" size={24} />
            字段管理
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            管理飞书表格的字段结构，支持字段的创建、修改和删除
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncMutation.isLoading}
            className="btn-secondary flex items-center text-sm"
          >
            <RefreshCw 
              size={16} 
              className={`mr-1 ${syncMutation.isLoading ? 'animate-spin' : ''}`} 
            />
            {syncMutation.isLoading ? '同步中...' : '同步字段'}
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center text-sm"
          >
            <Plus size={16} className="mr-1" />
            创建字段
          </button>
        </div>
      </div>

      {/* 字段统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-neon p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">总字段数</p>
              <p className="text-2xl font-bold text-slate-800">{fields.length}</p>
            </div>
            <Database className="text-blue-500" size={32} />
          </div>
        </div>
        
        <div className="card-neon p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">可编辑字段</p>
              <p className="text-2xl font-bold text-slate-800">
                {fields.filter(f => getFieldTypeInfo(f.type).editable).length}
              </p>
            </div>
            <Edit3 className="text-green-500" size={32} />
          </div>
        </div>
        
        <div className="card-neon p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">系统字段</p>
              <p className="text-2xl font-bold text-slate-800">
                {fields.filter(f => !getFieldTypeInfo(f.type).editable).length}
              </p>
            </div>
            <Settings className="text-orange-500" size={32} />
          </div>
        </div>
      </div>

      {/* 字段列表 */}
      <div className="card-neon overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">字段列表</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  字段名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  描述
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
              {fields.map((field) => {
                const typeInfo = getFieldTypeInfo(field.type)
                return (
                  <tr key={field.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getFieldIcon(field.type)}</span>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{field.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{field.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {typeInfo.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">
                        {field.description || '无描述'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {field.isPrimary && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            主键
                          </span>
                        )}
                        {typeInfo.editable ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            可编辑
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            系统字段
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedField(field)}
                          className="p-2 text-slate-600 hover:text-blue-600 transition-colors"
                          title="查看详情"
                        >
                          <Info size={16} />
                        </button>
                        
                        {typeInfo.editable && (
                          <button
                            onClick={() => setEditingField(field)}
                            className="p-2 text-slate-600 hover:text-green-600 transition-colors"
                            title="编辑字段"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}
                        
                        {!field.isPrimary && typeInfo.editable && (
                          <button
                            onClick={() => handleDelete(field)}
                            disabled={deleteMutation.isLoading}
                            className="p-2 text-slate-600 hover:text-red-600 transition-colors"
                            title="删除字段"
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
          
          {fields.length === 0 && (
            <div className="text-center py-12">
              <Database className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">暂无字段</h3>
              <p className="mt-1 text-sm text-slate-500">点击"同步字段"从飞书获取字段信息</p>
            </div>
          )}
        </div>
      </div>

      {/* 字段详情模态框 */}
      {selectedField && (
        <FieldDetailModal
          field={selectedField}
          onClose={() => setSelectedField(null)}
          typeInfo={getFieldTypeInfo(selectedField.type)}
        />
      )}

      {/* 编辑字段模态框 */}
      {editingField && (
        <FieldEditModal
          field={editingField}
          onClose={() => setEditingField(null)}
          onSuccess={() => {
            setEditingField(null)
            refetchFields()
          }}
          types={types}
        />
      )}

      {/* 创建字段模态框 */}
      {showCreateModal && (
        <FieldCreateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            refetchFields()
          }}
          types={types}
        />
      )}
    </div>
  )
}

// 字段详情模态框组件
const FieldDetailModal = ({ field, onClose, typeInfo }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">字段详情</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">字段名称</label>
                <p className="text-sm text-slate-900 bg-slate-50 px-3 py-2 rounded-lg">{field.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">字段类型</label>
                <p className="text-sm text-slate-900 bg-slate-50 px-3 py-2 rounded-lg">{typeInfo.name}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">字段ID</label>
              <p className="text-sm text-slate-900 bg-slate-50 px-3 py-2 rounded-lg font-mono">{field.id}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">描述</label>
              <p className="text-sm text-slate-900 bg-slate-50 px-3 py-2 rounded-lg min-h-[3rem]">
                {field.description || '暂无描述'}
              </p>
            </div>
            
            {field.property && Object.keys(field.property).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">字段属性</label>
                <pre className="text-sm text-slate-900 bg-slate-50 px-3 py-2 rounded-lg overflow-x-auto">
                  {JSON.stringify(field.property, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">创建时间</label>
                <p className="text-sm text-slate-900 bg-slate-50 px-3 py-2 rounded-lg">
                  {field.createTime ? new Date(field.createTime).toLocaleString('zh-CN') : '未知'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">更新时间</label>
                <p className="text-sm text-slate-900 bg-slate-50 px-3 py-2 rounded-lg">
                  {field.updateTime ? new Date(field.updateTime).toLocaleString('zh-CN') : '未知'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 字段编辑模态框组件
const FieldEditModal = ({ field, onClose, onSuccess, types }) => {
  const [formData, setFormData] = useState({
    field_name: field.name,
    description: field.description || ''
  })
  
  const mutation = useMutation({
    mutationFn: (data) => fieldAPI.update(field.id, data),
    onSuccess: () => {
      toast.success('字段更新成功')
      onSuccess()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '字段更新失败')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">编辑字段</h3>
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
                字段名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.field_name}
                onChange={(e) => setFormData({...formData, field_name: e.target.value})}
                className="input-neon w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="input-neon w-full"
                rows={3}
                placeholder="字段描述..."
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
                {mutation.isLoading ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// 字段创建模态框组件
const FieldCreateModal = ({ onClose, onSuccess, types }) => {
  const [formData, setFormData] = useState({
    field_name: '',
    type: 'text',
    description: '',
    property: {}
  })
  
  const mutation = useMutation({
    mutationFn: fieldAPI.create,
    onSuccess: () => {
      toast.success('字段创建成功')
      onSuccess()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '字段创建失败')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  const selectedTypeInfo = types.find(t => t.type === formData.type) || {}

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">创建字段</h3>
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
                字段名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.field_name}
                onChange={(e) => setFormData({...formData, field_name: e.target.value})}
                className="input-neon w-full"
                placeholder="请输入字段名称"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                字段类型 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="input-neon w-full"
                required
              >
                {types.filter(t => t.editable).map(type => (
                  <option key={type.type} value={type.type}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="input-neon w-full"
                rows={3}
                placeholder="字段描述..."
              />
            </div>
            
            {selectedTypeInfo.hasOptions && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start">
                  <AlertCircle className="text-yellow-600 mt-0.5 mr-2" size={16} />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">注意</p>
                    <p>选择类型字段需要在创建后配置选项列表</p>
                  </div>
                </div>
              </div>
            )}
            
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
                {mutation.isLoading ? '创建中...' : '创建'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default FieldManagement
