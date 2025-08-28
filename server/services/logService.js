const database = require('./database')

class LogService {
  constructor() {
    this.initialized = false
    this.initializationPromise = this.initializeDatabase()
  }

  // 确保服务已初始化
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initializationPromise
    }
  }

  // 初始化数据库表
  async initializeDatabase() {
    try {
      // 等待数据库可用
      await this.waitForDatabase()
      await this.createLogTables()
      this.initialized = true
      console.log('✅ 日志服务初始化完成')
    } catch (error) {
      console.error('❌ 日志服务数据库初始化失败:', error)
      throw error
    }
  }

  // 等待数据库可用
  async waitForDatabase() {
    let attempts = 0
    const maxAttempts = 30
    
    while (attempts < maxAttempts) {
      if (database.isAvailable && database.connection) {
        return
      }
      
      console.log(`⏳ 等待数据库连接... (${attempts + 1}/${maxAttempts})`)
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
    }
    
    throw new Error('数据库连接超时')
  }

  // 创建日志数据表
  async createLogTables() {
    // 登录日志表
    const createLoginLogSQL = `
      CREATE TABLE IF NOT EXISTS login_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        username VARCHAR(100),
        login_type ENUM('admin', 'feishu', 'employee', 'username') NOT NULL DEFAULT 'admin',
        ip_address VARCHAR(45),
        user_agent TEXT,
        status ENUM('success', 'failed') NOT NULL,
        failure_reason VARCHAR(500),
        location VARCHAR(200),
        created_at DATETIME NOT NULL DEFAULT NOW(),
        INDEX idx_user_id (user_id),
        INDEX idx_username (username),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `

    // 操作日志表
    const createOperationLogSQL = `
      CREATE TABLE IF NOT EXISTS operation_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        username VARCHAR(100),
        action VARCHAR(100) NOT NULL,
        resource VARCHAR(100),
        resource_id VARCHAR(100),
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        status ENUM('success', 'failed') NOT NULL DEFAULT 'success',
        error_message TEXT,
        created_at DATETIME NOT NULL DEFAULT NOW(),
        INDEX idx_user_id (user_id),
        INDEX idx_username (username),
        INDEX idx_action (action),
        INDEX idx_resource (resource),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
    
    try {
      await database.connection.execute(createLoginLogSQL)
      console.log('✅ 登录日志数据表创建成功')
      
      await database.connection.execute(createOperationLogSQL)
      console.log('✅ 操作日志数据表创建成功')
      
      // 更新现有表结构以支持新的登录类型
      await this.updateTableSchema()
    } catch (error) {
      console.error('❌ 创建日志数据表失败:', error)
      throw error
    }
  }

  // 更新表结构
  async updateTableSchema() {
    try {
      // 检查并更新 login_type 枚举值
      const alterSQL = `
        ALTER TABLE login_logs 
        MODIFY COLUMN login_type ENUM('admin', 'feishu', 'employee', 'username') NOT NULL DEFAULT 'admin'
      `
      await database.connection.execute(alterSQL)
      console.log('✅ 登录日志表结构更新成功')
    } catch (error) {
      // 如果字段已经是正确的，忽略错误
      if (!error.message.includes('Duplicate')) {
        console.log('ℹ️ 登录日志表结构无需更新或更新失败:', error.message)
      }
    }
  }

  // 生成UUID
  generateId() {
    return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  // 记录登录日志
  async logLogin(loginData) {
    await this.ensureInitialized()
    
    const {
      userId,
      username,
      loginType = 'admin',
      ipAddress,
      userAgent,
      status,
      failureReason,
      location
    } = loginData

    const logId = this.generateId()
    
    try {
      const sql = `
        INSERT INTO login_logs (
          id, user_id, username, login_type, ip_address, user_agent, 
          status, failure_reason, location, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `
      
      await database.connection.execute(sql, [
        logId,
        userId,
        username,
        loginType,
        ipAddress,
        userAgent,
        status,
        failureReason,
        location
      ])

      console.log(`📝 登录日志记录成功: ${username} - ${status}`)
      return logId
    } catch (error) {
      console.error('❌ 记录登录日志失败:', error)
      throw error
    }
  }

  // 记录操作日志
  async logOperation(operationData) {
    await this.ensureInitialized()
    
    const {
      userId,
      username,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
      status = 'success',
      errorMessage
    } = operationData

    const logId = this.generateId()
    
    try {
      const sql = `
        INSERT INTO operation_logs (
          id, user_id, username, action, resource, resource_id, 
          details, ip_address, user_agent, status, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `
      
      await database.connection.execute(sql, [
        logId,
        userId,
        username,
        action,
        resource,
        resourceId,
        details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
        status,
        errorMessage
      ])

      console.log(`📝 操作日志记录成功: ${username} ${action} ${resource}`)
      return logId
    } catch (error) {
      console.error('❌ 记录操作日志失败:', error)
      throw error
    }
  }

  // 获取登录日志
  async getLoginLogs(options = {}) {
    await this.ensureInitialized()
    
    const {
      page = 1,
      pageSize = 20,
      userId,
      username,
      status,
      loginType,
      startDate,
      endDate
    } = options

    let whereConditions = []
    let queryParams = []

    if (userId) {
      whereConditions.push('user_id = ?')
      queryParams.push(userId)
    }

    if (username) {
      whereConditions.push('username LIKE ?')
      queryParams.push(`%${username}%`)
    }

    if (status) {
      whereConditions.push('status = ?')
      queryParams.push(status)
    }

    if (loginType) {
      whereConditions.push('login_type = ?')
      queryParams.push(loginType)
    }

    if (startDate) {
      whereConditions.push('created_at >= ?')
      queryParams.push(startDate)
    }

    if (endDate) {
      whereConditions.push('created_at <= ?')
      queryParams.push(endDate)
    }

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : ''

    // 查询总数
    const countSQL = `SELECT COUNT(*) as total FROM login_logs ${whereClause}`
    const [countResult] = await database.connection.execute(countSQL, queryParams)
    const total = countResult[0].total

    // 查询数据
    const offset = (page - 1) * pageSize
    const dataSQL = `
      SELECT * FROM login_logs 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `
    
    const [rows] = await database.connection.execute(dataSQL, [...queryParams, pageSize, offset])

    return {
      items: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  }

  // 获取操作日志
  async getOperationLogs(options = {}) {
    await this.ensureInitialized()
    
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
    } = options

    let whereConditions = []
    let queryParams = []

    if (userId) {
      whereConditions.push('user_id = ?')
      queryParams.push(userId)
    }

    if (username) {
      whereConditions.push('username LIKE ?')
      queryParams.push(`%${username}%`)
    }

    if (action) {
      whereConditions.push('action = ?')
      queryParams.push(action)
    }

    if (resource) {
      whereConditions.push('resource = ?')
      queryParams.push(resource)
    }

    if (status) {
      whereConditions.push('status = ?')
      queryParams.push(status)
    }

    if (startDate) {
      whereConditions.push('created_at >= ?')
      queryParams.push(startDate)
    }

    if (endDate) {
      whereConditions.push('created_at <= ?')
      queryParams.push(endDate)
    }

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : ''

    // 查询总数
    const countSQL = `SELECT COUNT(*) as total FROM operation_logs ${whereClause}`
    const [countResult] = await database.connection.execute(countSQL, queryParams)
    const total = countResult[0].total

    // 查询数据
    const offset = (page - 1) * pageSize
    const dataSQL = `
      SELECT * FROM operation_logs 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `
    
    const [rows] = await database.connection.execute(dataSQL, [...queryParams, pageSize, offset])

    // 解析details字段
    const items = rows.map(row => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : null
    }))

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  }

  // 获取日志统计信息
  async getLogStats(days = 7) {
    await this.ensureInitialized()
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    try {
      // 登录统计
      const [loginStats] = await database.connection.execute(`
        SELECT 
          COUNT(*) as totalLogins,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successfulLogins,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedLogins,
          COUNT(DISTINCT user_id) as uniqueUsers
        FROM login_logs 
        WHERE created_at >= ?
      `, [startDate])

      // 操作统计
      const [operationStats] = await database.connection.execute(`
        SELECT 
          COUNT(*) as totalOperations,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successfulOperations,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedOperations,
          COUNT(DISTINCT user_id) as activeUsers
        FROM operation_logs 
        WHERE created_at >= ?
      `, [startDate])

      // 每日登录趋势
      const [dailyLogins] = await database.connection.execute(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful
        FROM login_logs 
        WHERE created_at >= ?
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [startDate])

      // 热门操作
      const [topActions] = await database.connection.execute(`
        SELECT 
          action,
          resource,
          COUNT(*) as count
        FROM operation_logs 
        WHERE created_at >= ?
        GROUP BY action, resource
        ORDER BY count DESC
        LIMIT 10
      `, [startDate])

      return {
        loginStats: loginStats[0],
        operationStats: operationStats[0],
        dailyLogins,
        topActions,
        period: {
          startDate,
          endDate: new Date(),
          days
        }
      }
    } catch (error) {
      console.error('❌ 获取日志统计失败:', error)
      throw error
    }
  }

  // 清理旧日志
  async cleanupOldLogs(retentionDays = 90) {
    await this.ensureInitialized()
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
    
    try {
      const [loginResult] = await database.connection.execute(
        'DELETE FROM login_logs WHERE created_at < ?',
        [cutoffDate]
      )

      const [operationResult] = await database.connection.execute(
        'DELETE FROM operation_logs WHERE created_at < ?',
        [cutoffDate]
      )

      console.log(`🧹 日志清理完成: 删除 ${loginResult.affectedRows} 条登录日志, ${operationResult.affectedRows} 条操作日志`)
      
      return {
        deletedLoginLogs: loginResult.affectedRows,
        deletedOperationLogs: operationResult.affectedRows,
        cutoffDate
      }
    } catch (error) {
      console.error('❌ 清理旧日志失败:', error)
      throw error
    }
  }
}

module.exports = new LogService()
