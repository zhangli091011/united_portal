#!/usr/bin/env node

const logService = require('../services/logService')

async function testLogging() {
  console.log('🧪 开始测试日志系统...')
  
  try {
    // 确保日志服务已初始化
    await logService.ensureInitialized()
    console.log('✅ 日志服务初始化成功')
    
    // 测试登录日志
    console.log('\n📝 测试登录日志记录...')
    const loginLogId = await logService.logLogin({
      userId: 'test_user_123',
      username: 'test_user',
      loginType: 'admin',
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
      status: 'success',
      failureReason: null,
      location: 'Beijing, China'
    })
    console.log(`✅ 登录日志记录成功，ID: ${loginLogId}`)
    
    // 测试操作日志
    console.log('\n📝 测试操作日志记录...')
    const operationLogId = await logService.logOperation({
      userId: 'test_user_123',
      username: 'test_user',
      action: 'create',
      resource: 'users',
      resourceId: 'user_456',
      details: {
        created: {
          username: 'new_user',
          email: 'new_user@example.com',
          role: 'admin'
        }
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
      status: 'success',
      errorMessage: null
    })
    console.log(`✅ 操作日志记录成功，ID: ${operationLogId}`)
    
    // 测试获取日志统计
    console.log('\n📊 测试日志统计查询...')
    const stats = await logService.getLogStats(7)
    console.log('✅ 日志统计查询成功:')
    console.log(`   - 登录次数: ${stats.loginStats.totalLogins}`)
    console.log(`   - 操作次数: ${stats.operationStats.totalOperations}`)
    console.log(`   - 活跃用户: ${stats.loginStats.uniqueUsers}`)
    
    // 测试获取登录日志
    console.log('\n📋 测试登录日志查询...')
    const loginLogs = await logService.getLoginLogs({
      page: 1,
      pageSize: 5
    })
    console.log(`✅ 查询到 ${loginLogs.items.length} 条登录日志`)
    
    // 测试获取操作日志
    console.log('\n📋 测试操作日志查询...')
    const operationLogs = await logService.getOperationLogs({
      page: 1,
      pageSize: 5
    })
    console.log(`✅ 查询到 ${operationLogs.items.length} 条操作日志`)
    
    console.log('\n🎉 所有日志系统测试通过！')
    
    // 可选：清理测试数据
    console.log('\n🧹 清理测试数据...')
    // 这里可以添加清理代码，但为了演示保留测试数据
    console.log('✅ 保留测试数据用于演示')
    
  } catch (error) {
    console.error('❌ 日志系统测试失败:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

// 运行测试
testLogging()



