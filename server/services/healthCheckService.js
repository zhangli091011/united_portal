const axios = require('axios')
const config = require('../config')
const database = require('./database')
const feishuService = require('./feishuService')
const emailService = require('./emailService')
const fs = require('fs').promises
const path = require('path')

class HealthCheckService {
  constructor() {
    this.checks = {
      database: this.checkDatabase.bind(this),
      feishu: this.checkFeishu.bind(this),
      email: this.checkEmail.bind(this),
      rss: this.checkRSS.bind(this),
      halo: this.checkHalo.bind(this),
      filesystem: this.checkFilesystem.bind(this),
      memory: this.checkMemory.bind(this),
      diskSpace: this.checkDiskSpace.bind(this)
    }
  }

  // 执行所有健康检查
  async runAllChecks() {
    const results = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      checks: {},
      summary: {
        total: Object.keys(this.checks).length,
        healthy: 0,
        warning: 0,
        error: 0
      }
    }

    for (const [name, checkFn] of Object.entries(this.checks)) {
      try {
        console.log(`🔍 运行健康检查: ${name}`)
        const result = await checkFn()
        results.checks[name] = result
        
        // 更新统计
        if (result.status === 'healthy') {
          results.summary.healthy++
        } else if (result.status === 'warning') {
          results.summary.warning++
        } else {
          results.summary.error++
        }
      } catch (error) {
        console.error(`❌ 健康检查失败: ${name}`, error)
        results.checks[name] = {
          status: 'error',
          message: `检查执行失败: ${error.message}`,
          timestamp: new Date().toISOString(),
          error: error.stack
        }
        results.summary.error++
      }
    }

    // 确定整体状态
    if (results.summary.error > 0) {
      results.overall = 'error'
    } else if (results.summary.warning > 0) {
      results.overall = 'warning'
    }

