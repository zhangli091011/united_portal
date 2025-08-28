const express = require('express')
const bcrypt = require('bcryptjs')
const { body, validationResult } = require('express-validator')
const { 
  authenticateToken, 
  requireSuperAdmin, 
  requirePermission,
  requireRole 
} = require('../middleware/auth')
const { autoLogOperation } = require('../middleware/logging')
const database = require('../services/database')

const router = express.Router()

// 获取所有用户（超级管理员专用）
router.get('/', authenticateToken, requireSuperAdmin, autoLogOperation('users'), async (req, res) => {
  try {
    const users = await database.getAllUsers()
    
    // 移除敏感信息
    const safeUsers = users.map(user => {
      const { password_hash, ...safeUser } = user
      return safeUser
    })

    res.json({
      message: '获取用户列表成功',
      data: safeUsers
    })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    res.status(500).json({ message: '获取用户列表失败' })
  }
})

// 获取单个用户信息
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    
    // 只有超级管理员或用户本人可以查看用户信息
    if (req.user.role !== 'super_admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ message: '无权查看此用户信息' })
    }

    const user = await database.getUserById(parseInt(id))
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }

    // 移除敏感信息
    const { password_hash, ...safeUser } = user
    
    res.json({
      message: '获取用户信息成功',
      data: safeUser
    })
  } catch (error) {
    console.error('获取用户信息失败:', error)
    res.status(500).json({ message: '获取用户信息失败' })
  }
})

// 创建用户（超级管理员专用）
router.post('/', [
  authenticateToken,
  requireSuperAdmin,
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('用户名长度必须在3-50字符之间'),
  body('email').optional().isEmail().withMessage('邮箱格式不正确'),
  body('password').isLength({ min: 6 }).withMessage('密码长度至少6位'),
  body('role').isIn(['admin', 'super_admin']).withMessage('角色必须是admin或super_admin'),
  body('permissions').isArray().withMessage('权限必须是数组格式')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: '输入验证失败', 
        errors: errors.array() 
      })
    }

    const { username, email, password, role, permissions } = req.body

    // 检查用户名是否已存在
    const existingUser = await database.getUserByUsername(username)
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' })
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10)

    // 创建用户
    const userData = {
      username,
      email: email || null,
      passwordHash,
      role,
      permissions,
      createdBy: req.user.id
    }

    const user = await database.createUser(userData)

    // 返回用户信息（不包含密码）
    const { password_hash, ...safeUser } = user
    
    res.status(201).json({
      message: '用户创建成功',
      data: safeUser
    })
  } catch (error) {
    console.error('创建用户失败:', error)
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ message: '用户名或邮箱已存在' })
    }
    res.status(500).json({ message: '创建用户失败' })
  }
})

// 更新用户信息（超级管理员专用）
router.put('/:id', [
  authenticateToken,
  requireSuperAdmin,
  body('username').optional().trim().isLength({ min: 3, max: 50 }).withMessage('用户名长度必须在3-50字符之间'),
  body('email').optional().isEmail().withMessage('邮箱格式不正确'),
  body('role').optional().isIn(['admin', 'super_admin']).withMessage('角色必须是admin或super_admin'),
  body('permissions').optional().isArray().withMessage('权限必须是数组格式'),
  body('isActive').optional().isBoolean().withMessage('激活状态必须是布尔值')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: '输入验证失败', 
        errors: errors.array() 
      })
    }

    const { id } = req.params
    const { username, email, role, permissions, isActive } = req.body

    // 检查用户是否存在
    const existingUser = await database.getUserById(parseInt(id))
    if (!existingUser) {
      return res.status(404).json({ message: '用户不存在' })
    }

    // 防止删除最后一个超级管理员
    if (existingUser.role === 'super_admin' && (role !== 'super_admin' || isActive === false)) {
      const allUsers = await database.getAllUsers()
      const superAdmins = allUsers.filter(u => u.role === 'super_admin' && u.is_active)
      if (superAdmins.length <= 1) {
        return res.status(400).json({ message: '不能删除或降级最后一个超级管理员' })
      }
    }

    // 更新用户信息
    const updateData = {
      username: username || existingUser.username,
      email: email !== undefined ? email : existingUser.email,
      role: role || existingUser.role,
      permissions: permissions || existingUser.permissions,
      isActive: isActive !== undefined ? isActive : existingUser.is_active
    }

    await database.updateUser(parseInt(id), updateData)

    // 获取更新后的用户信息
    const updatedUser = await database.getUserById(parseInt(id))
    const { password_hash, ...safeUser } = updatedUser

    res.json({
      message: '用户更新成功',
      data: safeUser
    })
  } catch (error) {
    console.error('更新用户失败:', error)
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ message: '用户名或邮箱已存在' })
    }
    res.status(500).json({ message: '更新用户失败' })
  }
})

