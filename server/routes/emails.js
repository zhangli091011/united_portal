const express = require('express')
const { body, validationResult } = require('express-validator')
const { 
  authenticateToken, 
  requirePermission,
  requireSuperAdmin 
} = require('../middleware/auth')
const { autoLogOperation } = require('../middleware/logging')
const emailPoolService = require('../services/emailPoolService')

const router = express.Router()

// 获取邮箱池列表
router.get('/', authenticateToken, requirePermission('email.manage'), autoLogOperation('emails'), async (req, res) => {
  try {
    const emails = await emailPoolService.getAllEmails()
    const stats = await emailPoolService.getPoolStats()
    
    res.json({
      message: '获取邮箱池成功',
      data: {
        emails,
        stats,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('获取邮箱池失败:', error)
    res.status(500).json({ 
      message: error.message || '获取邮箱池失败' 
    })
  }
})

// 添加邮箱配置
router.post('/', 
  authenticateToken, 
  requireSuperAdmin, // 只有超级管理员可以添加邮箱
  [
    body('name')
      .notEmpty()
      .withMessage('邮箱名称不能为空')
      .isLength({ min: 1, max: 50 })
      .withMessage('邮箱名称长度必须在1-50字符之间'),
    body('host')
      .notEmpty()
      .withMessage('SMTP主机不能为空')
      .isLength({ min: 1, max: 100 })
      .withMessage('SMTP主机长度不能超过100字符'),
    body('port')
      .isInt({ min: 1, max: 65535 })
      .withMessage('端口必须是1-65535之间的整数'),
    body('user')
      .notEmpty()
      .withMessage('用户名不能为空')
      .isEmail()
      .withMessage('用户名必须是有效的邮箱地址'),
    body('password')
      .notEmpty()
      .withMessage('密码不能为空')
      .isLength({ min: 1, max: 200 })
      .withMessage('密码长度不能超过200字符'),
    body('from')
      .optional()
      .isEmail()
      .withMessage('发件人必须是有效的邮箱地址')
  ],
  async (req, res) => {
    try {
      // 验证输入
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: '输入验证失败',
          errors: errors.array()
        })
      }

      const emailConfig = req.body
      const newEmail = await emailPoolService.addEmail(emailConfig)
      
      console.log(`✅ 用户 ${req.user.username} 添加了新邮箱:`, newEmail.name)
      
      res.status(201).json({
        message: '添加邮箱成功',
        data: newEmail
      })
    } catch (error) {
      console.error('添加邮箱失败:', error)
      res.status(400).json({ 
        message: error.message || '添加邮箱失败' 
      })
    }
  }
)

// 更新邮箱配置
router.put('/:emailId', 
  authenticateToken, 
  requireSuperAdmin,
  [
    body('name')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('邮箱名称长度必须在1-50字符之间'),
    body('host')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('SMTP主机长度不能超过100字符'),
    body('port')
      .optional()
      .isInt({ min: 1, max: 65535 })
      .withMessage('端口必须是1-65535之间的整数'),
    body('user')
      .optional()
      .isEmail()
      .withMessage('用户名必须是有效的邮箱地址'),
    body('password')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('密码长度不能超过200字符'),
    body('from')
      .optional()
      .isEmail()
      .withMessage('发件人必须是有效的邮箱地址')
  ],
  async (req, res) => {
    try {
      // 验证输入
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: '输入验证失败',
          errors: errors.array()
        })
      }

      const { emailId } = req.params
      const updates = req.body
      
      const updatedEmail = await emailPoolService.updateEmail(emailId, updates)
      
      console.log(`✅ 用户 ${req.user.username} 更新了邮箱:`, updatedEmail.name)
      
      res.json({
        message: '更新邮箱成功',
        data: updatedEmail
      })
    } catch (error) {
      console.error('更新邮箱失败:', error)
      res.status(400).json({ 
        message: error.message || '更新邮箱失败' 
      })
    }
  }
)

// 删除邮箱配置
router.delete('/:emailId', 
  authenticateToken, 
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { emailId } = req.params
      const emailName = await emailPoolService.deleteEmail(emailId)
      
      console.log(`⚠️  用户 ${req.user.username} 删除了邮箱:`, emailName)
      
      res.json({
        message: '删除邮箱成功',
        data: { emailId, emailName }
      })
    } catch (error) {
      console.error('删除邮箱失败:', error)
      res.status(400).json({ 
        message: error.message || '删除邮箱失败' 
      })
    }
  }
)

