import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { 
  Activity, 
  LogIn, 
  Eye, 
  Calendar,
  Filter,
  Download,
  Trash2,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Globe
} from 'lucide-react'
import LoadingSpinner from '../UI/LoadingSpinner'
import toast from 'react-hot-toast'



const LogManagement = () => {
  const [activeTab, setActiveTab] = useState('stats')
  const [loginFilters, setLoginFilters] = useState({
    page: 1,
    pageSize: 20,
    username: '',
    status: '',
    loginType: '',
    startDate: '',
    endDate: ''
  })
  const [operationFilters, setOperationFilters] = useState({
    page: 1,
    pageSize: 20,
    username: '',
    action: '',
    resource: '',
    status: '',
    startDate: '',
    endDate: ''
  })
  const [statsParams, setStatsParams] = useState({ days: 7 })

  const { user, hasPermission } = useAuth()
  const queryClient = useQueryClient()

  // 权限检查
  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <AlertCircle className="text-yellow-500 mr-2" size={24} />
          <h3 className="text-lg font-semibold text-yellow-800">未登录</h3>
        </div>
        <p className="text-yellow-700">请先登录以访问日志管理功能</p>
      </div>
    )
  }

  if (!hasPermission('logs.view')) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <AlertCircle className="text-red-500 mr-2" size={24} />
          <h3 className="text-lg font-semibold text-red-800">权限不足</h3>
        </div>
        <p className="text-red-700">您没有权限访问日志管理功能</p>
      </div>
    )
  }

  // 获取统计信息
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['log-stats', statsParams],
    queryFn: () => logAPI.getStats(statsParams.days).then(res => res.data),
    enabled: activeTab === 'stats'
  })

  // 获取登录日志
  const { data: loginLogsData, isLoading: loginLogsLoading } = useQuery({
    queryKey: ['login-logs', loginFilters],
    queryFn: () => logAPI.getLoginLogs(loginFilters).then(res => res.data),
    enabled: activeTab === 'login'
  })

  // 获取操作日志
  const { data: operationLogsData, isLoading: operationLogsLoading } = useQuery({
    queryKey: ['operation-logs', operationFilters],
    queryFn: () => logAPI.getOperationLogs(operationFilters).then(res => res.data),
    enabled: activeTab === 'operation'
  })

  // 清理日志
  const cleanupMutation = useMutation({
    mutationFn: (retentionDays) => logAPI.cleanup(retentionDays).then(res => res.data),
    onSuccess: (response) => {
      toast.success(response.message)
      queryClient.invalidateQueries(['log-stats'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '清理失败')
    }
  })

  const tabs = [
    { id: 'stats', name: '统计概览', icon: Activity },
    { id: 'login', name: '登录日志', icon: LogIn },
    { id: 'operation', name: '操作日志', icon: Eye }
  ]

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <Activity className="mr-2" size={24} />
            日志管理
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            查看系统登录和操作日志，监控安全状态
          </p>
        </div>
      </div>

      {/* 标签页 */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon size={16} className="mr-1" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* 内容区域 */}
      {activeTab === 'stats' && (
        <StatsView 
          data={statsData?.data} 
          loading={statsLoading}
          params={statsParams}
          setParams={setStatsParams}
          onCleanup={cleanupMutation.mutate}
          hasCleanupPermission={hasPermission('logs.cleanup')}
        />
      )}

      {activeTab === 'login' && (
        <LoginLogsView 
          data={loginLogsData?.data} 
          loading={loginLogsLoading}
          filters={loginFilters}
          setFilters={setLoginFilters}
        />
      )}

      {activeTab === 'operation' && (
        <OperationLogsView 
          data={operationLogsData?.data} 
          loading={operationLogsLoading}
          filters={operationFilters}
          setFilters={setOperationFilters}
        />
      )}
    </div>
  )
}

