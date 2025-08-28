const express = require('express')
const { body, validationResult } = require('express-validator')
const { 
  authenticateToken, 
  requirePermission,
  requireSuperAdmin 
} = require('../middleware/auth')
const feishuFieldService = require('../services/feishuFieldService')

const router = express.Router()

// 获取所有字段
router.get('/', authenticateToken, requirePermission('field.view'), async (req, res) => {
  try {
    const fields = await feishuFieldService.getFields()
    
    res.json({
      message: '获取字段列表成功',
      data: {
        fields,
        total: fields.length,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('获取字段列表失败:', error)
    res.status(500).json({ 
      message: error.message || '获取字段列表失败' 
    })
  }
})

// 获取单个字段详情
router.get('/:fieldId', authenticateToken, requirePermission('field.view'), async (req, res) => {
  try {
    const { fieldId } = req.params
    
    if (!fieldId) {
      return res.status(400).json({ message: '字段ID不能为空' })
    }
    
    const field = await feishuFieldService.getField(fieldId)
    
    res.json({
      message: '获取字段详情成功',
      data: field
    })
  } catch (error) {
    console.error('获取字段详情失败:', error)
    res.status(404).json({ 
      message: error.message || '获取字段详情失败' 
    })
  }
})

// 创建新字段
router.post('/', 
  authenticateToken, 
  requireSuperAdmin, // 只有超级管理员可以创建字段
  [
    body('field_name')
      .notEmpty()
      .withMessage('字段名称不能为空')
      .isLength({ min: 1, max: 50 })
      .withMessage('字段名称长度必须在1-50字符之间'),
    body('type')
      .notEmpty()
      .withMessage('字段类型不能为空')
      .isIn([
        'text', 'number', 'select', 'multiSelect', 'date', 'checkbox',
        'user', 'phone', 'url', 'email', 'currency', 'rating',
        'progress', 'singleLink', 'formula', 'createdTime', 'modifiedTime',
        'createdUser', 'modifiedUser', 'autoNumber', 'barcode', 'duplex'
      ])
      .withMessage('不支持的字段类型'),
    body('description')
      .optional()
      .isLength({ max: 200 })
      .withMessage('字段描述不能超过200字符')
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

      const fieldData = req.body
      
      // 验证字段数据
      feishuFieldService.validateFieldData(fieldData)
      
      const newField = await feishuFieldService.createField(fieldData)
      
      console.log(`✅ 用户 ${req.user.username} 创建了新字段:`, newField.name)
      
      res.status(201).json({
        message: '创建字段成功',
        data: newField
      })
    } catch (error) {
      console.error('创建字段失败:', error)
      res.status(400).json({ 
        message: error.message || '创建字段失败' 
      })
    }
  }
)

// 更新字段
router.put('/:fieldId', 
  authenticateToken, 
  requireSuperAdmin, // 只有超级管理员可以更新字段
  [
    body('field_name')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('字段名称长度必须在1-50字符之间'),
    body('description')
      .optional()
      .isLength({ max: 200 })
      .withMessage('字段描述不能超过200字符')
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

      const { fieldId } = req.params
      const fieldData = req.body
      
      if (!fieldId) {
        return res.status(400).json({ message: '字段ID不能为空' })
      }
      
      const updatedField = await feishuFieldService.updateField(fieldId, fieldData)
      
      console.log(`✅ 用户 ${req.user.username} 更新了字段:`, updatedField.name)
      
      res.json({
        message: '更新字段成功',
        data: updatedField
      })
    } catch (error) {
      console.error('更新字段失败:', error)
      res.status(400).json({ 
        message: error.message || '更新字段失败' 
      })
    }
  }
)

// 删除字段
router.delete('/:fieldId', 
  authenticateToken, 
  requireSuperAdmin, // 只有超级管理员可以删除字段
  async (req, res) => {
    try {
      const { fieldId } = req.params
      
      if (!fieldId) {
        return res.status(400).json({ message: '字段ID不能为空' })
      }
      
      // 先获取字段信息用于日志
      const field = await feishuFieldService.getField(fieldId)
      
      await feishuFieldService.deleteField(fieldId)
      
      console.log(`⚠️  用户 ${req.user.username} 删除了字段:`, field.name)
      
      res.json({
        message: '删除字段成功',
        data: { fieldId, fieldName: field.name }
      })
    } catch (error) {
      console.error('删除字段失败:', error)
      res.status(400).json({ 
        message: error.message || '删除字段失败' 
      })
    }
  }
)

// 同步字段映射
router.post('/sync', authenticateToken, requirePermission('field.manage'), async (req, res) => {
  try {
    const fieldMapping = await feishuFieldService.syncFieldMapping()
    
    console.log(`🔄 用户 ${req.user.username} 同步了字段映射`)
    
    res.json({
      message: '同步字段映射成功',
      data: {
        totalFields: fieldMapping.list.length,
        fields: fieldMapping.list,
        syncTime: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('同步字段映射失败:', error)
    res.status(500).json({ 
      message: error.message || '同步字段映射失败' 
    })
  }
})

// 获取字段类型配置
router.get('/config/types', authenticateToken, requirePermission('field.view'), async (req, res) => {
  try {
    const types = [
      'text', 'number', 'select', 'multiSelect', 'date', 'checkbox',
      'user', 'phone', 'url', 'email', 'currency', 'rating',
      'progress', 'singleLink', 'formula', 'createdTime', 'modifiedTime',
      'createdUser', 'modifiedUser', 'autoNumber', 'barcode', 'duplex'
    ]
    
    const typeConfigs = types.map(type => ({
      type,
      ...feishuFieldService.getFieldTypeConfig(type)
    }))
    
    res.json({
      message: '获取字段类型配置成功',
      data: typeConfigs
    })
  } catch (error) {
    console.error('获取字段类型配置失败:', error)
    res.status(500).json({ 
      message: error.message || '获取字段类型配置失败' 
    })
  }
})

// 验证字段数据
router.post('/validate', 
  authenticateToken, 
  requirePermission('field.manage'),
  async (req, res) => {
    try {
      const fieldData = req.body
      
      // 验证字段数据
      feishuFieldService.validateFieldData(fieldData)
      
      res.json({
        message: '字段数据验证通过',
        data: { valid: true }
      })
    } catch (error) {
      res.status(400).json({
        message: '字段数据验证失败',
        data: { 
          valid: false, 
          error: error.message 
        }
      })
    }
  }
)

module.exports = router
