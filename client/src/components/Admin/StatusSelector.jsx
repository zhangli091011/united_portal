import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { registrationAPI } from '../../services/api'
import { 
  ChevronDown, 
  Check, 
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Phone,
  User,
  FileX,
  Users
} from 'lucide-react'
import toast from 'react-hot-toast'

const StatusSelector = ({ record, onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [note, setNote] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const queryClient = useQueryClient()

  // 状态选项配置
  const statusOptions = [
    {
      id: "opt6kFdokd",
      name: "一审通过",
      color: "emerald",
      icon: CheckCircle,
      description: "作品通过初步审核"
    },
    {
      id: "optCHpqrtS", 
      name: "二审通过",
      color: "green",
      icon: CheckCircle,
      description: "作品通过二次审核"
    },
    {
      id: "optL4jW7r1",
      name: "终审通过", 
      color: "blue",
      icon: CheckCircle,
      description: "作品最终通过审核"
    },
    {
      id: "optYenHQy1",
      name: "初审驳回",
      color: "red", 
      icon: XCircle,
      description: "作品未通过初审"
    },
    {
      id: "opt84aPHi5",
      name: "已联系",
      color: "blue",
      icon: Phone,
      description: "已与作者取得联系"
    },
    {
      id: "optrtEJivD",
      name: "有待斟酌",
      color: "amber",
      icon: AlertTriangle,
      description: "作品需要进一步评估"
    },
    {
      id: "optF35c6ko",
      name: "未按规范填写表格",
      color: "orange",
      icon: FileX,
      description: "表格填写不符合要求"
    },
    {
      id: "optA3Qpmdx",
      name: "作品所有者自愿取消",
      color: "gray",
      icon: User,
      description: "作者主动取消报名"
    },
    {
      id: "optxhLsGBD",
      name: "团队独立立项",
      color: "purple",
      icon: Users,
      description: "转为团队独立项目"
    },
    {
      id: "optUGPLww7",
      name: "拒绝联系",
      color: "red",
      icon: XCircle,
      description: "作者拒绝进一步联系"
    },
    {
      id: "opty82UIV1",
      name: "无法联系",
      color: "gray",
      icon: Phone,
      description: "无法与作者取得联系"
    }
  ]

  // 获取当前状态的显示信息
  const getCurrentStatus = () => {
    const option = statusOptions.find(opt => opt.name === record.status)
    return option || {
      name: record.status || '待审核',
      color: 'slate',
      icon: MessageSquare,
      description: '等待审核'
    }
  }

  const currentStatus = getCurrentStatus()

  // 更新状态
  const updateStatusMutation = useMutation({
    mutationFn: ({ statusName, note }) => {
      return registrationAPI.updateStatus(record.id, { 
        status: statusName, 
        note: note || `状态更新为: ${statusName}` 
      })
    },
    onSuccess: () => {
      toast.success('状态更新成功')
      queryClient.invalidateQueries('registrations')
      queryClient.invalidateQueries('dashboard')
      setIsOpen(false)
      setShowNoteInput(false)
      setNote('')
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '状态更新失败')
    }
  })

  const handleStatusChange = (option) => {
    setSelectedStatus(option.name)
    
    // 某些状态需要备注
    const needsNote = ['初审驳回', '未按规范填写表格', '拒绝联系', '无法联系', '有待斟酌']
    if (needsNote.includes(option.name)) {
      setShowNoteInput(true)
    } else {
      // 直接更新状态
      updateStatusMutation.mutate({ statusName: option.name })
    }
  }

  const handleNoteSubmit = () => {
    if (selectedStatus && note.trim()) {
      updateStatusMutation.mutate({ statusName: selectedStatus, note: note.trim() })
    } else {
      toast.error('请填写备注信息')
    }
  }

  const getStatusColor = (color) => {
    const colorMap = {
      emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      green: 'text-green-600 bg-green-50 border-green-200',
      blue: 'text-blue-600 bg-blue-50 border-blue-200',
      red: 'text-red-600 bg-red-50 border-red-200',
      amber: 'text-amber-600 bg-amber-50 border-amber-200',
      orange: 'text-orange-600 bg-orange-50 border-orange-200',
      gray: 'text-gray-600 bg-gray-50 border-gray-200',
      purple: 'text-purple-600 bg-purple-50 border-purple-200',
      slate: 'text-slate-600 bg-slate-50 border-slate-200'
    }
    return colorMap[color] || colorMap.slate
  }

  return (
    <div className="relative">
      {/* 当前状态显示 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all ${getStatusColor(currentStatus.color)} hover:shadow-md`}
      >
        <currentStatus.icon size={16} />
        <span className="text-sm font-medium">{currentStatus.name}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉选项 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-slate-500 font-medium px-3 py-2 border-b border-gray-100">
              选择新状态
            </div>
            {statusOptions.map((option) => {
              const IconComponent = option.icon
              const isSelected = option.name === record.status
              
              return (
                <button
                  key={option.id}
                  onClick={() => handleStatusChange(option)}
                  disabled={updateStatusMutation.isLoading}
                  className={`w-full flex items-start space-x-3 px-3 py-3 rounded-lg transition-all hover:bg-slate-50 ${
                    isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                  } ${updateStatusMutation.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor(option.color)}`}>
                    <IconComponent size={16} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">{option.name}</span>
                      {isSelected && <Check size={14} className="text-blue-600" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{option.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 备注输入框 */}
      {showNoteInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              添加备注 - {selectedStatus}
            </h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="请输入状态变更的详细说明..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              rows={4}
            />
            <div className="flex items-center justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowNoteInput(false)
                  setSelectedStatus('')
                  setNote('')
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleNoteSubmit}
                disabled={!note.trim() || updateStatusMutation.isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updateStatusMutation.isLoading ? '更新中...' : '确认更新'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 点击外部关闭下拉菜单 */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default StatusSelector