// 统计概览组件
const StatsView = ({ data, loading, params, setParams, onCleanup, hasCleanupPermission }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
        <span className="ml-3 text-slate-600">加载统计信息...</span>
      </div>
    )
  }

  if (!data) return null

  const { loginStats, operationStats, dailyLogins, topActions } = data

  return (
    <div className="space-y-6">
      {/* 时间范围选择 */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-600">统计周期:</span>
        {[7, 14, 30].map(days => (
          <button
            key={days}
            onClick={() => setParams({ days })}
            className={`px-3 py-1 rounded-md text-sm ${
              params.days === days
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {days} 天
          </button>
        ))}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-neon p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">总登录次数</p>
              <p className="text-2xl font-bold text-slate-800">{loginStats.totalLogins}</p>
            </div>
            <LogIn className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="card-neon p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">登录成功率</p>
              <p className="text-2xl font-bold text-green-600">
                {loginStats.totalLogins > 0 
                  ? Math.round((loginStats.successfulLogins / loginStats.totalLogins) * 100) 
                  : 0}%
              </p>
            </div>
            <CheckCircle className="text-green-500" size={32} />
          </div>
        </div>

        <div className="card-neon p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">活跃用户</p>
              <p className="text-2xl font-bold text-purple-600">{loginStats.uniqueUsers}</p>
            </div>
            <User className="text-purple-500" size={32} />
          </div>
        </div>

        <div className="card-neon p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">总操作数</p>
              <p className="text-2xl font-bold text-orange-600">{operationStats.totalOperations}</p>
            </div>
            <Activity className="text-orange-500" size={32} />
          </div>
        </div>
      </div>

      {/* 热门操作 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-neon">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">热门操作</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {topActions.slice(0, 10).map((action, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-800">
                      {action.action}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({action.resource})
                    </span>
                  </div>
                  <span className="text-sm text-slate-600">{action.count} 次</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 日志管理 */}
        <div className="card-neon">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">日志管理</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">日志保留策略</h4>
              <p className="text-sm text-blue-700">
                建议定期清理超过90天的旧日志，保持系统性能
              </p>
            </div>
            
            {hasCleanupPermission && (
              <button
                onClick={() => {
                  if (window.confirm('确定要清理90天前的日志吗？此操作不可恢复！')) {
                    onCleanup(90)
                  }
                }}
                className="btn-secondary flex items-center w-full justify-center"
              >
                <Trash2 size={16} className="mr-2" />
                清理旧日志
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 登录日志组件
const LoginLogsView = ({ data, loading, filters, setFilters }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
        <span className="ml-3 text-slate-600">加载登录日志...</span>
      </div>
    )
  }

  const logs = data?.items || []

  return (
    <div className="space-y-6">
      {/* 过滤器 */}
      <div className="card-neon p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
            <input
              type="text"
              value={filters.username}
              onChange={(e) => setFilters({...filters, username: e.target.value, page: 1})}
              className="input-neon w-full"
              placeholder="搜索用户名"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">状态</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value, page: 1})}
              className="input-neon w-full"
            >
              <option value="">全部</option>
              <option value="success">成功</option>
              <option value="failed">失败</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">登录类型</label>
            <select
              value={filters.loginType}
              onChange={(e) => setFilters({...filters, loginType: e.target.value, page: 1})}
              className="input-neon w-full"
            >
              <option value="">全部</option>
              <option value="admin">管理员</option>
              <option value="feishu">飞书</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">日期范围</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value, page: 1})}
              className="input-neon w-full"
            />
          </div>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="card-neon overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  用户信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  IP地址
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  时间
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <User size={16} className="text-slate-600" />
                        <span className="text-slate-800 font-medium">{log.username}</span>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        log.login_type === 'feishu' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {log.login_type === 'feishu' ? '飞书登录' : '管理员登录'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        log.status === 'success' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status === 'success' ? (
                          <>
                            <CheckCircle size={12} className="mr-1" />
                            成功
                          </>
                        ) : (
                          <>
                            <XCircle size={12} className="mr-1" />
                            失败
                          </>
                        )}
                      </span>
                      {log.failure_reason && (
                        <p className="text-xs text-red-600">{log.failure_reason}</p>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                      <Globe size={14} className="text-slate-500" />
                      <span className="text-sm text-slate-600">{log.ip_address}</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                      <Clock size={14} className="text-slate-500" />
                      <span className="text-sm text-slate-600">
                        {new Date(log.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {logs.length === 0 && (
            <div className="text-center py-12">
              <LogIn className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">暂无登录日志</h3>
              <p className="mt-1 text-sm text-slate-500">
                当前筛选条件下没有找到登录记录
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 操作日志组件
const OperationLogsView = ({ data, loading, filters, setFilters }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
        <span className="ml-3 text-slate-600">加载操作日志...</span>
      </div>
    )
  }

  const logs = data?.items || []

  return (
    <div className="space-y-6">
      {/* 过滤器 */}
      <div className="card-neon p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
            <input
              type="text"
              value={filters.username}
              onChange={(e) => setFilters({...filters, username: e.target.value, page: 1})}
              className="input-neon w-full"
              placeholder="搜索用户名"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">操作</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({...filters, action: e.target.value, page: 1})}
              className="input-neon w-full"
            >
              <option value="">全部操作</option>
              <option value="create">创建</option>
              <option value="update">更新</option>
              <option value="delete">删除</option>
              <option value="view">查看</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">资源</label>
            <select
              value={filters.resource}
              onChange={(e) => setFilters({...filters, resource: e.target.value, page: 1})}
              className="input-neon w-full"
            >
              <option value="">全部资源</option>
              <option value="users">用户</option>
              <option value="emails">邮箱</option>
              <option value="registrations">报名</option>
              <option value="fields">字段</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">状态</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value, page: 1})}
              className="input-neon w-full"
            >
              <option value="">全部</option>
              <option value="success">成功</option>
              <option value="failed">失败</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">日期</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value, page: 1})}
              className="input-neon w-full"
            />
          </div>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="card-neon overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  操作
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  时间
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <User size={16} className="text-slate-600" />
                      <span className="text-slate-800 font-medium">{log.username}</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-800 font-medium">{log.action}</span>
                        <span className="text-slate-600">→</span>
                        <span className="text-slate-600">{log.resource}</span>
                      </div>
                      {log.resource_id && (
                        <p className="text-xs text-slate-500">ID: {log.resource_id}</p>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      log.status === 'success' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {log.status === 'success' ? (
                        <>
                          <CheckCircle size={12} className="mr-1" />
                          成功
                        </>
                      ) : (
                        <>
                          <XCircle size={12} className="mr-1" />
                          失败
                        </>
                      )}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                      <Clock size={14} className="text-slate-500" />
                      <span className="text-sm text-slate-600">
                        {new Date(log.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {logs.length === 0 && (
            <div className="text-center py-12">
              <Eye className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">暂无操作日志</h3>
              <p className="mt-1 text-sm text-slate-500">
                当前筛选条件下没有找到操作记录
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LogManagement