// 启用/禁用邮箱
router.patch('/:emailId/toggle', 
  authenticateToken, 
  requirePermission('email.manage'),
  async (req, res) => {
    try {
      const { emailId } = req.params
      const result = await emailPoolService.toggleEmailStatus(emailId)
      
      console.log(`🔄 用户 ${req.user.username} ${result.active ? '启用' : '禁用'}了邮箱:`, result.name)
      
      res.json({
        message: `邮箱已${result.active ? '启用' : '禁用'}`,
        data: result
      })
    } catch (error) {
      console.error('切换邮箱状态失败:', error)
      res.status(400).json({ 
        message: error.message || '切换邮箱状态失败' 
      })
    }
  }
)

// 测试邮箱配置
router.post('/test', 
  authenticateToken, 
  requirePermission('email.manage'),
  [
    body('recipient')
      .notEmpty()
      .withMessage('收件人邮箱不能为空')
      .isEmail()
      .withMessage('收件人必须是有效的邮箱地址'),
    body('emailId')
      .optional()
      .isString()
      .withMessage('邮箱ID必须是字符串')
  ],
  async (req, res) => {
    try {
      // 验证输入
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: '输入验证失败',
          errors: errors.array()
        })
      }

      const { recipient, emailId } = req.body
      const result = await emailPoolService.testEmail(emailId, recipient)
      
      console.log(`📧 用户 ${req.user.username} 测试了邮箱:`, result.emailName)
      
      res.json({
        message: '邮箱测试成功',
        data: result
      })
    } catch (error) {
      console.error('邮箱测试失败:', error)
      res.status(400).json({ 
        message: error.message || '邮箱测试失败' 
      })
    }
  }
)

// 获取邮箱池统计信息
router.get('/stats', authenticateToken, requirePermission('email.manage'), async (req, res) => {
  try {
    const stats = await emailPoolService.getPoolStats()
    
    res.json({
      message: '获取统计信息成功',
      data: stats
    })
  } catch (error) {
    console.error('获取统计信息失败:', error)
    res.status(500).json({ 
      message: error.message || '获取统计信息失败' 
    })
  }
})

// 发送测试邮件到多个收件人
router.post('/bulk-test', 
  authenticateToken, 
  requirePermission('email.manage'),
  [
    body('recipients')
      .isArray({ min: 1, max: 10 })
      .withMessage('收件人列表必须是1-10个邮箱地址的数组'),
    body('recipients.*')
      .isEmail()
      .withMessage('所有收件人都必须是有效的邮箱地址'),
    body('subject')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('邮件主题长度不能超过200字符'),
    body('content')
      .optional()
      .isLength({ min: 1, max: 5000 })
      .withMessage('邮件内容长度不能超过5000字符')
  ],
  async (req, res) => {
    try {
      // 验证输入
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: '输入验证失败',
          errors: errors.array()
        })
      }

      const { recipients, subject = '批量邮件测试', content = '这是一封批量测试邮件。' } = req.body
      const results = []
      
      for (const recipient of recipients) {
        try {
          const mailOptions = {
            to: recipient,
            subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">📧 批量邮件测试</h2>
                <p>${content}</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p><strong>收件人:</strong> ${recipient}</p>
                  <p><strong>发送时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
                  <p><strong>发送者:</strong> ${req.user.username}</p>
                </div>
                <p style="color: #666; font-size: 14px;">
                  这是系统自动发送的测试邮件。
                </p>
              </div>
            `
          }
          
          const result = await emailPoolService.sendEmailWithRetry(mailOptions)
          results.push({
            recipient,
            success: true,
            messageId: result.messageId,
            emailUsed: result.emailUsed,
            attempt: result.attempt
          })
        } catch (error) {
          results.push({
            recipient,
            success: false,
            error: error.message
          })
        }
      }
      
      const successCount = results.filter(r => r.success).length
      console.log(`📬 用户 ${req.user.username} 批量测试邮件: ${successCount}/${recipients.length} 成功`)
      
      res.json({
        message: `批量测试完成: ${successCount}/${recipients.length} 成功`,
        data: {
          summary: {
            total: recipients.length,
            success: successCount,
            failed: recipients.length - successCount
          },
          results
        }
      })
    } catch (error) {
      console.error('批量邮件测试失败:', error)
      res.status(500).json({ 
        message: error.message || '批量邮件测试失败' 
      })
    }
  }
)

module.exports = router
