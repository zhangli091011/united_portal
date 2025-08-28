const nodemailer = require('nodemailer')
const database = require('./database')

class EmailPoolService {
  constructor() {
    this.currentPoolIndex = 0
    this.emailPool = []
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
      await this.createEmailPoolTable()
      await this.loadEmailPool()
      this.initialized = true
      console.log('✅ 邮箱池服务初始化完成')
    } catch (error) {
      console.error('❌ 邮箱池数据库初始化失败:', error)
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

  // 创建邮箱池数据表
  async createEmailPoolTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS email_pool (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        host VARCHAR(255) NOT NULL,
        port INT NOT NULL DEFAULT 587,
        secure BOOLEAN NOT NULL DEFAULT false,
        user VARCHAR(255) NOT NULL,
        password VARCHAR(500) NOT NULL,
        from_address VARCHAR(255),
        active BOOLEAN NOT NULL DEFAULT true,
        success_count INT NOT NULL DEFAULT 0,
        failure_count INT NOT NULL DEFAULT 0,
        last_used DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT NOW(),
        updated_at DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW()
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
    
    try {
      await database.connection.execute(createTableSQL)
      console.log('✅ 邮箱池数据表创建成功')
    } catch (error) {
      console.error('❌ 创建邮箱池数据表失败:', error)
      throw error
    }
  }

  // 加载邮箱池配置
  async loadEmailPool() {
    try {
      const sql = 'SELECT * FROM email_pool ORDER BY created_at ASC'
      const [rows] = await database.connection.execute(sql)
      
      this.emailPool = rows.map(row => ({
        id: row.id,
        name: row.name,
        host: row.host,
        port: row.port,
        secure: Boolean(row.secure),
        user: row.user,
        password: row.password,
        from: row.from_address || row.user,
        active: Boolean(row.active),
        successCount: row.success_count || 0,
        failureCount: row.failure_count || 0,
        lastUsed: row.last_used,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
      
      console.log(`✅ 邮箱池加载成功，共 ${this.emailPool.length} 个邮箱`)
    } catch (error) {
      console.error('❌ 加载邮箱池失败:', error)
      this.emailPool = []
    }
  }

  // 生成UUID
  generateId() {
    return 'email_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  // 更新邮箱统计信息
  async updateEmailStats(emailId, success) {
    try {
      const sql = success 
        ? 'UPDATE email_pool SET success_count = success_count + 1, last_used = NOW(), updated_at = NOW() WHERE id = ?'
        : 'UPDATE email_pool SET failure_count = failure_count + 1, updated_at = NOW() WHERE id = ?'
      
      await database.connection.execute(sql, [emailId])
      
      // 更新内存中的数据
      const emailIndex = this.emailPool.findIndex(email => email.id === emailId)
      if (emailIndex !== -1) {
        if (success) {
          this.emailPool[emailIndex].successCount++
          this.emailPool[emailIndex].lastUsed = new Date().toISOString()
        } else {
          this.emailPool[emailIndex].failureCount++
        }
        this.emailPool[emailIndex].updatedAt = new Date().toISOString()
      }
    } catch (error) {
      console.error('❌ 更新邮箱统计失败:', error)
    }
  }

  // 获取所有邮箱配置
  async getAllEmails() {
    await this.ensureInitialized()
    return this.emailPool.map(email => ({
      ...email,
      password: email.password ? '***隐藏***' : '', // 隐藏密码
      status: email.active ? '启用' : '禁用'
    }))
  }

  // 获取当前可用的邮箱配置
  getCurrentEmail() {
    const activeEmails = this.emailPool.filter(email => email.active)
    if (activeEmails.length === 0) {
      return null
    }
    
    // 轮询选择邮箱
    const email = activeEmails[this.currentPoolIndex % activeEmails.length]
    this.currentPoolIndex = (this.currentPoolIndex + 1) % activeEmails.length
    
    return email
  }

  // 添加邮箱配置
  async addEmail(emailConfig) {
    // 验证必填字段
    if (!emailConfig.host || !emailConfig.user || !emailConfig.password) {
      throw new Error('邮箱配置不完整：主机、用户名和密码为必填项')
    }

    const emailId = this.generateId()
    const newEmail = {
      id: emailId,
      name: emailConfig.name || '未命名邮箱',
      host: emailConfig.host,
      port: parseInt(emailConfig.port) || 587,
      secure: emailConfig.secure || false,
      user: emailConfig.user,
      password: emailConfig.password,
      from: emailConfig.from || emailConfig.user,
      active: emailConfig.active !== undefined ? emailConfig.active : true,
      successCount: 0,
      failureCount: 0,
      lastUsed: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      const sql = `
        INSERT INTO email_pool (
          id, name, host, port, secure, user, password, from_address, active,
          success_count, failure_count, last_used, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `
      
      await database.connection.execute(sql, [
        emailId,
        newEmail.name,
        newEmail.host,
        newEmail.port,
        newEmail.secure,
        newEmail.user,
        newEmail.password,
        newEmail.from,
        newEmail.active,
        newEmail.successCount,
        newEmail.failureCount,
        newEmail.lastUsed
      ])

      // 重新加载邮箱池
      await this.loadEmailPool()
      
      return {
        ...newEmail,
        password: '***隐藏***'
      }
    } catch (error) {
      console.error('❌ 添加邮箱到数据库失败:', error)
      throw new Error('添加邮箱失败：' + error.message)
    }
  }

  // 更新邮箱配置
  async updateEmail(emailId, updates) {
    try {
      // 首先检查邮箱是否存在
      const checkSql = 'SELECT id FROM email_pool WHERE id = ?'
      const [existing] = await database.connection.execute(checkSql, [emailId])
      
      if (existing.length === 0) {
        throw new Error('邮箱配置不存在')
      }

      // 构建更新SQL
      const updateFields = []
      const values = []
      
      if (updates.name !== undefined) {
        updateFields.push('name = ?')
        values.push(updates.name)
      }
      if (updates.host !== undefined) {
        updateFields.push('host = ?')
        values.push(updates.host)
      }
      if (updates.port !== undefined) {
        updateFields.push('port = ?')
        values.push(parseInt(updates.port))
      }
      if (updates.secure !== undefined) {
        updateFields.push('secure = ?')
        values.push(updates.secure)
      }
      if (updates.user !== undefined) {
        updateFields.push('user = ?')
        values.push(updates.user)
      }
      if (updates.password !== undefined) {
        updateFields.push('password = ?')
        values.push(updates.password)
      }
      if (updates.from !== undefined) {
        updateFields.push('from_address = ?')
        values.push(updates.from)
      }
      if (updates.active !== undefined) {
        updateFields.push('active = ?')
        values.push(updates.active)
      }

      if (updateFields.length === 0) {
        throw new Error('没有要更新的字段')
      }

      // 添加更新时间
      updateFields.push('updated_at = NOW()')
      values.push(emailId)

      const sql = `UPDATE email_pool SET ${updateFields.join(', ')} WHERE id = ?`
      await database.connection.execute(sql, values)

      // 重新加载邮箱池
      await this.loadEmailPool()

      // 返回更新后的邮箱信息
      const updatedEmail = this.emailPool.find(email => email.id === emailId)
      return {
        ...updatedEmail,
        password: '***隐藏***'
      }
    } catch (error) {
      console.error('❌ 更新邮箱失败:', error)
      throw new Error('更新邮箱失败：' + error.message)
    }
  }

  // 删除邮箱配置
  async deleteEmail(emailId) {
    try {
      // 首先获取邮箱名称
      const selectSql = 'SELECT name FROM email_pool WHERE id = ?'
      const [existing] = await database.connection.execute(selectSql, [emailId])
      
      if (existing.length === 0) {
        throw new Error('邮箱配置不存在')
      }

      const emailName = existing[0].name

      // 删除邮箱
      const deleteSql = 'DELETE FROM email_pool WHERE id = ?'
      await database.connection.execute(deleteSql, [emailId])

      // 重新加载邮箱池
      await this.loadEmailPool()

      return emailName
    } catch (error) {
      console.error('❌ 删除邮箱失败:', error)
      throw new Error('删除邮箱失败：' + error.message)
    }
  }

  // 测试邮箱配置
  async testEmail(emailId, testRecipient) {
    let emailConfig
    
    if (emailId) {
      emailConfig = this.emailPool.find(email => email.id === emailId)
      if (!emailConfig) {
        throw new Error('邮箱配置不存在')
      }
    } else {
      emailConfig = this.getCurrentEmail()
      if (!emailConfig) {
        throw new Error('没有可用的邮箱配置')
      }
    }

    try {
      const { transporter, emailConfig: config } = await this.createTransporter(emailId)
      emailConfig = config

      // 验证连接
      await transporter.verify()

      // 发送测试邮件
      const info = await transporter.sendMail({
        from: emailConfig.from,
        to: testRecipient,
        subject: '邮箱配置测试',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">📧 邮箱配置测试</h2>
            <p>这是一封测试邮件，用于验证邮箱配置是否正常工作。</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">配置信息</h3>
              <p><strong>邮箱名称:</strong> ${emailConfig.name}</p>
              <p><strong>SMTP主机:</strong> ${emailConfig.host}</p>
              <p><strong>端口:</strong> ${emailConfig.port}</p>
              <p><strong>发件人:</strong> ${emailConfig.from}</p>
              <p><strong>测试时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
            </div>
            <p style="color: #666; font-size: 14px;">
              如果您收到此邮件，说明邮箱配置正常工作。
            </p>
          </div>
        `
      })

      // 更新成功统计
      await this.updateEmailStats(emailConfig.id, true)

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        emailName: emailConfig.name
      }
    } catch (error) {
      // 如果是SSL/TLS错误，尝试降级配置（适用于所有邮箱服务商）
      if (error.message.toLowerCase().includes('ssl') || 
          error.message.toLowerCase().includes('tls') || 
          error.message.toLowerCase().includes('wrong version number') ||
          error.message.toLowerCase().includes('certificate') ||
          error.message.toLowerCase().includes('handshake') ||
          error.message.toLowerCase().includes('protocol')) {
        
        console.log('🔒 测试邮箱SSL/TLS错误，尝试兼容性配置...')
        
        try {
          const { transporter: fallbackTransporter } = await this.createTransporter(emailId, true)
          
          // 验证连接
          await fallbackTransporter.verify()

          // 发送测试邮件
          const info = await fallbackTransporter.sendMail({
            from: emailConfig.from,
            to: testRecipient,
            subject: '邮箱配置测试',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">📧 邮箱配置测试</h2>
                <p>这是一封测试邮件，用于验证邮箱配置是否正常工作。</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">配置信息</h3>
                  <p><strong>邮箱名称:</strong> ${emailConfig.name}</p>
                  <p><strong>SMTP主机:</strong> ${emailConfig.host}</p>
                  <p><strong>端口:</strong> ${emailConfig.port}</p>
                  <p><strong>发件人:</strong> ${emailConfig.from}</p>
                  <p><strong>测试时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
                  <p><strong>SSL配置:</strong> 兼容性模式</p>
                </div>
                <p style="color: #666; font-size: 14px;">
                  如果您收到此邮件，说明邮箱配置正常工作（使用兼容性SSL配置）。
                </p>
              </div>
            `
          })

          // 更新成功统计
          await this.updateEmailStats(emailConfig.id, true)

          return {
            success: true,
            messageId: info.messageId,
            response: info.response,
            emailName: `${emailConfig.name} (兼容SSL)`
          }
        } catch (fallbackError) {
          console.error('🔒 兼容性配置测试也失败:', fallbackError.message)
          error = fallbackError
        }
      }
      
      // 更新失败统计
      await this.updateEmailStats(emailConfig.id, false)

      throw new Error(`邮箱测试失败: ${error.message}`)
    }
  }

  // 创建邮件发送器
  async createTransporter(emailId = null, fallbackConfig = false) {
    let emailConfig
    
    if (emailId) {
      emailConfig = this.emailPool.find(email => email.id === emailId && email.active)
      if (!emailConfig) {
        throw new Error('指定的邮箱配置不存在或已禁用')
      }
    } else {
      emailConfig = this.getCurrentEmail()
      if (!emailConfig) {
        throw new Error('没有可用的邮箱配置')
      }
    }

    // 动态配置SSL/TLS设置
    const transporterConfig = {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.password
      }
    }
    
    // 通用SSL/TLS配置
    if (fallbackConfig) {
      // 降级配置：适用于所有邮箱服务商的兼容性配置
      console.log('📡 使用降级SSL配置连接邮箱服务器...')
      
      if (emailConfig.port === 465) {
        // SSL直连端口
        transporterConfig.secure = true
        transporterConfig.tls = {
          rejectUnauthorized: false,
          secureProtocol: 'TLSv1_2_method',
          ciphers: 'ALL'
        }
      } else {
        // STARTTLS端口 (587, 25等)
        transporterConfig.secure = false
        transporterConfig.requireTLS = false
        transporterConfig.tls = {
          rejectUnauthorized: false,
          secureProtocol: 'TLSv1_2_method',
          ciphers: 'ALL'
        }
      }
      
      transporterConfig.connectionTimeout = 60000 // 增加超时时间
      transporterConfig.greetingTimeout = 60000
      transporterConfig.socketTimeout = 60000
    } else {
      // 标准配置：现代安全配置
      if (emailConfig.port === 465) {
        // SSL直连端口
        transporterConfig.secure = true
        transporterConfig.tls = {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
          maxVersion: 'TLSv1.3'
        }
      } else {
        // STARTTLS端口
        transporterConfig.secure = false
        transporterConfig.requireTLS = true
        transporterConfig.tls = {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
          maxVersion: 'TLSv1.3',
          ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA'
        }
      }
      
      transporterConfig.connectionTimeout = 30000
      transporterConfig.greetingTimeout = 30000
      transporterConfig.socketTimeout = 30000
    }
    
    const transporter = nodemailer.createTransport(transporterConfig)

    return { transporter, emailConfig }
  }

  // 发送邮件（带重试机制）
  async sendEmailWithRetry(mailOptions, maxRetries = 3) {
    const activeEmails = this.emailPool.filter(email => email.active)
    
    if (activeEmails.length === 0) {
      throw new Error('没有可用的邮箱配置')
    }

    let lastError = null
    let quotaErrors = []
    
    // 尝试使用每个可用邮箱
    for (let attempt = 0; attempt < Math.min(maxRetries, activeEmails.length); attempt++) {
      let emailConfig = null
      
      try {
        const { transporter, emailConfig: config } = await this.createTransporter()
        emailConfig = config
        
        const result = await transporter.sendMail({
          ...mailOptions,
          from: emailConfig.from
        })

        // 更新成功统计
        await this.updateEmailStats(emailConfig.id, true)

        console.log(`✅ 邮件发送成功，使用邮箱: ${emailConfig.name}`)
        
        return {
          success: true,
          messageId: result.messageId,
          response: result.response,
          emailUsed: emailConfig.name,
          attempt: attempt + 1
        }
      } catch (error) {
        // 如果是SSL/TLS错误，尝试降级配置（适用于所有邮箱服务商）
        if (error.message.toLowerCase().includes('ssl') || 
            error.message.toLowerCase().includes('tls') || 
            error.message.toLowerCase().includes('wrong version number') ||
            error.message.toLowerCase().includes('certificate') ||
            error.message.toLowerCase().includes('handshake') ||
            error.message.toLowerCase().includes('protocol')) {
          
          console.log('🔒 SSL/TLS连接错误，尝试降级配置重新发送...')
          
          try {
            const { transporter: fallbackTransporter } = await this.createTransporter(emailConfig.id, true)
            
            const result = await fallbackTransporter.sendMail({
              ...mailOptions,
              from: emailConfig.from
            })

            // 更新成功统计
            await this.updateEmailStats(emailConfig.id, true)

            console.log(`✅ 使用降级配置邮件发送成功，使用邮箱: ${emailConfig.name}`)
            
            return {
              success: true,
              messageId: result.messageId,
              response: result.response,
              emailUsed: `${emailConfig.name} (兼容SSL)`,
              attempt: attempt + 1
            }
          } catch (fallbackError) {
            console.error('🔒 降级配置也失败:', fallbackError.message)
            error = fallbackError // 使用降级配置的错误作为最终错误
          }
        }
        lastError = error
        
        // 更新失败统计
        if (emailConfig) {
          await this.updateEmailStats(emailConfig.id, false)
        }
        
        const errorMessage = error.message.toLowerCase()
        
        // 检查是否是配额错误
        if (errorMessage.includes('quota') || errorMessage.includes('limit') || 
            errorMessage.includes('rate') || errorMessage.includes('exceed')) {
          quotaErrors.push({
            email: emailConfig?.name || '未知',
            error: error.message
          })
          console.error(`⚠️  邮箱 ${emailConfig?.name || '未知'} 配额超限: ${error.message}`)
          
          // 如果是配额错误，暂时禁用该邮箱
          if (emailConfig) {
            console.warn(`🚫 暂时禁用邮箱: ${emailConfig.name}`)
            // 这里可以考虑添加临时禁用逻辑
          }
        } else if (errorMessage.includes('ssl') || errorMessage.includes('tls') || 
                  errorMessage.includes('wrong version number') ||
                  errorMessage.includes('certificate') ||
                  errorMessage.includes('handshake') ||
                  errorMessage.includes('protocol')) {
          console.error(`🔒 SSL/TLS连接错误 (尝试 ${attempt + 1}):`, error.message)
          console.log('💡 提示：系统将自动尝试兼容性SSL配置')
        } else {
          console.error(`❌ 邮件发送失败 (尝试 ${attempt + 1}):`, error.message)
        }
        
        // 如果不是最后一次尝试，继续下一个邮箱
        if (attempt < Math.min(maxRetries, activeEmails.length) - 1) {
          console.log('🔄 切换到下一个邮箱重试...')
          
          // 配额错误时增加延迟，避免短时间内大量请求
          if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
            await new Promise(resolve => setTimeout(resolve, 2000)) // 2秒延迟
          }
          
          continue
        }
      }
    }

    // 构建详细的错误信息
    let errorDetails = `所有邮箱尝试发送失败，最后错误: ${lastError?.message}`
    
    if (quotaErrors.length > 0) {
      errorDetails += `\n配额超限的邮箱: ${quotaErrors.map(e => `${e.email}(${e.error})`).join(', ')}`
      errorDetails += `\n建议: 请检查邮箱发送配额限制，或添加更多邮箱到邮箱池`
    }

    throw new Error(errorDetails)
  }

  // 获取邮箱池统计信息
  async getPoolStats() {
    await this.ensureInitialized()
    const totalEmails = this.emailPool.length
    const activeEmails = this.emailPool.filter(email => email.active).length
    const inactiveEmails = totalEmails - activeEmails
    
    const totalSuccess = this.emailPool.reduce((sum, email) => sum + (email.successCount || 0), 0)
    const totalFailures = this.emailPool.reduce((sum, email) => sum + (email.failureCount || 0), 0)
    
    const recentlyUsed = this.emailPool.filter(email => {
      if (!email.lastUsed) return false
      const lastUsed = new Date(email.lastUsed)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return lastUsed > oneDayAgo
    }).length

    return {
      totalEmails,
      activeEmails,
      inactiveEmails,
      totalSuccess,
      totalFailures,
      successRate: totalSuccess + totalFailures > 0 ? 
        ((totalSuccess / (totalSuccess + totalFailures)) * 100).toFixed(1) : '0.0',
      recentlyUsed
    }
  }

  // 启用/禁用邮箱
  async toggleEmailStatus(emailId) {
    try {
      // 获取当前状态
      const selectSql = 'SELECT active, name FROM email_pool WHERE id = ?'
      const [existing] = await database.connection.execute(selectSql, [emailId])
      
      if (existing.length === 0) {
        throw new Error('邮箱配置不存在')
      }

      const currentActive = Boolean(existing[0].active)
      const emailName = existing[0].name
      const newActive = !currentActive

      // 更新状态
      const updateSql = 'UPDATE email_pool SET active = ?, updated_at = NOW() WHERE id = ?'
      await database.connection.execute(updateSql, [newActive, emailId])

      // 重新加载邮箱池
      await this.loadEmailPool()

      return {
        id: emailId,
        active: newActive,
        name: emailName
      }
    } catch (error) {
      console.error('❌ 切换邮箱状态失败:', error)
      throw new Error('切换邮箱状态失败：' + error.message)
    }
  }
}

module.exports = new EmailPoolService()
