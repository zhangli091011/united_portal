import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { statsAPI, registrationAPI, authAPI } from '../../services/api'
import { Bug, RefreshCw, Eye, EyeOff } from 'lucide-react'

const DebugPanel = () => {
  const [showDebug, setShowDebug] = useState(false)
  
  // 获取仪表板数据用于调试
  const { data: debugDashboardData, refetch: refetchDebug } = useQuery({
    queryKey: ['debug-dashboard'],
    queryFn: statsAPI.getDashboard,
    enabled: showDebug,
    staleTime: 0,
    gcTime: 0, // cacheTime renamed to gcTime in v5
    onSuccess: (data) => {
      console.log('🔍 Debug - 原始响应数据:', data)
      console.log('🔍 Debug - 响应类型:', typeof data)
      console.log('🔍 Debug - 是否有data字段:', !!data?.data)
      console.log('🔍 Debug - overview字段:', data?.data?.overview)
    },
    onError: (error) => {
      console.error('🚫 Debug - 获取数据失败:', error)
    }
  })

  if (!showDebug) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowDebug(true)}
          className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg transition-colors"
          title="显示调试面板"
        >
          <Bug className="w-5 h-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-gray-900 border border-red-500 rounded-lg shadow-xl z-50 overflow-hidden">
      <div className="bg-red-600 text-white p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bug className="w-4 h-4" />
          <span className="font-medium">调试面板</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => refetchDebug()}
            className="p-1 hover:bg-red-700 rounded"
            title="刷新数据"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDebug(false)}
            className="p-1 hover:bg-red-700 rounded"
            title="隐藏面板"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="p-4 overflow-y-auto max-h-80 text-sm">
        <div className="space-y-3">
          <div>
            <h4 className="text-yellow-400 font-medium">📡 API响应状态:</h4>
            <p className="text-gray-300">
              状态: {debugDashboardData ? '✅ 成功' : '❌ 无数据'}
            </p>
          </div>
          
          {debugDashboardData && (
            <>
              <div>
                <h4 className="text-yellow-400 font-medium">🔍 原始数据结构:</h4>
                <pre className="text-xs text-gray-300 bg-gray-800 p-2 rounded overflow-x-auto">
                  {JSON.stringify(debugDashboardData, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="text-yellow-400 font-medium">📊 解析后的overview数据:</h4>
                <div className="text-gray-300 space-y-1">
                  <p>总报名数: <span className="text-white">{debugDashboardData?.data?.overview?.totalRegistrations || '未定义'}</span></p>
                  <p>今日报名: <span className="text-white">{debugDashboardData?.data?.overview?.todayRegistrations || '未定义'}</span></p>
                  <p>待审核: <span className="text-white">{debugDashboardData?.data?.overview?.pendingReview || '未定义'}</span></p>
                  <p>已通过: <span className="text-white">{debugDashboardData?.data?.overview?.approved || '未定义'}</span></p>
                </div>
              </div>
              
              <div>
                <h4 className="text-yellow-400 font-medium">🔄 数据路径验证:</h4>
                <div className="text-gray-300 space-y-1 text-xs">
                  <p>debugDashboardData: {debugDashboardData ? '✅' : '❌'}</p>
                  <p>debugDashboardData.data: {debugDashboardData?.data ? '✅' : '❌'}</p>
                  <p>debugDashboardData.data.overview: {debugDashboardData?.data?.overview ? '✅' : '❌'}</p>
                  <p>totalRegistrations: {typeof debugDashboardData?.data?.overview?.totalRegistrations}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default DebugPanel
