import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useDebug } from '../contexts/DebugContext'
import { statsAPI, registrationAPI, newsAPI } from '../services/api'
import { 
  BarChart3, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  Newspaper,
  Settings,
  Download,
  RefreshCw,
  Palette,
  Mail,
  AlertCircle,
  UserCog,
  Database,
  LogOut,
  MailCheck,
  Activity,
  Globe,
  Heart
} from 'lucide-react'
import LoadingSpinner from '../components/UI/LoadingSpinner'
import RegistrationTable from '../components/Admin/RegistrationTable'
import StatCard from '../components/Admin/StatCard'
import Chart from '../components/Admin/Chart'
import DebugPanel from '../components/Admin/DebugPanel'
import DataTest from '../components/Admin/DataTest'
import SettingsPanel from '../components/Admin/SettingsPanel'
import BulkEmailModal from '../components/Admin/BulkEmailModal'
import UserManagement from '../components/Admin/UserManagement'
import FieldManagement from '../components/Admin/FieldManagement'
import EmailManagement from '../components/Admin/EmailManagement'
import LogManagement from '../components/Admin/LogManagement'
import HaloManagement from '../components/Admin/HaloManagement'
import HealthCheck from '../components/Admin/HealthCheck'

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(1000)
  const [pageToken, setPageToken] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false)
  const [sortBy, setSortBy] = useState('registrationId')
  const [sortOrder, setSortOrder] = useState('desc')
  const { user, isSuperAdmin, hasPermission, logout } = useAuth()
  const { showDataPanels } = useDebug()

  // 获取仪表板数据
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard, error: dashboardError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: statsAPI.getDashboard,
    enabled: !!user, // 只有用户登录后才启用查询
    refetchInterval: 30000, // 30秒自动刷新
    staleTime: 0, // 强制每次都获取最新数据
    gcTime: 0, // cacheTime renamed to gcTime in v5
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    onError: (error) => {
      console.error('🚫 获取仪表板数据失败:', error)
      console.error('🚫 错误详情:', error.response?.data)
      console.error('🚫 用户状态:', user)
    },
    onSuccess: (data) => {
      console.log('✅ 仪表板数据获取成功:', data)
      console.log('✅ 数据结构检查:', data?.data?.overview)
    }
  })

  // 获取报名列表
  const { data: registrationsData, isLoading: registrationsLoading, refetch: refetchRegistrations, error: registrationsError } = useQuery({
    queryKey: ['registrations', { page: currentPage, pageSize, pageToken, search: searchTerm, sortBy, sortOrder }],
    queryFn: () => registrationAPI.getAll({ 
      page: currentPage, 
      pageSize, 
      pageToken,
      search: searchTerm,
      sortBy,
      sortOrder
    }),
    enabled: activeTab === 'registrations',
    staleTime: 0, // 强制每次都获取最新数据
    gcTime: 0, // cacheTime renamed to gcTime in v5
    refetchOnMount: true,
    onError: (error) => {
      console.error('获取报名数据失败:', error)
    },
    onSuccess: (data) => {
      console.log('报名数据获取成功:', data)
    }
  })

  const handleRefresh = async () => {
    await Promise.all([
      refetchDashboard(),
      activeTab === 'registrations' && refetchRegistrations()
    ])
  }

  // 分页处理函数
  const handlePageChange = (page) => {
    setCurrentPage(page)
    // 根据飞书分页逻辑，需要设置正确的page_token
    if (page > currentPage) {
      // 下一页，使用当前响应的nextPageToken
      setPageToken(registrationsData?.data?.data?.nextPageToken || null)
    } else {
      // 上一页或跳转，重置token（飞书API不直接支持向前翻页，需要重新计算）
      setPageToken(null)
    }
  }

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
    setPageToken(null)
  }

  const handleSearch = (term) => {
    setSearchTerm(term)
    setCurrentPage(1)
    setPageToken(null)
  }

  const handleSort = (field, order) => {
    setSortBy(field)
    setSortOrder(order)
    setCurrentPage(1)
    setPageToken(null)
  }

  const handleExport = async () => {
    try {
      const response = await statsAPI.exportRegistrations('csv')
      // 处理CSV下载
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `registrations_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('导出失败:', error)
    }
  }

  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？\n\n退出后需要重新登录才能继续使用管理功能。')) {
      logout()
      // 重定向到登录页面
      window.location.href = '/admin/login'
    }
  }

  const tabs = [
    { id: 'overview', label: '总览', icon: BarChart3 },
    { id: 'registrations', label: '报名管理', icon: Users },
    { id: 'bulk-email', label: '批量邮件', icon: Mail },
    //    { id: 'news', label: '新闻管理', icon: Newspaper },
    { id: 'settings', label: '系统设置', icon: Settings },
    ...(isSuperAdmin() ? [
      { id: 'users', label: '用户管理', icon: UserCog },
      //{ id: 'fields', label: '字段管理', icon: Database },
      { id: 'emails', label: '邮箱管理', icon: MailCheck }
    ] : []),
    ...(hasPermission('logs.view') ? [
      { id: 'logs', label: '日志管理', icon: Activity }
    ] : []),
    ...(hasPermission('halo.view') ? [
      //{ id: 'halo', label: 'Halo博客', icon: Globe }
    ] : []),
    ...(hasPermission('logs.view') ? [
      { id: 'health', label: '系统自检', icon: Heart }
    ] : [])
  ]

  if (dashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  const dashboard = dashboardData?.data?.data || {}
  
  // 强制数据检查和调试
  const safeOverview = dashboard.overview || {}
  const totalReg = safeOverview.totalRegistrations
  const todayReg = safeOverview.todayRegistrations  
  const pendingReg = safeOverview.pendingReview
  
  // 数据验证
  console.log('📊 仪表板数据:', { totalReg, todayReg, pendingReg, approved: safeOverview.approved })

  return (
    <div className="min-h-screen py-8 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">管理后台</h1>
            <div className="flex items-center space-x-3">
              <p className="text-slate-600">
                欢迎回来，{user?.name || user?.username || '管理员'}
              </p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {user?.role === 'super_admin' ? '超级管理员' : 
                 user?.role === 'admin' ? '管理员' : '用户'}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {user?.loginType === 'feishu' ? '飞书登录' : '本地登录'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <button
              onClick={handleRefresh}
              className="btn-secondary flex items-center space-x-2"
            >
              <RefreshCw size={16} />
              <span>刷新</span>
            </button>
            
            <button
              onClick={handleExport}
              className="btn-primary flex items-center space-x-2"
            >
              <Download size={16} />
              <span>导出数据</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors"
              title="退出登录"
            >
              <LogOut size={16} />
              <span>退出登录</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
            {tabs.map(tab => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  <IconComponent size={16} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">

            
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="总报名数"
                value={totalReg || 0}
                icon={Users}
                color="blue"
                trend={{ value: todayReg || 0, label: '今日新增' }}
              />
              
              <StatCard
                title="待审核"
                value={pendingReg || 0}
                icon={Clock}
                color="yellow"
                trend={{ value: pendingReg || 0, label: '需处理' }}
              />
              
              <StatCard
                title="已通过"
                value={safeOverview.approved || 0}
                icon={CheckCircle}
                color="green"
                trend={{ value: safeOverview.approvalRate || 0, label: '通过率%' }}
              />
              
              <StatCard
                title="已驳回"
                value={safeOverview.rejected || 0}
                icon={XCircle}
                color="red"
                trend={{ value: safeOverview.rejected || 0, label: '驳回数' }}
              />
            </div>

            {/* 图表 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 报名趋势 */}
              <div className="card-neon p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  <TrendingUp className="mr-2" size={20} />
                  最近7天报名趋势
                </h3>
                <Chart
                  type="line"
                  data={dashboard.registrationTrend || []}
                  xField="date"
                  yField="count"
                />
              </div>

              {/* 状态分布 */}
              <div className="card-neon p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">状态分布</h3>
                <Chart
                  type="pie"
                  data={dashboard.statusDistribution || []}
                  labelField="status"
                  valueField="count"
                />
              </div>
            </div>

            {/* 热门节目类型 */}
            <div className="card-neon p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">热门节目类型</h3>
              <Chart
                type="bar"
                data={dashboard.popularTypes || []}
                xField="type"
                yField="count"
              />
            </div>

            {/* 最近报名 */}
            <div className="card-neon p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">最近报名</h3>
              <div className="space-y-3">
                {dashboard.recentRegistrations?.slice(0, 5).map(registration => (
                  <div key={registration.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-orange/20 rounded-lg flex items-center justify-center">
                        <Users size={16} className="text-primary-orange" />
                      </div>
                      <div>
                        <p className="text-slate-800 font-medium">{registration.name}</p>
                        <p className="text-slate-500 text-sm">{registration.programName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">
                        {new Date(registration.createdTime).toLocaleDateString('zh-CN')}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                        registration.status?.includes('通过') ? 'bg-green-500/20 text-green-400' :
                        registration.status?.includes('驳回') ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {registration.status || '待审核'}
                      </span>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-400 text-center py-4">暂无报名记录</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'registrations' && (
          <div>
            <RegistrationTable
              data={registrationsData?.data?.data}
              loading={registrationsLoading}
              onRefresh={refetchRegistrations}
              pagination={{
                page: currentPage,
                pageSize,
                total: registrationsData?.data?.data?.total || 0,
                hasMore: registrationsData?.data?.data?.hasMore || false
              }}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              onSearch={handleSearch}
              onSort={handleSort}
            />
          </div>
        )}

        {activeTab === 'bulk-email' && (
          <div className="space-y-6">
            <div className="card-neon p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center">
                    <Mail className="mr-2" size={24} />
                    批量邮件发送
                  </h3>
                  <p className="text-slate-600">根据报名状态和类型筛选，批量发送通知邮件</p>
                </div>
                <button
                  onClick={() => setShowBulkEmailModal(true)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Mail size={18} />
                  <span>创建批量邮件</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Mail size={20} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800">自定义通知</h4>
                      <p className="text-sm text-slate-600">发送自定义内容的通知邮件</p>
                    </div>
                  </div>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• 自定义邮件主题和内容</li>
                    <li>• 支持HTML格式</li>
                    <li>• 可设置优先级</li>
                  </ul>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                      <AlertCircle size={20} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800">重要提醒</h4>
                      <p className="text-sm text-slate-600">发送重要事项提醒邮件</p>
                    </div>
                  </div>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• 可设置截止时间</li>
                    <li>• 支持紧急提醒</li>
                    <li>• 突出显示重要信息</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <CheckCircle size={20} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800">状态更新</h4>
                      <p className="text-sm text-slate-600">批量更新状态并发送通知</p>
                    </div>
                  </div>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• 批量修改报名状态</li>
                    <li>• 自动发送状态通知</li>
                    <li>• 记录操作日志</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-800 mb-2">使用说明</h4>
                <ol className="text-sm text-slate-600 space-y-1 ml-4">
                  <li>1. 选择要发送邮件的类型（自定义通知、重要提醒、状态更新）</li>
                  <li>2. 通过状态和类型条件筛选目标用户</li>
                  <li>3. 编写邮件内容，预览发送数量</li>
                  <li>4. 确认后批量发送，系统会显示发送结果</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="card-neon p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">新闻管理</h3>
            <p className="text-slate-600">新闻管理功能开发中...</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <SettingsPanel />
        )}

      

        {activeTab === 'users' && isSuperAdmin() && (
          <div className="bg-white rounded-lg shadow-sm">
            <UserManagement />
          </div>
        )}

        {activeTab === 'fields' && isSuperAdmin() && (
          <div className="bg-white rounded-lg shadow-sm">
            <FieldManagement />
          </div>
        )}

        {activeTab === 'emails' && isSuperAdmin() && (
          <div className="bg-white rounded-lg shadow-sm">
            <EmailManagement />
          </div>
        )}

        {activeTab === 'logs' && hasPermission('logs.view') && (
          <div className="bg-white rounded-lg shadow-sm">
            <LogManagement />
          </div>
        )}

        {activeTab === 'halo' && hasPermission('halo.view') && (
          <div className="bg-white rounded-lg shadow-sm">
            <HaloManagement />
          </div>
        )}

        {activeTab === 'health' && hasPermission('logs.view') && (
          <div className="bg-white rounded-lg shadow-sm">
            <HealthCheck />
          </div>
        )}
      </div>
      
      {/* 调试面板 */}
      {showDataPanels && <DebugPanel />}

      {/* 批量邮件模态框 */}
      <BulkEmailModal
        isOpen={showBulkEmailModal}
        onClose={() => setShowBulkEmailModal(false)}
        onSuccess={() => {
          setShowBulkEmailModal(false)
          if (activeTab === 'registrations') {
            refetchRegistrations()
          }
        }}
      />
    </div>
  )
}

export default AdminDashboard
