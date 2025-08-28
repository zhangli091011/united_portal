import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsAPI } from '../../services/api'
import { useDebug } from '../../contexts/DebugContext'
import { 
  Settings, 
  Bug, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Save, 
  RotateCcw,
  Database,
  Palette,
  Bell
} from 'lucide-react'
import LoadingSpinner from '../UI/LoadingSpinner'
import toast from 'react-hot-toast'

const SettingsPanel = () => {
  const [activeSection, setActiveSection] = useState('debug')
  const { debugSettings, updateDebugSettings, refreshSettings } = useDebug()
  const queryClient = useQueryClient()

  // 获取完整设置
  const { data: settingsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: settingsAPI.getAll,
    onError: (error) => {
      console.error('获取设置失败:', error)
      toast.error('获取设置失败')
    }
  })

  // 更新设置
  const updateMutation = useMutation({
    mutationFn: settingsAPI.update,
    onSuccess: () => {
      toast.success('设置已保存')
      queryClient.invalidateQueries('admin-settings')
      refreshSettings() // 刷新全局调试设置
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '保存设置失败')
    }
  })

  // 重置设置
  const resetMutation = useMutation({
    mutationFn: settingsAPI.reset,
    onSuccess: () => {
      toast.success('设置已重置')
      queryClient.invalidateQueries('admin-settings')
      refreshSettings()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '重置设置失败')
    }
  })

  // 备份设置
  const backupMutation = useMutation({
    mutationFn: settingsAPI.backup,
    onSuccess: (data) => {
      toast.success('设置已备份')
      console.log('备份文件:', data.data.backupFile)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || '备份设置失败')
    }
  })

  const settings = settingsData?.data?.data || {}

  const handleDebugUpdate = async (field, value) => {
    try {
      const newDebugSettings = {
        ...debugSettings,
        [field]: value
      }
      await updateDebugSettings(newDebugSettings)
      toast.success('调试设置已更新')
    } catch (error) {
      toast.error('更新调试设置失败')
    }
  }

  const handleSettingsUpdate = (section, field, value) => {
    const newSettings = {
      ...settings,
      [section]: {
        ...settings[section],
        [field]: value
      }
    }
    updateMutation.mutate(newSettings)
  }

  const handleReset = () => {
    if (window.confirm('确定要重置所有设置为默认值吗？此操作不可撤销。')) {
      resetMutation.mutate()
    }
  }

  const sections = [
    { id: 'debug', label: '调试设置', icon: Bug },
    { id: 'ui', label: '界面设置', icon: Palette },
    { id: 'system', label: '系统设置', icon: Settings }
  ]

  if (isLoading) {
    return (
      <div className="card-neon p-8 text-center">
        <LoadingSpinner size="large" />
        <p className="text-gray-400 mt-4">加载设置中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="text-primary-orange" size={24} />
          <h2 className="text-2xl font-bold text-slate-800">系统设置</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="btn-secondary flex items-center space-x-2"
            disabled={isLoading}
          >
            <RefreshCw size={16} />
            <span>刷新</span>
          </button>
          <button
            onClick={() => backupMutation.mutate()}
            className="btn-secondary flex items-center space-x-2"
            disabled={backupMutation.isLoading}
          >
            <Database size={16} />
            <span>备份</span>
          </button>
          <button
            onClick={handleReset}
            className="btn-secondary flex items-center space-x-2 text-red-400 hover:text-red-300"
            disabled={resetMutation.isLoading}
          >
            <RotateCcw size={16} />
            <span>重置</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 侧边栏导航 */}
        <div className="lg:col-span-1">
          <div className="card-neon p-4">
            <nav className="space-y-2">
              {sections.map((section) => {
                const IconComponent = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    <IconComponent size={20} />
                    <span>{section.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* 设置内容 */}
        <div className="lg:col-span-3">
          <div className="card-neon p-6">
            {activeSection === 'debug' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Bug className="text-primary-orange" size={20} />
                  <h3 className="text-lg font-semibold text-slate-800">调试设置</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-primary-dark-secondary rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">显示调试信息</h4>
                      <p className="text-gray-400 text-sm">在页面上显示调试面板和信息</p>
                    </div>
                    <button
                      onClick={() => handleDebugUpdate('showDebugInfo', !debugSettings.showDebugInfo)}
                      className={`p-2 rounded-lg transition-colors ${
                        debugSettings.showDebugInfo 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      {debugSettings.showDebugInfo ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-primary-dark-secondary rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">显示数据面板</h4>
                      <p className="text-gray-400 text-sm">显示详细的数据调试面板</p>
                    </div>
                    <button
                      onClick={() => handleDebugUpdate('showDataPanels', !debugSettings.showDataPanels)}
                      className={`p-2 rounded-lg transition-colors ${
                        debugSettings.showDataPanels 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      {debugSettings.showDataPanels ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-primary-dark-secondary rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">控制台日志</h4>
                      <p className="text-gray-400 text-sm">在浏览器控制台输出调试日志</p>
                    </div>
                    <button
                      onClick={() => handleSettingsUpdate('debug', 'enableConsoleLog', !settings.debug?.enableConsoleLog)}
                      className={`p-2 rounded-lg transition-colors ${
                        settings.debug?.enableConsoleLog 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      {settings.debug?.enableConsoleLog ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'ui' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Palette className="text-primary-orange" size={20} />
                  <h3 className="text-lg font-semibold text-white">界面设置</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-primary-dark-secondary rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">主题模式</h4>
                      <p className="text-gray-400 text-sm">选择界面主题</p>
                    </div>
                    <select
                      value={settings.ui?.theme || 'dark'}
                      onChange={(e) => handleSettingsUpdate('ui', 'theme', e.target.value)}
                      className="input-neon"
                    >
                      <option value="dark">深色主题</option>
                      <option value="light">浅色主题</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-primary-dark-secondary rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">启用动画</h4>
                      <p className="text-gray-400 text-sm">开启界面动画效果</p>
                    </div>
                    <button
                      onClick={() => handleSettingsUpdate('ui', 'enableAnimations', !settings.ui?.enableAnimations)}
                      className={`p-2 rounded-lg transition-colors ${
                        settings.ui?.enableAnimations 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      {settings.ui?.enableAnimations ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'system' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Settings className="text-primary-orange" size={20} />
                  <h3 className="text-lg font-semibold text-white">系统设置</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-primary-dark-secondary rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">自动刷新间隔</h4>
                      <p className="text-gray-400 text-sm">数据自动刷新的时间间隔（毫秒）</p>
                    </div>
                    <input
                      type="number"
                      value={settings.system?.autoRefreshInterval || 30000}
                      onChange={(e) => handleSettingsUpdate('system', 'autoRefreshInterval', parseInt(e.target.value))}
                      className="input-neon w-32"
                      min="5000"
                      max="300000"
                      step="5000"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-primary-dark-secondary rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">启用通知</h4>
                      <p className="text-gray-400 text-sm">开启系统通知提醒</p>
                    </div>
                    <button
                      onClick={() => handleSettingsUpdate('system', 'enableNotifications', !settings.system?.enableNotifications)}
                      className={`p-2 rounded-lg transition-colors ${
                        settings.system?.enableNotifications 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      {settings.system?.enableNotifications ? <Bell size={20} /> : <EyeOff size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
