const express = require('express')
const { registrationValidation } = require('../middleware/validation')
const { 
  authenticateToken, 
  optionalAuth, 
  requirePermission,
  requireAnyPermission 
} = require('../middleware/auth')
const feishuService = require('../services/feishuService')
const emailService = require('../services/emailService')

const router = express.Router()

// 定义需要发送邮件通知的状态
const EMAIL_NOTIFICATION_STATUSES = [
  '一审通过',
  '二审通过', 
  '三审通过',
  '终审通过',
  '初审驳回',
  '一审驳回',
  '二审驳回',
  '三审驳回',
  '终审驳回',
  '驳回'
]

// 检查是否需要发送邮件并发送
const sendStatusUpdateEmailIfNeeded = (existingRecord, status, note, context = '') => {
  if (existingRecord.contact && EMAIL_NOTIFICATION_STATUSES.includes(status)) {
    console.log(`🔄 准备发送${context}状态更新邮件:`, {
      registrationId: existingRecord.registrationId,
      contact: existingRecord.contact,
      status,
      note,
      isConfigured: emailService.isConfigured()
    })
    
    emailService.sendStatusUpdate(existingRecord, status, note)
      .then(emailResult => {
        if (emailResult.success) {
          console.log(`✅ ${context}状态更新邮件发送成功:`, emailResult.recipient)
        } else {
          console.error(`❌ ${context}状态更新邮件发送失败:`, emailResult.error)
        }
      })
      .catch(error => {
        console.error(`💥 ${context}状态更新邮件发送异常:`, error)
      })
  } else if (!existingRecord.contact) {
    console.log(`⚠️  未发送${context}状态更新邮件: 缺少联系方式`, {
      registrationId: existingRecord.registrationId,
      contact: existingRecord.contact
    })
  } else {
    console.log(`ℹ️  ${context}状态更新不需要发送邮件:`, {
      registrationId: existingRecord.registrationId,
      status: status,
      reason: '该状态不在邮件通知列表中'
    })
  }
}

// 提交报名 (无需登录)
router.post('/', registrationValidation, async (req, res) => {
  try {
    // 创建飞书记录
    const result = await feishuService.createRegistration(req.body)
    
    // 准备报名信息用于邮件发送
    const registration = {
      ...req.body,
      registrationId: result.registrationId,
      createdTime: result.createdTime || new Date().toISOString()
    }

    // 立即响应报名成功
    res.status(201).json({
      message: '报名提交成功',
      data: {
        registrationId: result.registrationId,
        recordId: result.recordId,
        emailSent: 'pending' // 邮件发送状态为待处理
      }
    })

    // 异步发送确认邮件，不阻塞响应
    if (await emailService.isConfigured()) {
      emailService.sendRegistrationConfirmation(registration)
        .then(emailResult => {
          if (emailResult.success) {
            console.log(`✅ 报名确认邮件发送成功: ${emailResult.recipient} (使用: ${emailResult.emailUsed})`)
          } else {
            console.error('❌ 报名确认邮件发送失败:', emailResult.error)
          }
        })
        .catch(error => {
          console.error('💥 报名确认邮件发送异常:', error.message)
          
          // 记录详细错误信息
          if (error.message.includes('配额') || error.message.includes('quota')) {
            console.warn('⚠️  邮件配额问题，建议添加更多邮箱到邮箱池或检查配额限制')
          }
        })
    } else {
      console.log('📧 邮件服务未配置，跳过邮件发送')
    }
  } catch (error) {
    console.error('报名提交失败:', error)
    res.status(500).json({ 
      message: error.message || '报名提交失败，请重试' 
    })
  }
})

// 查询报名信息 (通过编号，无需登录)
router.get('/:registrationId', async (req, res) => {
  try {
    const { registrationId } = req.params
    
    if (!registrationId) {
      return res.status(400).json({ message: '报名编号不能为空' })
    }

    const registration = await feishuService.getRegistration(registrationId)
    
    // 隐藏敏感信息（对于非管理员用户）
    const publicData = {
      registrationId: registration.registrationId,
      name: registration.name,
      programName: registration.programName,
      type: registration.type,
      status: registration.status,
      createdTime: registration.createdTime,
      remarks: registration.remarks
    }

    res.json({
      message: '查询成功',
      data: publicData
    })
  } catch (error) {
    console.error('查询报名失败:', error)
    res.status(404).json({ 
      message: error.message || '查询失败，请检查报名编号' 
    })
  }
})

