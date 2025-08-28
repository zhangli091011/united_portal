import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { registrationAPI } from '../../services/api'
import { 
  Check, 
  X, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  MessageSquare,
  Shield,
  ShieldCheck,
  Crown
} from 'lucide-react'
import toast from 'react-hot-toast'

const ApprovalActions = ({ record, onSuccess }) => {
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState('')
  const [actionType, setActionType] = useState('')
  const queryClient = useQueryClient()

  // 获取当前状态信息
  const getStatusInfo = (status) => {
    const statusMap = {
      '待审核': { level: 0, label: '待审核', color: 'yellow', icon: MessageSquare },
      '一审通过': { level: 1, label: '一审通过', color: 'blue', icon: Shield },
      '二审通过': { level: 2, label: '二审通过', color: 'green', icon: ShieldCheck },
      '终审通过': { level: 3, label: '终审通过', color: 'emerald', icon: Crown },
      '初审驳回': { level: -1, label: '初审驳回', color: 'red', icon: XCircle },
      '二审驳回': { level: -2, label: '二审驳回', color: 'red', icon: XCircle },
      '终审驳回': { level: -3, label: '终审驳回', color: 'red', icon: XCircle }
    }
    return statusMap[status] || { level: 0, label: status, color: 'gray', icon: MessageSquare }
  }

  const statusInfo = getStatusInfo(record.status)

  // 一级审核
  const firstApprovalMutation = useMutation({
    mutationFn: ({ action, note }) => {
      if (action === 'approve') {
        return registrationAPI.approve(record.id, { status: '一审通过', note })
      } else {
        return registrationAPI.reject(record.id, { reason: note })
      }
    },
    onSuccess: () => {
      toast.success(actionType === 'approve' ? '一审通过成功' : '初审驳回成功')
      queryClient.invalidateQueries(['registrations'])
      queryClient.invalidateQueries(['dashboard'])
      setShowNote(false)
      setNote('')
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '操作失败')
    }
  })

  // 二级审核
  const secondApprovalMutation = useMutation({
    mutationFn: ({ action, note }) => registrationAPI.secondApprove(record.id, { action, note }),
    onSuccess: () => {
      toast.success(actionType === 'approve' ? '二审通过成功' : '二审驳回成功')
      queryClient.invalidateQueries(['registrations'])
      queryClient.invalidateQueries(['dashboard'])
      setShowNote(false)
      setNote('')
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '操作失败')
    }
  })

  // 终级审核
  const finalApprovalMutation = useMutation({
    mutationFn: ({ action, note }) => registrationAPI.finalApprove(record.id, { action, note }),
    onSuccess: () => {
      toast.success(actionType === 'approve' ? '终审通过成功' : '终审驳回成功')
      queryClient.invalidateQueries(['registrations'])
      queryClient.invalidateQueries(['dashboard'])
      setShowNote(false)
      setNote('')
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '操作失败')
    }
  })

  const handleAction = (action, level) => {
    setActionType(action)
    
    if (action === 'reject' || (action === 'approve' && level === 1)) {
      setShowNote(true)
      return
    }

    // 对于二级和终级审核，直接执行
    const mutation = level === 2 ? secondApprovalMutation : finalApprovalMutation
    mutation.mutate({ action, note: '' })
  }

  const handleSubmitWithNote = () => {
    if (actionType === 'reject' && !note.trim()) {
      toast.error('请填写驳回原因')
      return
    }

    let mutation
    if (statusInfo.level === 0) {
      mutation = firstApprovalMutation
    } else if (statusInfo.level === 1) {
      mutation = secondApprovalMutation
    } else if (statusInfo.level === 2) {
      mutation = finalApprovalMutation
    }

    if (mutation) {
      mutation.mutate({ action: actionType, note })
    }
  }

  const isLoading = firstApprovalMutation.isLoading || 
                   secondApprovalMutation.isLoading || 
                   finalApprovalMutation.isLoading

  // 根据当前状态判断可用的操作
  const getAvailableActions = () => {
    switch (statusInfo.level) {
      case 0: // 待审核
        return [
          { action: 'approve', label: '一审通过', level: 1, color: 'blue' },
          { action: 'reject', label: '初审驳回', level: -1, color: 'red' }
        ]
      case 1: // 一审通过
        return [
          { action: 'approve', label: '二审通过', level: 2, color: 'green' },
          { action: 'reject', label: '二审驳回', level: -2, color: 'red' }
        ]
      case 2: // 二审通过
        return [
          { action: 'approve', label: '终审通过', level: 3, color: 'emerald' },
          { action: 'reject', label: '终审驳回', level: -3, color: 'red' }
        ]
      default:
        return [] // 已完成或已驳回
    }
  }

  const availableActions = getAvailableActions()

  if (availableActions.length === 0) {
    // 显示最终状态
    const StatusIcon = statusInfo.icon
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg bg-${statusInfo.color}-100 border border-${statusInfo.color}-300`}>
        <StatusIcon size={16} className={`text-${statusInfo.color}-600`} />
        <span className={`text-${statusInfo.color}-800 font-medium text-sm`}>
          {statusInfo.label}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 当前状态显示 */}
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg bg-${statusInfo.color}-100 border border-${statusInfo.color}-300`}>
        <statusInfo.icon size={16} className={`text-${statusInfo.color}-600`} />
        <span className={`text-${statusInfo.color}-800 font-medium text-sm`}>
          {statusInfo.label}
        </span>
      </div>

      {/* 操作按钮 */}
      {!showNote && (
        <div className="flex space-x-2">
          {availableActions.map((actionItem) => (
            <button
              key={`${actionItem.action}-${actionItem.level}`}
              onClick={() => handleAction(actionItem.action, Math.abs(actionItem.level))}
              disabled={isLoading}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                actionItem.action === 'approve'
                  ? `bg-${actionItem.color}-600 hover:bg-${actionItem.color}-700 text-white`
                  : 'bg-red-600 hover:bg-red-700 text-white'
              } disabled:opacity-50`}
            >
              {actionItem.action === 'approve' ? (
                <Check size={14} />
              ) : (
                <X size={14} />
              )}
              <span>{actionItem.label}</span>
              {actionItem.level > statusInfo.level && <ChevronRight size={12} />}
            </button>
          ))}
        </div>
      )}

      {/* 备注输入 */}
      {showNote && (
        <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {actionType === 'approve' ? '审核备注' : '驳回原因'} 
              {actionType === 'reject' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={actionType === 'approve' ? '可选：添加审核备注' : '请说明驳回原因'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              rows={3}
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSubmitWithNote}
              disabled={isLoading}
              className={`flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                actionType === 'approve' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {actionType === 'approve' ? <Check size={14} /> : <X size={14} />}
              <span>确认{actionType === 'approve' ? '通过' : '驳回'}</span>
            </button>
            <button
              onClick={() => {
                setShowNote(false)
                setNote('')
                setActionType('')
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 审批流程指示器 */}
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${statusInfo.level >= 0 ? 'bg-yellow-400' : 'bg-gray-300'}`} />
          <span>待审核</span>
        </div>
        <ChevronRight size={12} />
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${statusInfo.level >= 1 ? 'bg-blue-400' : 'bg-gray-300'}`} />
          <span>一审</span>
        </div>
        <ChevronRight size={12} />
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${statusInfo.level >= 2 ? 'bg-green-400' : 'bg-gray-300'}`} />
          <span>二审</span>
        </div>
        <ChevronRight size={12} />
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${statusInfo.level >= 3 ? 'bg-emerald-400' : 'bg-gray-300'}`} />
          <span>终审</span>
        </div>
      </div>
    </div>
  )
}

export default ApprovalActions
