const logService = require('../services/logService')

// 获取客户端IP地址
function getClientIp(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown'
}

// 获取用户代理
function getUserAgent(req) {
  return req.headers['user-agent'] || 'unknown'
}

// 简化IP地址显示
function normalizeIp(ip) {
  if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
    return 'localhost'
  }
  if (ip && ip.startsWith('::ffff:')) {
    return ip.substring(7)
  }
  return ip
}

// 记录登录日志的中间件
function logLogin(status, failureReason = null) {
  return async (req, res, next) => {
    try {
      const loginData = {
        userId: req.user?.id || null,
        username: req.body?.username || req.user?.username || 'unknown',
        loginType: req.user?.loginType || req.body?.type || 'admin',
        ipAddress: normalizeIp(getClientIp(req)),
        userAgent: getUserAgent(req),
        status,
        failureReason,
        location: null // 可以后续集成IP地理位置服务
      }

      await logService.logLogin(loginData)
    } catch (error) {
      console.error('记录登录日志失败:', error)
    }
    
    if (next) next()
  }
}

// 记录操作日志的中间件
function logOperation(action, resource) {
  return async (req, res, next) => {
    // 保存原始的res.json方法
    const originalJson = res.json.bind(res)
    
    // 重写res.json方法来捕获响应
    res.json = function(data) {
      // 异步记录日志
      setImmediate(async () => {
        try {
          const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failed'
          const errorMessage = status === 'failed' ? data?.message || 'Unknown error' : null
          
          // 提取资源ID
          let resourceId = req.params?.id || 
                          req.params?.userId || 
                          req.params?.emailId ||
                          req.params?.fieldId ||
                          req.body?.id ||
                          data?.data?.id ||
                          data?.data?.registrationId ||
                          data?.data?.recordId ||
                          null

          // 准备详细信息
          let details = {}
          
          // 根据不同操作类型收集相关信息
          switch (action) {
            case 'create':
              if (req.body) {
                details.created = Object.keys(req.body).reduce((acc, key) => {
                  if (!['password', 'pass', 'token'].includes(key)) {
                    acc[key] = req.body[key]
                  }
                  return acc
                }, {})
              }
              break
              
            case 'update':
              if (req.body) {
                details.updated = Object.keys(req.body).reduce((acc, key) => {
                  if (!['password', 'pass', 'token'].includes(key)) {
                    acc[key] = req.body[key]
                  }
                  return acc
                }, {})
              }
              break
              
            case 'delete':
              details.deleted = { id: resourceId }
              break
              
            case 'bulk_email':
              details.emailType = req.body?.emailType
              details.recipientCount = req.body?.registrationIds?.length || 'filtered'
              break
              
            case 'status_update':
              details.newStatus = req.body?.status
              details.note = req.body?.note
              break
          }

          const operationData = {
            userId: req.user?.id || null,
            username: req.user?.username || 'anonymous',
            action,
            resource,
            resourceId,
            details: Object.keys(details).length > 0 ? details : null,
            ipAddress: normalizeIp(getClientIp(req)),
            userAgent: getUserAgent(req),
            status,
            errorMessage
          }

          await logService.logOperation(operationData)
        } catch (error) {
          console.error('记录操作日志失败:', error)
        }
      })
      
      // 调用原始的json方法
      return originalJson(data)
    }
    
    next()
  }
}

// 自动检测操作类型的中间件
function autoLogOperation(resource) {
  return (req, res, next) => {
    let action = 'unknown'
    
    // 根据HTTP方法和路径自动检测操作类型
    switch (req.method) {
      case 'GET':
        action = req.path.includes('/stats') || req.path.includes('/dashboard') ? 'view_stats' : 'view'
        break
      case 'POST':
        if (req.path.includes('/bulk-email')) {
          action = 'bulk_email'
        } else if (req.path.includes('/test')) {
          action = 'test'
        } else if (req.path.includes('/toggle')) {
          action = 'toggle'
        } else {
          action = 'create'
        }
        break
      case 'PUT':
        action = 'update'
        break
      case 'PATCH':
        if (req.path.includes('/toggle')) {
          action = 'toggle'
        } else if (req.path.includes('/approve')) {
          action = 'approve'
        } else if (req.path.includes('/reject')) {
          action = 'reject'
        } else if (req.path.includes('/status')) {
          action = 'status_update'
        } else {
          action = 'update'
        }
        break
      case 'DELETE':
        action = 'delete'
        break
    }
    
    return logOperation(action, resource)(req, res, next)
  }
}

// 忽略某些路径的日志记录
function shouldLogRequest(req) {
  const ignorePaths = [
    '/auth/verify',
    '/settings/debug/public',
    '/stats/public'
  ]
  
  const ignoreExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg']
  
  // 检查是否在忽略路径中
  if (ignorePaths.some(path => req.path.includes(path))) {
    return false
  }
  
  // 检查是否是静态资源
  if (ignoreExtensions.some(ext => req.path.endsWith(ext))) {
    return false
  }
  
  return true
}

module.exports = {
  logLogin,
  logOperation,
  autoLogOperation,
  shouldLogRequest,
  getClientIp,
  getUserAgent,
  normalizeIp
}
