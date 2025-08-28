import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { registrationAPI } from '../../services/api'
import { 
  Search, 
  Filter, 
  Edit3, 
  Trash2,
  Eye,
  Calendar,
  User,
  Mail,
  CheckSquare,
  Square,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import LoadingSpinner from '../UI/LoadingSpinner'
import Pagination from '../UI/Pagination'
import ApprovalActions from './ApprovalActions'
import StatusSelector from './StatusSelector'
import RegistrationEditModal from './RegistrationEditModal'
import BulkEmailModal from './BulkEmailModal'
import toast from 'react-hot-toast'

const RegistrationTable = ({ 
  data, 
  loading, 
  onRefresh, 
  pagination,
  onPageChange,
  onPageSizeChange,
  onSearch,
  onSort
}) => {
  // 调试信息
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedRegistration, setSelectedRegistration] = useState(null)
  const [editingRegistration, setEditingRegistration] = useState(null)
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [showBulkEmail, setShowBulkEmail] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [sortBy, setSortBy] = useState('registrationId')
  const [sortOrder, setSortOrder] = useState('desc')
  const queryClient = useQueryClient()

  // 删除操作
  const deleteMutation = useMutation({
    mutationFn: registrationAPI.delete,
    onSuccess: () => {
      toast.success('删除成功')
      queryClient.invalidateQueries('registrations')
      queryClient.invalidateQueries('dashboard')
      onRefresh()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '删除失败')
    }
  })

  // 过滤数据
  const filteredData = data?.items?.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.programName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.registrationId?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === '' || item.status === statusFilter
    const matchesType = typeFilter === '' || item.type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  }) || []

  const handleDelete = (registration) => {
    if (window.confirm(`确定要删除 ${registration.name} 的报名记录吗？`)) {
      deleteMutation.mutate(registration.id)
    }
  }

  const handleEdit = (registration) => {
    setEditingRegistration(registration)
  }

  const handleEditSuccess = () => {
    setEditingRegistration(null)
    onRefresh()
  }

  // 批量选择相关函数
  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = new Set(filteredData.map(item => item.id))
      setSelectedItems(allIds)
    } else {
      setSelectedItems(new Set())
    }
  }

  const handleSelectItem = (id, checked) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedItems(newSelected)
  }

  const handleBulkEmail = () => {
    if (selectedItems.size === 0) {
      toast.error('请先选择要发送邮件的记录')
      return
    }
    setShowBulkEmail(true)
  }

  const handleBulkEmailSuccess = () => {
    setSelectedItems(new Set())
    setBulkMode(false)
    setShowBulkEmail(false)
    onRefresh()
  }

  // 获取当前过滤的状态和类型
  const getFilteredStatuses = () => {
    const statuses = new Set()
    filteredData.forEach(item => {
      if (item.status) statuses.add(item.status)
    })
    return Array.from(statuses)
  }

  const getFilteredTypes = () => {
    const types = new Set()
    filteredData.forEach(item => {
      if (item.type) types.add(item.type)
    })
    return Array.from(types)
  }

  const getStatusColor = (status) => {
    if (status?.includes('通过')) return 'text-green-400 bg-green-400/10'
    if (status?.includes('驳回')) return 'text-red-400 bg-red-400/10'
    return 'text-yellow-400 bg-yellow-400/10'
  }

  // 处理排序
  const handleSort = (field) => {
    if (sortBy === field) {
      // 切换排序方向
      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc'
      setSortOrder(newOrder)
      onSort(field, newOrder)
    } else {
      // 新字段，默认降序
      setSortBy(field)
      setSortOrder('desc')
      onSort(field, 'desc')
    }
  }

  // 渲染排序图标
  const renderSortIcon = (field) => {
    if (sortBy !== field) {
      return <ArrowUpDown size={14} className="opacity-50" />
    }
    return sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
  }

  if (loading) {
    return (
      <div className="card-neon p-8 text-center">
        <LoadingSpinner size="large" />
        <p className="text-slate-600 mt-4">加载中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 搜索和过滤 */}
      <div className="card-neon p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜索报名信息..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-neon w-full pl-10"
            />
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-700" size={18} />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-neon"
          >
            <option value="">所有状态</option>
            <option value="待审核">待审核</option>
            <option value="一审通过">一审通过</option>
            <option value="二审通过">二审通过</option>
            <option value="终审通过">终审通过</option>
            <option value="初审驳回">初审驳回</option>
            <option value="二审驳回">二审驳回</option>
            <option value="终审驳回">终审驳回</option>
            <option value="已联系">已联系</option>
            <option value="有待斟酌">有待斟酌</option>
            <option value="未按规范填写表格">未按规范填写表格</option>
            <option value="作品所有者自愿取消">作品所有者自愿取消</option>
            <option value="团队独立立项">团队独立立项</option>
            <option value="拒绝联系">拒绝联系</option>
            <option value="无法联系">无法联系</option>
          </select>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-neon"
          >
            <option value="">所有类型</option>
            <option value="歌曲">歌曲</option>
            <option value="舞蹈">舞蹈</option>
            <option value="小品">小品</option>
            <option value="相声">相声</option>
            <option value="乐器">乐器</option>
            <option value="其他">其他</option>
          </select>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4">
            <p className="text-slate-600 text-sm">
              共 {filteredData.length} 条记录
              {searchTerm && ` (搜索 "${searchTerm}")`}
              {selectedItems.size > 0 && ` · 已选择 ${selectedItems.size} 项`}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {selectedItems.size > 0 && (
              <>
                <button
                  onClick={handleBulkEmail}
                  className="btn-primary text-sm flex items-center space-x-1"
                >
                  <Mail size={14} />
                  <span>批量发邮件</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedItems(new Set())
                    setBulkMode(false)
                  }}
                  className="btn-secondary text-sm"
                >
                  取消选择
                </button>
              </>
            )}
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`text-sm ${bulkMode ? 'btn-primary' : 'btn-secondary'}`}
            >
              {bulkMode ? '退出批量' : '批量操作'}
            </button>
            <button onClick={onRefresh} className="btn-secondary text-sm">
              刷新数据
            </button>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="card-neon overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                {bulkMode && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filteredData.length > 0 && selectedItems.size === filteredData.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <span className="ml-2">全选</span>
                    </label>
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('registrationId')}
                    className="flex items-center space-x-1 hover:text-slate-800 transition-colors"
                  >
                    <span>编号</span>
                    {renderSortIcon('registrationId')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center space-x-1 hover:text-slate-800 transition-colors"
                  >
                    <span>报名信息</span>
                    {renderSortIcon('name')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('programName')}
                    className="flex items-center space-x-1 hover:text-slate-800 transition-colors"
                  >
                    <span>节目信息</span>
                    {renderSortIcon('programName')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center space-x-1 hover:text-slate-800 transition-colors"
                  >
                    <span>状态</span>
                    {renderSortIcon('status')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('createdTime')}
                    className="flex items-center space-x-1 hover:text-slate-800 transition-colors"
                  >
                    <span>报名时间</span>
                    {renderSortIcon('createdTime')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredData.map((registration) => (
                <tr key={registration.id} className={`hover:bg-slate-50 transition-colors border-b border-slate-200 ${selectedItems.has(registration.id) ? 'bg-blue-50' : ''}`}>
                  {bulkMode && (
                    <td className="px-6 py-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(registration.id)}
                          onChange={(e) => handleSelectItem(registration.id, e.target.checked)}
                          className="rounded border-slate-300"
                        />
                      </label>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="text-center">
                      <span className="text-slate-800 font-mono text-sm bg-slate-100 px-2 py-1 rounded">
                        {registration.registrationId}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <User size={16} className="text-slate-600" />
                        <span className="text-slate-800 font-medium">{registration.name}</span>
                      </div>
                      <p className="text-slate-600 text-sm">QQ: {registration.contact}</p>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-slate-800 font-medium">{registration.programName}</p>
                      <span className="inline-block bg-primary-orange/20 text-primary-orange px-2 py-1 rounded text-xs">
                        {registration.type}
                      </span>
                      <p className="text-slate-600 text-sm">{registration.performers}</p>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <StatusSelector 
                      record={registration} 
                      onSuccess={() => {
                        onRefresh?.()
                      }}
                    />
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-slate-600 text-sm">
                      <Calendar size={14} />
                      <span>{new Date(registration.createdTime).toLocaleString('zh-CN')}</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedRegistration(registration)}
                        className="p-2 text-slate-600 hover:text-primary-orange transition-colors"
                        title="查看详情和审批"
                      >
                        <Eye size={16} />
                      </button>
                      
                      <button
                        onClick={() => handleEdit(registration)}
                        className="p-2 text-slate-600 hover:text-blue-400 transition-colors"
                        title="编辑报名信息"
                      >
                        <Edit3 size={16} />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(registration)}
                        className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                        title="删除记录"
                        disabled={deleteMutation.isLoading}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredData.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-600">暂无报名记录</p>
            </div>
          )}
        </div>
      </div>

      {/* 分页组件 */}
      {pagination && (
        <div className="mt-6">
          <Pagination
            currentPage={pagination.page}
            totalPages={Math.ceil(pagination.total / pagination.pageSize)}
            hasMore={pagination.hasMore}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            loading={loading}
            showSizeChanger={true}
            showQuickJumper={true}
            showTotal={true}
          />
        </div>
      )}

      {/* 详情模态框 */}
      {selectedRegistration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card-neon max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">报名详情</h3>
                <button
                  onClick={() => setSelectedRegistration(null)}
                  className="text-slate-600 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">报名编号</label>
                    <p className="text-slate-800 font-mono">{selectedRegistration.registrationId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">状态</label>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedRegistration.status)}`}>
                      {selectedRegistration.status || '待审核'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">参演单位</label>
                    <p className="text-slate-800">{selectedRegistration.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">联系方式</label>
                    <p className="text-slate-800">{selectedRegistration.contact}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">作品类型</label>
                    <p className="text-slate-800">{selectedRegistration.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">是否出镜</label>
                    <p className="text-slate-800">{selectedRegistration.onCamera || '未填写'}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">作品名称</label>
                  <p className="text-slate-800">{selectedRegistration.programName}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">演职人员</label>
                  <p className="text-slate-800">{selectedRegistration.performers}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">版权确认</label>
                  <p className="text-slate-800">{selectedRegistration.copyright}</p>
                </div>
                
                {selectedRegistration.description && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">作品介绍</label>
                    <p className="text-slate-800">{selectedRegistration.description}</p>
                  </div>
                )}
                
                {selectedRegistration.remarks && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">备注</label>
                    <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                      <p className="text-slate-800 whitespace-pre-wrap">{selectedRegistration.remarks}</p>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">创建时间</label>
                    <p className="text-slate-800">{new Date(selectedRegistration.createdTime).toLocaleString('zh-CN')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">更新时间</label>
                    <p className="text-slate-800">{new Date(selectedRegistration.updatedAt).toLocaleString('zh-CN')}</p>
                  </div>
                </div>
              </div>
              
              {/* 状态管理组件 */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-600 mb-3">状态管理</label>
                  <StatusSelector 
                    record={selectedRegistration} 
                    onSuccess={() => {
                      onRefresh?.()
                      // 刷新选中记录的状态
                      setSelectedRegistration(prev => ({ ...prev, status: 'updating...' }))
                      // 重新获取记录详情
                      setTimeout(() => {
                        const updatedRecord = data?.items?.find(item => item.id === selectedRegistration.id)
                        if (updatedRecord) {
                          setSelectedRegistration(updatedRecord)
                        }
                      }, 1000)
                    }}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-slate-200">
                <button
                  onClick={() => setSelectedRegistration(null)}
                  className="btn-secondary"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑模态框 */}
      <RegistrationEditModal
        registration={editingRegistration}
        isOpen={!!editingRegistration}
        onClose={() => setEditingRegistration(null)}
        onSuccess={handleEditSuccess}
      />

      {/* 批量邮件模态框 */}
      <BulkEmailModal
        isOpen={showBulkEmail}
        onClose={() => setShowBulkEmail(false)}
        onSuccess={handleBulkEmailSuccess}
        preSelectedStatuses={statusFilter ? [statusFilter] : []}
        preSelectedTypes={typeFilter ? [typeFilter] : []}
        selectedRegistrationIds={Array.from(selectedItems)}
        selectedRegistrations={filteredData.filter(item => selectedItems.has(item.id))}
      />
    </div>
  )
}

export default RegistrationTable
