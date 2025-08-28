const express = require('express')
const { authenticateToken, requirePermission } = require('../middleware/auth')
const logService = require('../services/logService')
const { autoLogOperation } = require('../middleware/logging')

const router = express.Router()

// 应用操作日志中间件
router.use(authenticateToken, autoLogOperation('logs'))

// 获取登录日志
router.get('/login', requirePermission('logs.view'), async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      userId,
      username,
      status,
      loginType,
      startDate,
      endDate
    } = req.query

    const options = {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      userId,
      username,
      status,
      loginType,
      startDate,
      endDate
    }

    const result = await logService.getLoginLogs(options)

    res.json({
      message: '获取登录日志成功',
      data: result
    })
  } catch (error) {
    console.error('获取登录日志失败:', error)
    res.status(500).json({ 
      message: error.message || '获取登录日志失败' 
    })
  }
})

// 获取操作日志
router.get('/operation', requirePermission('logs.view'), async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      userId,
      username,
      action,
      resource,
      status,
      startDate,
      endDate
    } = req.query

    const options = {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      userId,
      username,
      action,
      resource,
      status,
      startDate,
      endDate
    }

    const result = await logService.getOperationLogs(options)

    res.json({
      message: '获取操作日志成功',
      data: result
    })
  } catch (error) {
    console.error('获取操作日志失败:', error)
    res.status(500).json({ 
      message: error.message || '获取操作日志失败' 
    })
  }
})

// 获取日志统计信息
router.get('/stats', requirePermission('logs.view'), async (req, res) => {
  try {
    const { days = 7 } = req.query
    const stats = await logService.getLogStats(parseInt(days))

    res.json({
      message: '获取日志统计成功',
      data: stats
    })
  } catch (error) {
    console.error('获取日志统计失败:', error)
    res.status(500).json({ 
      message: error.message || '获取日志统计失败' 
    })
  }
})

// 清理旧日志 (只有超级管理员可以执行)
router.post('/cleanup', requirePermission('logs.cleanup'), async (req, res) => {
  try {
    const { retentionDays = 90 } = req.body

    if (retentionDays < 7) {
      return res.status(400).json({
        message: '保留天数不能少于7天'
      })
    }

    const result = await logService.cleanupOldLogs(parseInt(retentionDays))

    res.json({
      message: `日志清理完成，删除了 ${result.deletedLoginLogs + result.deletedOperationLogs} 条记录`,
      data: result
    })
  } catch (error) {
    console.error('清理日志失败:', error)
    res.status(500).json({ 
      message: error.message || '清理日志失败' 
    })
  }
})

// 导出日志 (可扩展功能)
router.get('/export', requirePermission('logs.export'), async (req, res) => {
  try {
    const { type = 'login', format = 'json', ...options } = req.query

    let result
    if (type === 'login') {
      result = await logService.getLoginLogs({
        ...options,
        page: 1,
        pageSize: 10000 // 导出大量数据
      })
    } else {
      result = await logService.getOperationLogs({
        ...options,
        page: 1,
        pageSize: 10000
      })
    }

    if (format === 'csv') {
      // 可以扩展CSV导出功能
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${type}_logs.csv"`)
      // TODO: 实现CSV格式转换
      res.send('CSV format not implemented yet')
    } else {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="${type}_logs.json"`)
      res.json(result)
    }
  } catch (error) {
    console.error('导出日志失败:', error)
    res.status(500).json({ 
      message: error.message || '导出日志失败' 
    })
  }
})

module.exports = router



