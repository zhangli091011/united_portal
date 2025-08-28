const fs = require('fs').promises
const path = require('path')

class SettingsService {
  constructor() {
    this.settingsFile = path.join(__dirname, '../data/settings.json')
    this.defaultSettings = {
      debug: {
        showDebugInfo: false,
        enableConsoleLog: true,
        showDataPanels: false
      },
      ui: {
        theme: 'dark',
        enableAnimations: true
      },
      system: {
        autoRefreshInterval: 30000,
        enableNotifications: true
      }
    }
    this.initializeSettings()
  }

  async initializeSettings() {
    try {
      // 确保data目录存在
      const dataDir = path.dirname(this.settingsFile)
      await fs.mkdir(dataDir, { recursive: true })
      
      // 检查设置文件是否存在
      try {
        await fs.access(this.settingsFile)
      } catch {
        // 文件不存在，创建默认设置
        await this.saveSettings(this.defaultSettings)
        console.log('✅ 已创建默认设置文件')
      }
    } catch (error) {
      console.error('初始化设置失败:', error)
    }
  }

  async getSettings() {
    try {
      const data = await fs.readFile(this.settingsFile, 'utf8')
      const settings = JSON.parse(data)
      
      // 合并默认设置，确保所有必要字段都存在
      return this.mergeWithDefaults(settings)
    } catch (error) {
      console.error('读取设置失败:', error)
      return this.defaultSettings
    }
  }

  async saveSettings(settings) {
    try {
      const mergedSettings = this.mergeWithDefaults(settings)
      await fs.writeFile(this.settingsFile, JSON.stringify(mergedSettings, null, 2))
      console.log('✅ 设置已保存')
      return mergedSettings
    } catch (error) {
      console.error('保存设置失败:', error)
      throw new Error('保存设置失败')
    }
  }

  async updateSettings(updates) {
    try {
      const currentSettings = await this.getSettings()
      const newSettings = this.deepMerge(currentSettings, updates)
      return await this.saveSettings(newSettings)
    } catch (error) {
      console.error('更新设置失败:', error)
      throw new Error('更新设置失败')
    }
  }

  async getDebugSettings() {
    const settings = await this.getSettings()
    return settings.debug
  }

  async updateDebugSettings(debugSettings) {
    return await this.updateSettings({ debug: debugSettings })
  }

  mergeWithDefaults(settings) {
    return this.deepMerge(this.defaultSettings, settings || {})
  }

  deepMerge(target, source) {
    const result = { ...target }
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }
    
    return result
  }

  // 重置为默认设置
  async resetSettings() {
    try {
      await this.saveSettings(this.defaultSettings)
      console.log('✅ 已重置为默认设置')
      return this.defaultSettings
    } catch (error) {
      console.error('重置设置失败:', error)
      throw new Error('重置设置失败')
    }
  }

  // 备份设置
  async backupSettings() {
    try {
      const settings = await this.getSettings()
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFile = path.join(path.dirname(this.settingsFile), `settings-backup-${timestamp}.json`)
      
      await fs.writeFile(backupFile, JSON.stringify(settings, null, 2))
      console.log('✅ 设置已备份到:', backupFile)
      return backupFile
    } catch (error) {
      console.error('备份设置失败:', error)
      throw new Error('备份设置失败')
    }
  }
}

module.exports = new SettingsService()
