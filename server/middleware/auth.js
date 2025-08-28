const jwt = require('jsonwebtoken')
const config = require('../config')

// 数据库服务 - 使用try-catch来处理可能的导入问题
let database = null
try {
  database = require('../services/database')
} catch (error) {
  console.warn('数据库服务不可用:', error.message)
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: '访问令牌缺失' })
  }

  jwt.verify(token, config.jwtSecret, async (err, user) => {
    if (err) {
      return res.status(403).json({ message: '访问令牌无效' })
    }

    try {
      // 如果用户来自数据库且数据库可用，获取最新的用户信息
      if (user.id && typeof user.id === 'number' && database && database.isAvailable) {
        const dbUser = await database.getUserById(user.id)
        if (!dbUser) {
          return res.status(403).json({ message: '用户不存在或已被禁用' })
        }
        req.user = { ...user, ...dbUser }
      } else {
        // 兼容旧的认证方式（配置文件中的管理员）
        req.user = user
      }
      next()
    } catch (error) {
      console.error('认证中间件错误:', error)
      // 如果数据库查询失败，回退到token中的用户信息
      req.user = user
      next()
    }
  })
}

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token) {
    jwt.verify(token, config.jwtSecret, async (err, user) => {
      if (!err) {
        try {
          // 如果用户来自数据库且数据库可用，获取最新的用户信息
          if (user.id && typeof user.id === 'number' && database && database.isAvailable) {
            const dbUser = await database.getUserById(user.id)
            if (dbUser) {
              req.user = { ...user, ...dbUser }
            } else {
              req.user = user
            }
          } else {
            // 兼容旧的认证方式
            req.user = user
          }
        } catch (error) {
          console.error('可选认证中间件错误:', error)
          req.user = user
        }
      }
    })
  }
  next()
}

// 角色验证中间件
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: '需要登录' })
    }

    const userRole = req.user.role
    const allowedRoles = Array.isArray(roles) ? roles : [roles]

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: '权限不足' })
    }

    next()
  }
}

// 权限验证中间件
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: '需要登录' })
    }

    // 超级管理员拥有所有权限
    if (req.user.role === 'super_admin') {
      return next()
    }

    // 检查用户权限
    const userPermissions = req.user.permissions || []
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ message: `缺少权限: ${permission}` })
    }

    next()
  }
}

// 权限验证中间件（支持多个权限，满足任一即可）
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: '需要登录' })
    }

    // 超级管理员拥有所有权限
    if (req.user.role === 'super_admin') {
      return next()
    }

    // 检查用户权限
    const userPermissions = req.user.permissions || []
    const hasPermission = permissions.some(permission => userPermissions.includes(permission))
    
    if (!hasPermission) {
      return res.status(403).json({ message: `缺少以下任一权限: ${permissions.join(', ')}` })
    }

    next()
  }
}

// 超级管理员专用中间件
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: '需要登录' })
  }

  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: '需要超级管理员权限' })
  }

  next()
}

module.exports = {
  authenticate: authenticateToken,
  authenticateToken,
  optionalAuth,
  requireRole,
  requirePermission,
  requireAnyPermission,
  requireSuperAdmin
}