// 获取所有报名记录 (需要管理员权限)
router.get('/', authenticateToken, requirePermission('registration.view'), async (req, res) => {
  try {
    const { page = 1, pageSize = 1000, status, type, search, pageToken, sortBy = 'registrationId', sortOrder = 'desc' } = req.query
    
    const params = {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      status,
      type,
      search,
      pageToken,
      sortBy,
      sortOrder
    }

    const result = await feishuService.getAllRegistrations(params)
    
    // 如果有搜索关键词，在内存中过滤（飞书API搜索功能有限）
    let filteredItems = result.items
    if (search) {
      const searchTerm = search.toLowerCase()
      filteredItems = result.items.filter(item => 
        item.name?.toLowerCase().includes(searchTerm) ||
        item.programName?.toLowerCase().includes(searchTerm) ||
        item.registrationId?.toLowerCase().includes(searchTerm) ||
        item.performers?.toLowerCase().includes(searchTerm)
      )
    }

    res.json({
      message: '获取成功',
      data: {
        items: filteredItems,
        hasMore: result.hasMore,
        total: result.total,
        page: params.page,
        pageSize: params.pageSize,
        pageToken: result.pageToken,
        nextPageToken: result.nextPageToken
      }
    })
  } catch (error) {
    console.error('获取报名列表失败:', error)
    res.status(500).json({ 
      message: error.message || '获取报名列表失败' 
    })
  }
})

// 更新报名信息 (需要管理员权限)
router.put('/:id', authenticateToken, requirePermission('registration.edit'), async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // 验证更新数据
    if (updates.contact && !/^\d{5,12}$/.test(updates.contact)) {
      return res.status(400).json({ message: '联系方式格式不正确' })
    }

    const updatedRecord = await feishuService.updateRegistration(id, updates)
    
    res.json({
      message: '更新成功',
      data: updatedRecord
    })
  } catch (error) {
    console.error('更新报名失败:', error)
    res.status(500).json({ 
      message: error.message || '更新失败' 
    })
  }
})

// 删除报名记录 (需要管理员权限)
router.delete('/:id', authenticateToken, requirePermission('registration.delete'), async (req, res) => {
  try {
    const { id } = req.params
    
    await feishuService.deleteRegistration(id)
    
    res.json({
      message: '删除成功'
    })
  } catch (error) {
    console.error('删除报名失败:', error)
    res.status(500).json({ 
      message: error.message || '删除失败' 
    })
  }
})

// 一级审核通过 (需要管理员权限)
router.patch('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { status = '一审通过', note } = req.body

    // 先获取原记录信息（通过record_id直接获取）
    const existingRecord = await feishuService.getRegistrationByRecordId(id)

    const updates = {
      status,
      remarks: note ? `${existingRecord.remarks || ''}\n[${new Date().toLocaleString()}] 管理员备注: ${note}` : existingRecord.remarks
    }

    const updatedRecord = await feishuService.updateRegistration(id, updates)
    
    // 发送状态更新邮件（如果需要）
    sendStatusUpdateEmailIfNeeded(existingRecord, status, note, '审批')

    res.json({
      message: '审核成功',
      data: updatedRecord
    })
  } catch (error) {
    console.error('审核失败:', error)
    res.status(500).json({ 
      message: error.message || '审核失败' 
    })
  }
})

// 二级审核 (需要管理员权限)
router.patch('/:id/second-approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { action, note } = req.body // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: '无效的审核操作' })
    }

    // 先获取原记录信息
    const existingRecord = await feishuService.getRegistrationByRecordId(id)

    // 检查当前状态是否可以进行二级审核
    if (existingRecord.status !== '一审通过') {
      return res.status(400).json({ message: '只有一审通过的记录才能进行二审' })
    }

    const status = action === 'approve' ? '二审通过' : '二审驳回'
    const actionText = action === 'approve' ? '二审通过' : '二审驳回'

    const updates = {
      status,
      remarks: note 
        ? `${existingRecord.remarks || ''}\n[${new Date().toLocaleString()}] ${actionText}: ${note}` 
        : `${existingRecord.remarks || ''}\n[${new Date().toLocaleString()}] ${actionText}`
    }

    const updatedRecord = await feishuService.updateRegistration(id, updates)
    
    // 发送状态更新邮件（如果需要）
    sendStatusUpdateEmailIfNeeded(existingRecord, status, note, '二审')

    res.json({
      message: `${actionText}成功`,
      data: updatedRecord
    })
  } catch (error) {
    console.error('二级审核失败:', error)
    res.status(500).json({ 
      message: error.message || '二级审核失败' 
    })
  }
})

