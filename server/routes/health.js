const express = require('express')
const router = express.Router()
const healthCheckService = require('../services/healthCheckService')
const auth = require('../middleware/auth')

// 公开的基础健康检查端点（不需要认证）
router.get('/status', async (req, res) => {
  try {
    const basicStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development'
    }
    
    res.json({
      success: true,
      data: basicStatus
    })
  } catch (error) {
    console.error('健康状态检查失败:', error)
    res.status(500).json({
      success: false,
      message: '健康状态检查失败',
      error: error.message
    })
  }
})

// 详细健康检查（需要管理员权限）
router.get('/check', auth.authenticate, auth.requirePermission('logs.view'), async (req, res) => {
  try {
    const results = await healthCheckService.runAllChecks()
    
    // 总是返回200状态码，让前端根据数据内容判断状态
    const httpStatus = 200
    
    res.status(httpStatus).json({
      success: true,
      data: results
    })
  } catch (error) {
    console.error('详细健康检查失败:', error)
    res.status(500).json({
      success: false,
      message: '健康检查失败',
      error: error.message
    })
  }
})

// 单项检查
router.get('/check/:checkName', auth.authenticate, auth.requirePermission('logs.view'), async (req, res) => {
  try {
    const { checkName } = req.params
    const result = await healthCheckService.runCheck(checkName)
    
    // 总是返回200状态码，让前端根据数据内容判断状态
    const httpStatus = 200
    
    res.status(httpStatus).json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error(`单项健康检查失败 (${req.params.checkName}):`, error)
    res.status(500).json({
      success: false,
      message: error.message.includes('未知的检查项') ? error.message : '健康检查失败',
      error: error.message
    })
  }
})

// 获取系统信息
router.get('/system', auth.authenticate, auth.requirePermission('logs.view'), async (req, res) => {
  try {
    const systemInfo = healthCheckService.getSystemInfo()
    
    res.json({
      success: true,
      data: systemInfo
    })
  } catch (error) {
    console.error('获取系统信息失败:', error)
    res.status(500).json({
      success: false,
      message: '获取系统信息失败',
      error: error.message
    })
  }
})

// 获取可用的检查项列表
router.get('/checks', auth.authenticate, auth.requirePermission('logs.view'), (req, res) => {
  try {
    const availableChecks = {
      database: {
        name: '数据库连接',
        description: '检查MySQL数据库连接状态和表结构'
      },
      feishu: {
        name: '飞书服务',
        description: '检查飞书API连接和多维表格访问'
      },
      email: {
        name: '邮件服务',
        description: '检查SMTP邮件服务连接状态'
      },
      rss: {
        name: 'RSS源',
        description: '检查RSS新闻源的可访问性'
      },
      halo: {
        name: 'Halo博客',
        description: '检查Halo博客API连接状态'
      },
      filesystem: {
        name: '文件系统',
        description: '检查关键文件和目录的存在性'
      },
      memory: {
        name: '内存使用',
        description: '检查Node.js进程内存使用情况'
      },
      diskSpace: {
        name: '磁盘空间',
        description: '检查服务器磁盘空间使用情况'
      }
    }
    
    res.json({
      success: true,
      data: availableChecks
    })
  } catch (error) {
    console.error('获取检查项列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取检查项列表失败',
      error: error.message
    })
  }
})

module.exports = router
