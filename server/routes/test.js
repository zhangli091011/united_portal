const express = require('express')
const emailService = require('../services/emailService')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()

// 发送测试邮件 (需要管理员权限)
router.post('/email', authenticateToken, async (req, res) => {
  try {
    const { recipientEmail } = req.body
    
    if (!recipientEmail) {
      return res.status(400).json({ message: '收件人邮箱不能为空' })
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({ message: '邮箱格式不正确' })
    }

    // 检查邮件服务是否配置
    if (!emailService.isConfigured()) {
      return res.status(500).json({ message: '邮件服务未配置' })
    }

    // 发送测试邮件
    const result = await emailService.sendTestEmail(recipientEmail)
    
    if (result.success) {
      res.json({
        message: '测试邮件发送成功',
        data: {
          recipient: result.recipient,
          messageId: result.messageId
        }
      })
    } else {
      res.status(500).json({
        message: '测试邮件发送失败',
        error: result.error
      })
    }
  } catch (error) {
    console.error('发送测试邮件失败:', error)
    res.status(500).json({ 
      message: '发送测试邮件失败',
      error: error.message
    })
  }
})

// 验证邮件服务配置
router.get('/email/config', authenticateToken, async (req, res) => {
  try {
    const isConfigured = emailService.isConfigured()
    const connectionStatus = await emailService.verifyConnection()
    
    res.json({
      message: '邮件服务状态',
      data: {
        configured: isConfigured,
        connected: connectionStatus,
        status: isConfigured && connectionStatus ? 'ready' : 'not_ready'
      }
    })
  } catch (error) {
    console.error('检查邮件服务状态失败:', error)
    res.status(500).json({ 
      message: '检查邮件服务状态失败',
      error: error.message
    })
  }
})

module.exports = router