// 终级审核 (需要管理员权限)
router.patch('/:id/final-approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { action, note } = req.body // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: '无效的审核操作' })
    }

    // 先获取原记录信息
    const existingRecord = await feishuService.getRegistrationByRecordId(id)

    // 检查当前状态是否可以进行终级审核
    if (existingRecord.status !== '二审通过') {
      return res.status(400).json({ message: '只有二审通过的记录才能进行终审' })
    }

    const status = action === 'approve' ? '终审通过' : '终审驳回'
    const actionText = action === 'approve' ? '终审通过' : '终审驳回'

    const updates = {
      status,
      remarks: note 
        ? `${existingRecord.remarks || ''}\n[${new Date().toLocaleString()}] ${actionText}: ${note}` 
        : `${existingRecord.remarks || ''}\n[${new Date().toLocaleString()}] ${actionText}`
    }

    const updatedRecord = await feishuService.updateRegistration(id, updates)
    
    // 发送状态更新邮件（如果需要）
    sendStatusUpdateEmailIfNeeded(existingRecord, status, note, '终审')

    res.json({
      message: `${actionText}成功`,
      data: updatedRecord
    })
  } catch (error) {
    console.error('终级审核失败:', error)
    res.status(500).json({ 
      message: error.message || '终级审核失败' 
    })
  }
})

// 审核驳回 (需要管理员权限)
router.patch('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    if (!reason) {
      return res.status(400).json({ message: '驳回原因不能为空' })
    }

    // 先获取原记录信息（通过record_id直接获取）
    const existingRecord = await feishuService.getRegistrationByRecordId(id)

    const updates = {
      status: '初审驳回',
      remarks: `${existingRecord.remarks || ''}\n[${new Date().toLocaleString()}] 驳回原因: ${reason}`
    }

    const updatedRecord = await feishuService.updateRegistration(id, updates)
    
    // 发送状态更新邮件（如果需要）
    sendStatusUpdateEmailIfNeeded(existingRecord, '初审驳回', reason, '驳回')

    res.json({
      message: '驳回成功',
      data: updatedRecord
    })
  } catch (error) {
    console.error('驳回失败:', error)
    res.status(500).json({ 
      message: error.message || '驳回失败' 
    })
  }
})

// 更新状态 (需要管理员权限)
router.patch('/:id/status', authenticateToken, requirePermission('registration.edit'), async (req, res) => {
  try {
    const { id } = req.params
    const { status, note } = req.body

    if (!status) {
      return res.status(400).json({ message: '状态不能为空' })
    }

    // 先获取原记录信息（通过record_id直接获取）
    const existingRecord = await feishuService.getRegistrationByRecordId(id)

    const updates = {
      status: status,
      remarks: note ? 
        `${existingRecord.remarks || ''}\n[${new Date().toLocaleString()}] 状态更新为"${status}": ${note}` :
        `${existingRecord.remarks || ''}\n[${new Date().toLocaleString()}] 状态更新为"${status}"`
    }

    const updatedRecord = await feishuService.updateRegistration(id, updates)
    
    // 发送状态更新邮件（如果需要）
    sendStatusUpdateEmailIfNeeded(existingRecord, status, note, '状态更新')

    res.json({
      message: '状态更新成功',
      data: updatedRecord
    })
  } catch (error) {
    console.error('状态更新失败:', error)
    res.status(500).json({ 
      message: error.message || '状态更新失败' 
    })
  }
})