    console.log(`✅ 健康检查完成: ${results.overall} (${results.summary.healthy}/${results.summary.total} 正常)`)
    return results
  }

  // 执行单个健康检查
  async runCheck(checkName) {
    if (!this.checks[checkName]) {
      throw new Error(`未知的检查项: ${checkName}`)
    }

    try {
      const result = await this.checks[checkName]()
      return {
        [checkName]: result,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        [checkName]: {
          status: 'error',
          message: `检查执行失败: ${error.message}`,
          timestamp: new Date().toISOString(),
          error: error.stack
        },
        timestamp: new Date().toISOString()
      }
    }
  }

  // 数据库连接检查
  async checkDatabase() {
    const startTime = Date.now()
    
    try {
      if (!database.isAvailable) {
        return {
          status: 'error',
          message: '数据库连接不可用',
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime
        }
      }

      // 执行简单查询测试
      const [rows] = await database.connection.execute('SELECT 1 as test')
      
      // 检查表是否存在
      const [tables] = await database.connection.execute(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE()"
      )

      const responseTime = Date.now() - startTime

      return {
        status: 'healthy',
        message: '数据库连接正常',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          host: database.connection.config.host,
          database: database.connection.config.database,
          user: database.connection.config.user,
          tables: tables[0].count,
          charset: database.connection.config.charset
        }
      }
    } catch (error) {
      return {
        status: 'error',
        message: `数据库连接失败: ${error.message}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.code || error.errno
      }
    }
  }

  // 飞书服务检查
  async checkFeishu() {
    const startTime = Date.now()
    
    try {
      // 检查配置
      if (!config.feishu.appId || !config.feishu.appSecret) {
        return {
          status: 'warning',
          message: '飞书配置不完整',
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          details: {
            appId: !!config.feishu.appId,
            appSecret: !!config.feishu.appSecret,
            bitableAppToken: !!config.feishu.bitableAppToken,
            tableId: !!config.feishu.tableId
          }
        }
      }

      // 测试获取访问令牌
      const token = await feishuService.getAccessToken()

      // 按照飞书多维表格API文档（search接口）进行API调用
      // 参考：https://open.feishu.cn/document/docs/bitable-v1/app-table-record/search?appId=cli_a82fdfd8ca7d900b
      await feishuService.makeRequest(
        'POST',
        `/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/records/search`,
        {}, // body可以为空，表示只做可访问性检查
      )

      const responseTime = Date.now() - startTime

      return {
        status: 'healthy',
        message: '飞书服务连接正常',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          baseURL: feishuService.baseURL,
          appId: config.feishu.appId,
          bitableAppToken: config.feishu.bitableAppToken ? '已配置' : '未配置',
          tableId: config.feishu.tableId ? '已配置' : '未配置',
          tokenValid: !!token
        }
      }
    } catch (error) {
      return {
        status: 'error',
        message: `飞书服务连接失败: ${error.message}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.response?.status || error.code
      }
    }
  }

  // 邮件服务检查
  async checkEmail() {
    const startTime = Date.now()
    
    try {
      // 检查配置
      if (!config.email.host || !config.email.user || !config.email.pass) {
        return {
          status: 'warning',
          message: '邮件配置不完整',
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          details: {
            host: !!config.email.host,
            user: !!config.email.user,
            pass: !!config.email.pass,
            port: config.email.port
          }
        }
      }

      // 测试SMTP连接
      await emailService.verifyConnection()

      const responseTime = Date.now() - startTime

      return {
        status: 'healthy',
        message: 'SMTP服务连接正常',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          host: config.email.host,
          port: config.email.port,
          user: config.email.user,
          secure: config.email.port === 465
        }
      }
    } catch (error) {
      return {
        status: 'error',
        message: `邮件服务连接失败: ${error.message}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.code
      }
    }
  }

  // RSS源检查
  async checkRSS() {
    const startTime = Date.now()
    
    try {
      if (!config.rss.feedUrl) {
        return {
          status: 'warning',
          message: 'RSS源未配置',
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime
        }
      }

      const response = await axios.get(config.rss.feedUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'United Portal Health Check'
        }
      })

      const responseTime = Date.now() - startTime

      // 简单检查XML格式
      const isValidXML = response.data.includes('<rss') || response.data.includes('<feed')

      return {
        status: isValidXML ? 'healthy' : 'warning',
        message: isValidXML ? 'RSS源访问正常' : 'RSS源格式可能有问题',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          url: config.rss.feedUrl,
          statusCode: response.status,
          contentType: response.headers['content-type'],
          contentLength: response.headers['content-length'] || response.data.length,
          isValidXML
        }
      }
    } catch (error) {
      return {
        status: 'error',
        message: `RSS源访问失败: ${error.message}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.code || error.response?.status
      }
    }
  }

  // Halo博客检查
  async checkHalo() {
    const startTime = Date.now()
    
    try {
      if (!config.halo.baseUrl || !config.halo.token) {
        return {
          status: 'warning',
          message: 'Halo博客未配置',
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          details: {
            enabled: config.halo.enabled,
            baseUrl: !!config.halo.baseUrl,
            token: !!config.halo.token
          }
        }
      }

      if (!config.halo.enabled) {
        return {
          status: 'warning',
          message: 'Halo博客集成已禁用',
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          details: {
            enabled: false,
            baseUrl: config.halo.baseUrl,
            autoPublish: config.halo.autoPublish
          }
        }
      }

      // 测试Halo API
      const response = await axios.get(`${config.halo.baseUrl}/api/posts`, {
        headers: {
          'Authorization': `Bearer ${config.halo.token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })

      const responseTime = Date.now() - startTime

      return {
        status: 'healthy',
        message: 'Halo博客连接正常',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          baseUrl: config.halo.baseUrl,
          enabled: config.halo.enabled,
          autoPublish: config.halo.autoPublish,
          defaultCategory: config.halo.defaultCategory,
          statusCode: response.status
        }
      }
    } catch (error) {
      return {
        status: 'error',
        message: `Halo博客连接失败: ${error.message}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.response?.status || error.code
      }
    }
  }

  // 文件系统检查
  async checkFilesystem() {
    const startTime = Date.now()
    
    try {
      const paths = [
        { path: 'uploads', required: false, description: '上传目录' },
        { path: 'data', required: true, description: '数据目录' },
        { path: 'data/settings.json', required: true, description: '设置文件' }
      ]

      const results = []
      let hasErrors = false

      for (const item of paths) {
        try {
          const stats = await fs.stat(item.path)
          results.push({
            path: item.path,
            exists: true,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime.toISOString(),
            readable: true,
            writable: true
          })
        } catch (error) {
          if (item.required) {
            hasErrors = true
          }
          results.push({
            path: item.path,
            exists: false,
            required: item.required,
            error: error.code
          })
        }
      }

      const responseTime = Date.now() - startTime

      return {
        status: hasErrors ? 'error' : 'healthy',
        message: hasErrors ? '关键文件或目录缺失' : '文件系统检查正常',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          paths: results,
          workingDirectory: process.cwd(),
          nodeVersion: process.version
        }
      }
    } catch (error) {
      return {
        status: 'error',
        message: `文件系统检查失败: ${error.message}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.code
      }
    }
  }

  // 内存使用检查
  async checkMemory() {
    const startTime = Date.now()
    
    try {
      const usage = process.memoryUsage()
      const totalMemory = usage.rss + usage.heapUsed + usage.external
      const memoryThreshold = 500 * 1024 * 1024 // 500MB
      
      const status = totalMemory > memoryThreshold ? 'warning' : 'healthy'
      const message = status === 'warning' ? '内存使用较高' : '内存使用正常'

      return {
        status,
        message,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: {
          rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
          external: Math.round(usage.external / 1024 / 1024) + 'MB',
          total: Math.round(totalMemory / 1024 / 1024) + 'MB',
          uptime: Math.round(process.uptime()) + 's'
        }
      }
    } catch (error) {
      return {
        status: 'error',
        message: `内存检查失败: ${error.message}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.message
      }
    }
  }

  // 磁盘空间检查
  async checkDiskSpace() {
    const startTime = Date.now()
    
    try {
      // 对于Windows和Unix系统，使用不同的方法检查磁盘空间
      const isWindows = process.platform === 'win32'
      let diskInfo = null

      if (isWindows) {
        // Windows: 使用dir命令获取磁盘信息
        const { exec } = require('child_process')
        const { promisify } = require('util')
        const execAsync = promisify(exec)
        
        try {
          const { stdout } = await execAsync('dir /-c')
          const match = stdout.match(/(\d+) bytes free/)
          if (match) {
            const freeBytes = parseInt(match[1])
            diskInfo = {
              free: Math.round(freeBytes / 1024 / 1024 / 1024 * 100) / 100 + 'GB',
              platform: 'Windows'
            }
          }
        } catch (cmdError) {
          // 如果命令失败，只记录警告
          diskInfo = { platform: 'Windows', error: '无法获取磁盘信息' }
        }
      } else {
        // Unix/Linux: 使用df命令
        const { exec } = require('child_process')
        const { promisify } = require('util')
        const execAsync = promisify(exec)
        
        try {
          const { stdout } = await execAsync('df -h .')
          const lines = stdout.split('\n')
          if (lines.length > 1) {
            const parts = lines[1].split(/\s+/)
            diskInfo = {
              filesystem: parts[0],
              size: parts[1],
              used: parts[2], 
              available: parts[3],
              usePercent: parts[4],
              platform: 'Unix/Linux'
            }
          }
        } catch (cmdError) {
          diskInfo = { platform: 'Unix/Linux', error: '无法获取磁盘信息' }
        }
      }

      const responseTime = Date.now() - startTime

      // 如果无法获取磁盘信息，返回警告状态
      if (!diskInfo || diskInfo.error) {
        return {
          status: 'warning',
          message: '无法获取磁盘空间信息',
          timestamp: new Date().toISOString(),
          responseTime,
          details: diskInfo || { platform: process.platform }
        }
      }

      // 检查磁盘使用率（如果有的话）
      let status = 'healthy'
      let message = '磁盘空间充足'
      
      if (diskInfo.usePercent) {
        const usePercent = parseInt(diskInfo.usePercent.replace('%', ''))
        if (usePercent > 90) {
          status = 'error'
          message = '磁盘空间不足'
        } else if (usePercent > 80) {
          status = 'warning' 
          message = '磁盘空间使用率较高'
        }
      }

      return {
        status,
        message,
        timestamp: new Date().toISOString(),
        responseTime,
        details: diskInfo
      }
    } catch (error) {
      return {
        status: 'warning',
        message: `磁盘空间检查失败: ${error.message}`,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error.message
      }
    }
  }

  // 获取系统信息
  getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    }
  }
}

module.exports = new HealthCheckService()