// 修改密码
router.put('/:id/password', [
  authenticateToken,
  body('newPassword').isLength({ min: 6 }).withMessage('新密码长度至少6位'),
  body('currentPassword').optional().notEmpty().withMessage('当前密码不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: '输入验证失败', 
        errors: errors.array() 
      })
    }

    const { id } = req.params
    const { newPassword, currentPassword } = req.body
    const userId = parseInt(id)

    // 只有超级管理员或用户本人可以修改密码
    if (req.user.role !== 'super_admin' && req.user.id !== userId) {
      return res.status(403).json({ message: '无权修改此用户密码' })
    }

    const user = await database.getUserById(userId)
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }

    // 如果不是超级管理员，需要验证当前密码
    if (req.user.role !== 'super_admin') {
      if (!currentPassword) {
        return res.status(400).json({ message: '请提供当前密码' })
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash)
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: '当前密码错误' })
      }
    }

    // 加密新密码
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // 更新密码
    await database.updateUserPassword(userId, newPasswordHash)

    res.json({
      message: '密码修改成功'
    })
  } catch (error) {
    console.error('修改密码失败:', error)
    res.status(500).json({ message: '修改密码失败' })
  }
})

// 删除用户（软删除，超级管理员专用）
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const userId = parseInt(id)

    const user = await database.getUserById(userId)
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }

    // 防止删除最后一个超级管理员
    if (user.role === 'super_admin') {
      const allUsers = await database.getAllUsers()
      const superAdmins = allUsers.filter(u => u.role === 'super_admin' && u.is_active)
      if (superAdmins.length <= 1) {
        return res.status(400).json({ message: '不能删除最后一个超级管理员' })
      }
    }

    // 防止用户删除自己
    if (req.user.id === userId) {
      return res.status(400).json({ message: '不能删除自己的账户' })
    }

    await database.deleteUser(userId)

    res.json({
      message: '用户删除成功'
    })
  } catch (error) {
    console.error('删除用户失败:', error)
    res.status(500).json({ message: '删除用户失败' })
  }
})

// 获取所有可用权限
router.get('/permissions/list', authenticateToken, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const permissions = await database.getAllPermissions()
    
    // 按分类分组
    const groupedPermissions = permissions.reduce((acc, permission) => {
      const category = permission.category || '其他'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(permission)
      return acc
    }, {})

    res.json({
      message: '获取权限列表成功',
      data: {
        permissions,
        grouped: groupedPermissions
      }
    })
  } catch (error) {
    console.error('获取权限列表失败:', error)
    res.status(500).json({ message: '获取权限列表失败' })
  }
})

// 获取当前用户信息
router.get('/profile/me', authenticateToken, async (req, res) => {
  try {
    if (typeof req.user.id === 'number') {
      // 数据库用户
      const user = await database.getUserById(req.user.id)
      if (!user) {
        return res.status(404).json({ message: '用户不存在' })
      }

      const { password_hash, ...safeUser } = user
      res.json({
        message: '获取用户信息成功',
        data: safeUser
      })
    } else {
      // 配置文件用户（兼容性）
      res.json({
        message: '获取用户信息成功',
        data: req.user
      })
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    res.status(500).json({ message: '获取用户信息失败' })
  }
})

module.exports = router
