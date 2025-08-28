import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

const defaultTheme = {
  // 背景设置
  backgroundColor: '#F8FAFC', // slate-50 - 非常浅的蓝灰色背景
  backgroundImage: null,
  
  // 卡片设置
  cardBackgroundColor: '#FFFFFF', // 纯白色卡片
  cardBorderColor: '#CBD5E1', // slate-300 - 清晰的边框
  
  // 字体颜色设置
  primaryTextColor: '#1E293B', // slate-800 - 深色主文本，高对比度
  secondaryTextColor: '#475569', // slate-600 - 次要文本
  titleTextColor: '#0F172A', // slate-900 - 最深色标题
  
  // 标题设置
  titleShadowColor: 'rgba(0,0,0,0.1)',
  
  // 品牌设置
    siteName: '中春晚一站通办平台',
  siteSubtitle: 'United Portal',
  siteDescription: '中春晚通办一站式平台 · 让创作更简单',
  logoUrl: '/icon.png',
  logoUrlDark: '/footer-logo.png',
  
  // 页脚设置
  footerBackgroundColor: '#F1F5F9', // slate-100 - 浅色页脚背景
  footerTextColor: '#334155', // slate-700 - 深色页脚文本
  footerCopyright: 'Made with ❤️ by 中春晚团队 © 2024',
  footerLinks: [
    { name: '节目报名', url: '/register' },
    { name: '报名查询', url: '/query' },
    { name: '新闻中心', url: '/news' }
  ],
  footerContact: {
    email: 'contact@zhongchunwan.com',
    github: 'https://github.com/zhongchunwan'
  }
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(defaultTheme)
  const [isLoading, setIsLoading] = useState(true)

  // 从服务器加载主题设置
  useEffect(() => {
    loadThemeFromServer()
  }, [])

  const loadThemeFromServer = async () => {
    try {
      const response = await fetch('/api/theme')
      if (response.ok) {
        const serverTheme = await response.json()
        setTheme(prev => ({ ...prev, ...serverTheme }))
      }
    } catch (error) {
      console.log('使用默认主题设置')
    } finally {
      setIsLoading(false)
    }
  }

  const updateTheme = async (updates) => {
    const newTheme = { ...theme, ...updates }
    setTheme(newTheme)
    
    try {
      await fetch('/api/theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTheme)
      })
    } catch (error) {
      console.error('保存主题设置失败:', error)
    }
  }

  const resetTheme = () => {
    setTheme(defaultTheme)
    updateTheme(defaultTheme)
  }

  const uploadImage = async (file, type) => {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('type', type) // 'background' 或 'logo'
    
    try {
      const response = await fetch('/api/upload-theme-image', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const { imageUrl } = await response.json()
        if (type === 'background') {
          updateTheme({ backgroundImage: imageUrl })
        } else if (type === 'logo') {
          updateTheme({ logoUrl: imageUrl })
        }
        return imageUrl
      }
    } catch (error) {
      console.error('图片上传失败:', error)
      throw error
    }
  }

  const value = {
    theme,
    updateTheme,
    resetTheme,
    uploadImage,
    isLoading
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
