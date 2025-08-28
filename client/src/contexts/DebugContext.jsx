import { createContext, useContext, useState, useEffect } from 'react'
import { settingsAPI } from '../services/api'

const DebugContext = createContext()

export const useDebug = () => {
  const context = useContext(DebugContext)
  if (!context) {
    throw new Error('useDebug must be used within a DebugProvider')
  }
  return context
}

export const DebugProvider = ({ children }) => {
  const [debugSettings, setDebugSettings] = useState({
    showDebugInfo: false,
    showDataPanels: false
  })
  const [loading, setLoading] = useState(true)

  // 获取调试设置
  const fetchDebugSettings = async () => {
    try {
      setLoading(true)
      const response = await settingsAPI.getDebugPublic()
      setDebugSettings(response.data.data)
    } catch (error) {
      console.error('获取调试设置失败:', error)
      // 使用默认设置
      setDebugSettings({
        showDebugInfo: false,
        showDataPanels: false
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDebugSettings()
  }, [])

  // 管理员更新调试设置
  const updateDebugSettings = async (newSettings) => {
    try {
      const response = await settingsAPI.updateDebug(newSettings)
      setDebugSettings(response.data.data)
      return response.data.data
    } catch (error) {
      console.error('更新调试设置失败:', error)
      throw error
    }
  }

  // 刷新设置
  const refreshSettings = () => {
    fetchDebugSettings()
  }

  const value = {
    debugSettings,
    loading,
    updateDebugSettings,
    refreshSettings,
    // 便捷的检查方法
    isDebugMode: debugSettings.showDebugInfo,
    showDataPanels: debugSettings.showDataPanels,
  }

  return (
    <DebugContext.Provider value={value}>
      {children}
    </DebugContext.Provider>
  )
}

export default DebugContext
