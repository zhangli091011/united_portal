import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  UserPlus, 
  Search, 
  Shield, 
  Newspaper, 
  MessageCircle,
  Upload,
  Settings,
  Activity,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { statsAPI } from '../services/api'

const HomePage = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  
  // 获取公开统计数据
  const { data: statsData, isLoading: isStatsLoading, error: statsError } = useQuery({
    queryKey: ['publicStats'],
    queryFn: async () => {
      const response = await statsAPI.getPublicStats()
      return response.data.data
    },
    refetchInterval: 60000, // 每分钟刷新一次
    retry: 3,
    staleTime: 30000, // 30秒内认为数据是新鲜的
  })

  const mainCards = [
    {
      id: 'register',
      title: '报名',
      subtitle: '提交你的项目',
      description: '提交你的项目。',
      icon: Upload,
      link: '/register',
      color: 'from-blue-500 to-indigo-600',
      featured: true
    },
    {
      id: 'query',
      title: '申请状态查询',
      subtitle: '查看你的申请状态',
      description: '查看你的申请状态。',
      icon: Search,
      link: '/query',
      color: 'from-blue-500 to-cyan-500'
    }
  ]

  const secondaryCards = [
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-7xl mx-auto text-center space-y-12">
          {/* Header */}
          <div className="space-y-6">
            <div className="flex items-center justify-center space-x-4 mb-8">
              {theme.logoUrl ? (
                <img 
                  src={theme.logoUrl} 
                  alt="Logo" 
                  className="w-16 h-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">{theme.siteName?.charAt(0) || '中'}</span>
                </div>
              )}
              <div className="text-right">
                <h1 className="text-4xl md:text-6xl font-bold theme-title-text">
                  {theme.siteName || '中春晚'}
                </h1>
                <p className="theme-primary-text text-lg">{theme.siteSubtitle || 'United Portal'}</p>
              </div>
            </div>
            
            <p className="text-xl md:text-2xl theme-primary-text max-w-3xl mx-auto font-semibold">
              {theme.siteDescription || '中春晚一站式平台 · 让创作更简单'}
            </p>
          </div>

          {/* User Profile Card */}


          {/* Main Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {mainCards.map((card) => {
              const IconComponent = card.icon
              return (
                <Link
                  key={card.id}
                  to={card.link}
                  className={`group card-neon p-8 space-y-4 ${
                    card.featured ? 'md:col-span-1' : ''
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <div className={`w-20 h-20 bg-gradient-to-br ${card.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="text-white" size={32} />
                    </div>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold theme-title-text group-hover:opacity-80 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-blue-600 font-medium">
                      {card.subtitle}
                    </p>
                    <p className="theme-secondary-text font-medium">
                      {card.description}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Secondary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {secondaryCards.map((card) => {
              const IconComponent = card.icon
              const isDisabled = card.disabled
              
              const CardContent = (
                <div className={`card-neon p-6 space-y-4 ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' : 'group'
                }`}>
                  <div className="flex items-center justify-center">
                    <div className={`w-16 h-16 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center ${
                      !isDisabled ? 'group-hover:scale-110' : ''
                    } transition-transform duration-300`}>
                      <IconComponent className="text-white" size={24} />
                    </div>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h3 className={`text-xl font-bold ${
                      !isDisabled ? 'theme-title-text group-hover:opacity-80' : 'text-gray-400'
                    } transition-colors`}>
                      {card.title}
                    </h3>
                    <p className={`font-medium ${
                      isDisabled ? 'text-gray-500' : 'text-blue-600'
                    }`}>
                      {card.subtitle}
                    </p>
                    <p className="theme-secondary-text text-sm font-medium">
                      {card.description}
                    </p>
                  </div>
                </div>
              )

              return isDisabled ? (
                <div key={card.id}>
                  {CardContent}
                </div>
              ) : (
                <Link key={card.id} to={card.link}>
                  {CardContent}
                </Link>
              )
            })}
          </div>

          {/* Status Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8">
            {/* 系统状态 */}
            <div className="card-neon p-4 text-center">
              {isStatsLoading ? (
                <RefreshCw className="mx-auto mb-2 text-gray-400 animate-spin" size={24} />
              ) : statsError ? (
                <AlertCircle className="mx-auto mb-2 text-red-500" size={24} />
              ) : (
                <Activity 
                  className={`mx-auto mb-2 ${
                    statsData?.systemStatus?.status === 'online' 
                      ? 'text-emerald-500' 
                      : 'text-red-500'
                  }`} 
                  size={24} 
                />
              )}
              <p className="text-sm theme-secondary-text font-semibold">系统状态</p>
              <p className={`font-bold ${
                isStatsLoading 
                  ? 'text-gray-400' 
                  : statsError 
                    ? 'text-red-600' 
                    : statsData?.systemStatus?.status === 'online'
                      ? 'text-emerald-600'
                      : 'text-red-600'
              }`}>
                {isStatsLoading 
                  ? '加载中...' 
                  : statsError 
                    ? '连接失败' 
                    : statsData?.systemStatus?.message || '未知状态'
                }
              </p>
            </div>
            
            {/* 今日报名 */}
            <div className="card-neon p-4 text-center">
              <UserPlus className="mx-auto mb-2 text-blue-500" size={24} />
              <p className="text-sm theme-secondary-text font-semibold">今日报名</p>
              <p className="text-blue-600 font-bold">
                {isStatsLoading 
                  ? '...' 
                  : statsError 
                    ? '--' 
                    : statsData?.todayRegistrations || 0
                }
              </p>
            </div>
            
            
            {/* 最新公告 */}
            <div className="card-neon p-4 text-center">
              <Newspaper className="mx-auto mb-2 text-amber-500" size={24} />
              <p className="text-sm theme-secondary-text font-semibold">最新公告</p>
              <p className="text-amber-600 font-bold">
                {isStatsLoading 
                  ? '...' 
                  : statsError 
                    ? '--' 
                    : statsData?.newsCount || 0
                }
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
