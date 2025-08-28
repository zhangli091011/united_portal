import { useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'

const ThemeApplier = ({ children }) => {
  const { theme, isLoading } = useTheme()

  useEffect(() => {
    if (isLoading) return

    // 应用背景颜色
    document.body.style.backgroundColor = theme.backgroundColor
    
    // 应用背景图片
    if (theme.backgroundImage) {
      document.body.style.backgroundImage = `url(${theme.backgroundImage})`
      document.body.style.backgroundSize = theme.backgroundSize || 'cover'
      document.body.style.backgroundPosition = 'center'
      document.body.style.backgroundRepeat = 'no-repeat'
      document.body.style.backgroundAttachment = 'fixed'
    } else {
      document.body.style.backgroundImage = 'none'
    }

    // 创建动态CSS样式
    const styleId = 'dynamic-theme-styles'
    let styleElement = document.getElementById(styleId)
    
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }

    // 生成CSS变量和样式
    styleElement.textContent = `
      :root {
        --theme-background-color: ${theme.backgroundColor};
        --theme-card-background: ${theme.cardBackgroundColor};
        --theme-card-border: ${theme.cardBorderColor};
        --theme-primary-text: ${theme.primaryTextColor};
        --theme-secondary-text: ${theme.secondaryTextColor};
        --theme-title-text: ${theme.titleTextColor};
        --theme-footer-background: ${theme.footerBackgroundColor};
        --theme-footer-text: ${theme.footerTextColor};
      }

      .theme-card {
        background: linear-gradient(135deg, ${theme.cardBackgroundColor} 0%, ${adjustColorOpacity(theme.cardBackgroundColor, 0.8)} 100%) !important;
        border-color: ${theme.cardBorderColor} !important;
      }

      .theme-primary-text {
        color: ${theme.primaryTextColor} !important;
        font-family: "SimHei", "Microsoft YaHei", "PingFang SC", sans-serif !important;
      }

      .theme-secondary-text {
        color: ${theme.secondaryTextColor} !important;
        font-family: "SimHei", "Microsoft YaHei", "PingFang SC", sans-serif !important;
      }

      .theme-title-text {
        color: ${theme.titleTextColor} !important;
        text-shadow: 2px 2px 4px ${theme.titleShadowColor} !important;
        font-family: "DingTalk JinBuTi", "PingFang SC", "Microsoft YaHei", sans-serif !important;
      }

      .theme-footer {
        background-color: ${theme.footerBackgroundColor} !important;
      }

      .theme-footer-text {
        color: ${theme.footerTextColor} !important;
      }

      /* 动态卡片样式 */
      .card-neon {
        background: ${theme.cardBackgroundColor} !important;
        border: 2px solid ${theme.cardBorderColor} !important;
        box-shadow: 
          0 4px 6px -1px rgba(0, 0, 0, 0.1),
          0 2px 4px -1px rgba(0, 0, 0, 0.06),
          inset 0 1px 0 rgba(255, 255, 255, 1) !important;
        transition: all 0.3s ease !important;
      }

      .card-neon:hover {
        border-color: #3B82F6 !important;
        box-shadow: 
          0 10px 15px -3px rgba(0, 0, 0, 0.1),
          0 4px 6px -2px rgba(0, 0, 0, 0.05),
          0 0 0 3px rgba(59, 130, 246, 0.1) !important;
        transform: translateY(-2px) !important;
      }

      /* 按钮样式优化 */
      .btn-primary {
        background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%) !important;
        border: none !important;
        box-shadow: 
          0 4px 6px -1px rgba(0, 0, 0, 0.1),
          0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
      }

      .btn-primary:hover {
        background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
        box-shadow: 
          0 10px 15px -3px rgba(0, 0, 0, 0.1),
          0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
      }
    `

    return () => {
      // 清理函数
      document.body.style.backgroundColor = ''
      document.body.style.backgroundImage = ''
      document.body.style.backgroundSize = ''
      document.body.style.backgroundPosition = ''
      document.body.style.backgroundRepeat = ''
      document.body.style.backgroundAttachment = ''
    }
  }, [theme, isLoading])

  // 辅助函数：调整颜色透明度
  function adjustColorOpacity(color, opacity) {
    if (!color) return 'rgba(0,0,0,0.1)'
    
    // 如果是十六进制颜色
    if (color.startsWith('#')) {
      const hex = color.replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16)
      const g = parseInt(hex.substr(2, 2), 16)
      const b = parseInt(hex.substr(4, 2), 16)
      return `rgba(${r}, ${g}, ${b}, ${opacity})`
    }
    
    // 如果已经是rgba格式
    if (color.startsWith('rgba')) {
      return color.replace(/[\d\.]+\)$/g, `${opacity})`)
    }
    
    // 如果是rgb格式
    if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`)
    }
    
    return color
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary-orange border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return children
}

export default ThemeApplier
