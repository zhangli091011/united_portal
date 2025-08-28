#!/usr/bin/env node

const database = require('../services/database')

async function updateLogTables() {
  console.log('🔧 开始更新日志表结构...')
  
  try {
    // 等待数据库连接
    let attempts = 0
    const maxAttempts = 30
    
    while (attempts < maxAttempts) {
      if (database.isAvailable && database.connection) {
        break
      }
      console.log(`⏳ 等待数据库连接... (${attempts + 1}/${maxAttempts})`)
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
    }
    
    if (!database.isAvailable) {
      throw new Error('数据库连接超时')
    }
    
    console.log('✅ 数据库连接成功')
    
    // 更新 login_logs 表的 login_type 字段
    const alterSQL = `
      ALTER TABLE login_logs 
      MODIFY COLUMN login_type ENUM('admin', 'feishu', 'employee', 'username') NOT NULL DEFAULT 'admin'
    `
    
    await database.connection.execute(alterSQL)
    console.log('✅ 登录日志表 login_type 字段更新成功')
    
    // 验证表结构
    const [result] = await database.connection.execute(`
      DESCRIBE login_logs
    `)
    
    const loginTypeField = result.find(field => field.Field === 'login_type')
    console.log('📋 login_type 字段信息:', loginTypeField)
    
    console.log('🎉 数据库表结构更新完成！')
    
  } catch (error) {
    console.error('❌ 更新表结构失败:', error.message)
    if (error.message.includes('Unknown column')) {
      console.log('ℹ️ 这可能是因为表还不存在，请先启动服务器创建表')
    }
  } finally {
    process.exit(0)
  }
}

// 运行更新
updateLogTables()