// 获取状态选项
router.get('/meta/status-options', (req, res) => {
  const statusOptions = [
    '未按规范填写表格',
    '作品所有者自愿取消',
    '已联系',
    '有待斟酌',
    '一审通过',
    '二审通过',
    '终审通过',
    '初审驳回',
    '团队独立立项',
    '拒绝联系',
    '无法联系'
  ]

  res.json({
    data: statusOptions
  })
})

// 获取作品类型选项
router.get('/meta/type-options', (req, res) => {
  const typeOptions = [
    '公益短片（非合作方请不要选择此项）',
    '小品',
    '相声',
    '乐器',
    '戏曲',
    '说唱',
    '舞蹈',
    '歌曲',
    '魔术',
    '杂技',
    '《难忘今宵》合唱',
    '混剪',
    '其他',
    '公益短片'
  ]

  res.json({
    data: typeOptions
  })
})

// 批量发送邮件 (需要管理员权限)
router.post('/bulk-email', authenticateToken, async (req, res) => {
  try {
    const { 
      statusFilter = [], 
      typeFilter = [], 
      emailType = 'custom',
      content = {},
      registrationIds = [],
      bccEmail = ''
    } = req.body

    // 验证邮件类型
    const validEmailTypes = ['status_update', 'custom', 'reminder', 'resend']
    if (!validEmailTypes.includes(emailType)) {
      return res.status(400).json({ 
        message: '无效的邮件类型',
        validTypes: validEmailTypes
      })
    }

    // 验证邮件内容
    if (emailType === 'custom' || emailType === 'reminder') {
      if (!content.title && !content.message) {
        return res.status(400).json({ 
          message: '自定义邮件或提醒邮件需要提供标题或内容' 
        })
      }
    }

    if (emailType === 'status_update' && !content.newStatus) {
      return res.status(400).json({ 
        message: '状态更新邮件需要提供新状态' 
      })
    }

    let registrations = []

    // 如果提供了具体的报名ID列表，优先使用
    if (registrationIds && registrationIds.length > 0) {
      console.log('📧 根据报名ID列表获取记录:', registrationIds)
      
      // 通过ID获取具体记录
      for (const id of registrationIds) {
        try {
          const registration = await feishuService.getRegistrationByRecordId(id)
          if (registration && registration.contact) {
            registrations.push(registration)
          }
        } catch (error) {
          console.warn(`无法获取报名记录 ${id}:`, error.message)
        }
      }
    } else {
      // 根据状态和类型过滤获取记录
      console.log('📧 根据过滤条件获取记录:', { statusFilter, typeFilter })
      
      const allRegistrations = await feishuService.getAllRegistrations({
        page: 1,
        pageSize: 1000 // 获取大量记录用于批量操作
      })

      registrations = allRegistrations.items.filter(registration => {
        // 检查是否有联系方式
        if (!registration.contact) return false

        // 状态过滤
        if (statusFilter.length > 0 && !statusFilter.includes(registration.status)) {
          return false
        }

        // 类型过滤
        if (typeFilter.length > 0 && !typeFilter.includes(registration.type)) {
          return false
        }

        return true
      })
    }

    console.log(`📧 准备发送邮件给 ${registrations.length} 个报名记录`)

    if (registrations.length === 0) {
      return res.status(400).json({ 
        message: '没有找到符合条件的报名记录，或所有记录都没有联系方式' 
      })
    }

    // 发送批量邮件
    const result = await emailService.sendBulkEmails(registrations, emailType, content, bccEmail)

    if (result.success) {
      res.json({
        message: '批量邮件发送完成',
        data: result.data
      })
    } else {
      res.status(500).json({
        message: result.error || '批量邮件发送失败'
      })
    }

  } catch (error) {
    console.error('批量邮件发送失败:', error)
    res.status(500).json({ 
      message: error.message || '批量邮件发送失败' 
    })
  }
})

// 获取邮件发送历史 (需要管理员权限)
router.get('/email-history', authenticateToken, async (req, res) => {
  try {
    // 这里可以实现邮件发送历史记录功能
    // 暂时返回空数组，后续可以扩展
    res.json({
      message: '获取成功',
      data: {
        items: [],
        total: 0
      }
    })
  } catch (error) {
    console.error('获取邮件历史失败:', error)
    res.status(500).json({ 
      message: error.message || '获取邮件历史失败' 
    })
  }
})

module.exports = router
