const express = require('express')
const { authenticateToken, requirePermission } = require('../middleware/auth')
const settingsService = require('../services/settingsService')

const router = express.Router()

// 获取所有设置 (需要管理员权限)
router.get('/', authenticateToken, requirePermission('settings.manage'), async (req, res) => {
  try {
    const settings = await settingsService.getSettings()
    
    res.json({
      message: '获取成功',
      data: settings
    })
  } catch (error) {
    console.error('获取设置失败:', error)
    res.status(500).json({ 
      message: '获取设置失败' 
    })
  }
})

// 更新设置 (需要管理员权限)
router.put('/', authenticateToken, requirePermission('settings.manage'), async (req, res) => {
  try {
    const updates = req.body
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ message: '无效的设置数据' })
    }
    
    const updatedSettings = await settingsService.updateSettings(updates)
    
    res.json({
      message: '更新成功',
      data: updatedSettings
    })
  } catch (error) {
    console.error('更新设置失败:', error)
    res.status(500).json({ 
      message: error.message || '更新设置失败' 
    })
  }
})

// 获取调试设置 (需要管理员权限)
router.get('/debug', authenticateToken, async (req, res) => {
  try {
    const debugSettings = await settingsService.getDebugSettings()
    
    res.json({
      message: '获取成功',
      data: debugSettings
    })
  } catch (error) {
    console.error('获取调试设置失败:', error)
    res.status(500).json({ 
      message: '获取调试设置失败' 
    })
  }
})

// 更新调试设置 (需要管理员权限)
router.put('/debug', authenticateToken, requirePermission('settings.manage'), async (req, res) => {
  try {
    const debugSettings = req.body
    
    if (!debugSettings || typeof debugSettings !== 'object') {
      return res.status(400).json({ message: '无效的调试设置数据' })
    }
    
    const updatedSettings = await settingsService.updateDebugSettings(debugSettings)
    
    res.json({
      message: '更新成功',
      data: updatedSettings.debug
    })
  } catch (error) {
    console.error('更新调试设置失败:', error)
    res.status(500).json({ 
      message: error.message || '更新调试设置失败' 
    })
  }
})

// 重置设置 (需要管理员权限)
router.post('/reset', authenticateToken, async (req, res) => {
  try {
    const defaultSettings = await settingsService.resetSettings()
    
    res.json({
      message: '重置成功',
      data: defaultSettings
    })
  } catch (error) {
    console.error('重置设置失败:', error)
    res.status(500).json({ 
      message: error.message || '重置设置失败' 
    })
  }
})

// 备份设置 (需要管理员权限)
router.post('/backup', authenticateToken, async (req, res) => {
  try {
    const backupFile = await settingsService.backupSettings()
    
    res.json({
      message: '备份成功',
      data: {
        backupFile: backupFile,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('备份设置失败:', error)
    res.status(500).json({ 
      message: error.message || '备份设置失败' 
    })
  }
})

// 获取公开的调试设置状态 (无需认证)
router.get('/debug/public', async (req, res) => {
  try {
    const debugSettings = await settingsService.getDebugSettings()
    
    // 只返回前端需要的基本信息
    res.json({
      message: '获取成功',
      data: {
        showDebugInfo: debugSettings.showDebugInfo,
        showDataPanels: debugSettings.showDataPanels
      }
    })
  } catch (error) {
    console.error('获取公开调试设置失败:', error)
    res.status(500).json({ 
      message: '获取调试设置失败' 
    })
  }
})

module.exports = router
