const bcrypt = require('bcryptjs')
const database = require('../services/database')
const config = require('../config')

async function createSuperAdmin() {
  try {
    console.log('🚀 开始初始化超级管理员...')

    // 等待数据库初始化完成
    console.log('等待数据库连接...')
    let retries = 0
    const maxRetries = 10
    
    while (!database.isAvailable && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      retries++
      console.log(`等待数据库连接... (${retries}/${maxRetries})`)
    }
    
    if (!database.isAvailable) {
      console.log('⚠️  数据库连接超时，跳过超级管理员初始化')
      console.log('💡 提示：请检查MySQL数据库连接配置')
      return
    }
    
    console.log('✅ 数据库连接成功，开始初始化用户')

    // 检查是否已存在超级管理员
    const existingSuperAdmin = await database.getUserByUsername('superadmin')
    if (existingSuperAdmin) {
      console.log('⚠️  超级管理员已存在，跳过创建')
      return
    }

    // 创建超级管理员
    const superAdminData = {
      username: 'superadmin',
      email: 'admin@united.com',
      passwordHash: config.admin.passwordHash, // 使用配置文件中的密码哈希
      role: 'super_admin',
      permissions: [
        'user.view', 'user.create', 'user.edit', 'user.delete', 'user.manage_permissions',
        'registration.view', 'registration.edit', 'registration.delete', 'registration.export',
        'news.manage', 'theme.manage', 'settings.manage', 'stats.view',
        'field.view', 'field.manage', 'email.manage'
      ],
      createdBy: null // 超级管理员没有创建者
    }

    const superAdmin = await database.createUser(superAdminData)
    console.log('✅ 超级管理员创建成功:', {
      id: superAdmin.id,
      username: superAdmin.username,
      role: superAdmin.role
    })

    // 创建默认管理员（原来的admin用户）
    const existingAdmin = await database.getUserByUsername('admin')
    if (!existingAdmin) {
      const adminData = {
        username: 'admin',
        email: 'admin2@united.com',
        passwordHash: config.admin.passwordHash,
        role: 'admin',
        permissions: [
          'registration.view', 'registration.edit', 'registration.delete', 'registration.export',
          'news.manage', 'stats.view'
        ],
        createdBy: superAdmin.id
      }

      const admin = await database.createUser(adminData)
      console.log('✅ 默认管理员创建成功:', {
        id: admin.id,
        username: admin.username,
        role: admin.role
      })
    }

    console.log('🎉 初始化完成！')
    console.log('超级管理员账号: superadmin')
    console.log('管理员账号: admin')
    console.log('密码: admin123 (请及时修改)')

  } catch (error) {
    console.error('❌ 初始化失败:', error)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createSuperAdmin().then(() => {
    process.exit(0)
  })
}

module.exports = createSuperAdmin
