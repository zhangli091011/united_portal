import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { healthAPI } from '../../services/api'
import { 
  Activity,
  Database,
  Mail,
  Rss,
  Globe,
  HardDrive,
  Cpu,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Info,
  TrendingUp,
  Server,
  Folder,
  Shield
} from 'lucide-react'
import LoadingSpinner from '../UI/LoadingSpinner'

const HealthCheck = () => {
  const [selectedCheck, setSelectedCheck] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // 获取所有健康检查结果
  const { 
    data: healthData, 
    isLoading: healthLoading, 
    error: healthError,
    refetch: refetchHealth 
  } = useQuery({
    queryKey: ['health-check'],
    queryFn: healthAPI.runAllChecks,
    refetchInterval: autoRefresh ? 30000 : false, // 30秒自动刷新
    staleTime: 0
  })

  // 获取系统信息
  const { 
    data: systemData, 
    isLoading: systemLoading,
    refetch: refetchSystem 
  } = useQuery({
    queryKey: ['system-info'],
    queryFn: healthAPI.getSystemInfo,
    refetchInterval: autoRefresh ? 60000 : false // 1分钟自动刷新
  })

  // 获取可用检查项
  const { data: checksData } = useQuery({
    queryKey: ['available-checks'],
    queryFn: healthAPI.getAvailableChecks
  })

  const handleRefresh = async () => {
    await Promise.all([refetchHealth(), refetchSystem()])
  }

  const handleSingleCheck = async (checkName) => {
    try {
      const result = await healthAPI.runCheck(checkName)
      setSelectedCheck(result)
    } catch (error) {
      console.error('单项检查失败:', error)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="text-green-500" size={20} />
      case 'warning':
        return <AlertCircle className="text-yellow-500" size={20} />
      case 'error':
        return <XCircle className="text-red-500" size={20} />
      default:
        return <Clock className="text-gray-400" size={20} />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getCheckIcon = (checkName) => {
    const icons = {
      database: Database,
      feishu: Activity,
      email: Mail,
      rss: Rss,
      halo: Globe,
      filesystem: Folder,
      memory: Cpu,
      diskSpace: HardDrive
    }
    const IconComponent = icons[checkName] || Shield
    return <IconComponent size={20} />
  }

  const checks = healthData?.data?.data?.checks || {}
  const overall = healthData?.data?.data?.overall || 'unknown'
  const summary = healthData?.data?.data?.summary || { total: 0, healthy: 0, warning: 0, error: 0 }
  const systemInfo = systemData?.data?.data || {}
  const availableChecks = checksData?.data?.data || {}

  if (healthLoading && systemLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部信息 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center">
            <Activity className="mr-3" size={28} />
            系统健康检查
          </h2>
          <p className="text-slate-600">
            监控系统各项服务和资源的运行状态
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>自动刷新</span>
          </label>
          
          <button
            onClick={handleRefresh}
            disabled={healthLoading || systemLoading}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw size={16} className={healthLoading || systemLoading ? 'animate-spin' : ''} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* 整体状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`card-neon p-6 ${getStatusColor(overall)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-75">整体状态</p>
              <p className="text-2xl font-bold mt-1">
                {overall === 'healthy' ? '正常' : 
                 overall === 'warning' ? '警告' : 
                 overall === 'error' ? '异常' : '未知'}
              </p>
            </div>
            {getStatusIcon(overall)}
          </div>
        </div>

        <div className="card-neon p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">正常服务</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{summary.healthy}</p>
            </div>
            <CheckCircle className="text-green-500" size={24} />
          </div>
        </div>

        <div className="card-neon p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">警告服务</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{summary.warning}</p>
            </div>
            <AlertCircle className="text-yellow-500" size={24} />
          </div>
        </div>

        <div className="card-neon p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">异常服务</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{summary.error}</p>
            </div>
            <XCircle className="text-red-500" size={24} />
          </div>
        </div>
      </div>

      {/* 详细检查结果 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(checks).map(([checkName, result]) => {
          const checkInfo = availableChecks[checkName] || { name: checkName, description: '系统检查' }
          
          return (
            <div key={checkName} className="card-neon p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    result.status === 'healthy' ? 'bg-green-100 text-green-600' :
                    result.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {getCheckIcon(checkName)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{checkInfo.name}</h3>
                    <p className="text-sm text-slate-600">{checkInfo.description}</p>
                  </div>
                </div>
                {getStatusIcon(result.status)}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">状态:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                    {result.message}
                  </span>
                </div>
                
                {result.responseTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">响应时间:</span>
                    <span className="text-slate-800">{result.responseTime}ms</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">检查时间:</span>
                  <span className="text-slate-800">
                    {new Date(result.timestamp).toLocaleString('zh-CN')}
                  </span>
                </div>

                {result.details && (
                  <div className="mt-3">
                    <button
                      onClick={() => handleSingleCheck(checkName)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                    >
                      <Info size={14} />
                      <span>查看详情</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 系统信息 */}
      <div className="card-neon p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <Server className="mr-2" size={20} />
          系统信息
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-slate-700">基础信息</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">平台:</span>
                <span className="text-slate-800">{systemInfo.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">架构:</span>
                <span className="text-slate-800">{systemInfo.arch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Node版本:</span>
                <span className="text-slate-800">{systemInfo.nodeVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">运行环境:</span>
                <span className="text-slate-800">{systemInfo.env}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-slate-700">运行时间</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">运行时长:</span>
                <span className="text-slate-800">
                  {systemInfo.uptime ? `${Math.floor(systemInfo.uptime / 3600)}h ${Math.floor((systemInfo.uptime % 3600) / 60)}m` : '--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">启动时间:</span>
                <span className="text-slate-800">
                  {systemInfo.uptime ? new Date(Date.now() - systemInfo.uptime * 1000).toLocaleString('zh-CN') : '--'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-slate-700">内存使用</h4>
            <div className="space-y-2 text-sm">
              {systemInfo.memory && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-600">RSS:</span>
                    <span className="text-slate-800">{Math.round(systemInfo.memory.rss / 1024 / 1024)}MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Heap已用:</span>
                    <span className="text-slate-800">{Math.round(systemInfo.memory.heapUsed / 1024 / 1024)}MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Heap总计:</span>
                    <span className="text-slate-800">{Math.round(systemInfo.memory.heapTotal / 1024 / 1024)}MB</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 详情模态框 */}
      {selectedCheck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">检查详情</h3>
                <button
                  onClick={() => setSelectedCheck(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={24} />
                </button>
              </div>
              
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(selectedCheck, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {healthError && (
        <div className="card-neon p-6 border-red-200 bg-red-50">
          <div className="flex items-center space-x-3">
            <XCircle className="text-red-500" size={20} />
            <div>
              <h4 className="font-medium text-red-800">无法获取健康检查数据</h4>
              <p className="text-sm text-red-600 mt-1">
                {healthError.response?.data?.message || healthError.message || '网络错误'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HealthCheck
