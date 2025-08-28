#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

async function setup() {
  console.log('🚀 联合门户项目初始化设置')
  console.log('================================\n')

  const configPath = path.join(__dirname, '../server/config.js')
  const exampleConfigPath = path.join(__dirname, '../server/config.example.js')

  if (fs.existsSync(configPath)) {
    const overwrite = await askQuestion('配置文件已存在，是否覆盖? (y/N): ')
    if (overwrite.toLowerCase() !== 'y') {
      console.log('设置已取消')
      rl.close()
      return
    }
  }

  console.log('\n请输入配置信息：\n')

  // 基础配置
  const port = await askQuestion('服务器端口 (默认 3001): ') || '3001'
  const clientUrl = await askQuestion('前端地址 (默认 http://localhost:5173): ') || 'http://localhost:5173'
  const jwtSecret = await askQuestion('JWT密钥 (留空自动生成): ') || generateRandomString(32)

  // 管理员配置
  const employeeCode = await askQuestion('管理员员工编码 (默认 admin123): ') || 'admin123'
  const password = await askQuestion('管理员密码 (默认 admin123): ') || 'admin123'
  const passwordHash = bcrypt.hashSync(password, 10)

  // 飞书配置
  console.log('\n飞书配置 (可稍后在config.js中修改):')
  const feishuAppId = await askQuestion('飞书 App ID: ')
  const feishuAppSecret = await askQuestion('飞书 App Secret: ')
  const feishuBitableAppToken = await askQuestion('飞书多维表格 App Token: ')
  const feishuTableId = await askQuestion('飞书 Table ID: ')

  // QQ邮箱配置
  console.log('\nQQ邮箱配置 (可稍后在config.js中修改):')
  const smtpUser = await askQuestion('QQ邮箱地址: ')
  const smtpPass = await askQuestion('QQ邮箱授权码: ')

  // RSS配置
  const rssUrl = await askQuestion('RSS源地址 (默认 https://blog.adventurex.top/rss): ') || 'https://blog.adventurex.top/rss'

  // 生成配置文件
  const config = `// 自动生成的配置文件 - ${new Date().toISOString()}
module.exports = {
  // 服务器配置
  port: ${port},
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT 密钥
  jwtSecret: '${jwtSecret}',

  // 飞书配置
  feishu: {
    appId: '${feishuAppId}',
    appSecret: '${feishuAppSecret}',
    bitableAppToken: '${feishuBitableAppToken}',
    tableId: '${feishuTableId}'
  },

  // QQ邮箱配置
  email: {
    host: 'smtp.qq.com',
    port: 587,
    user: '${smtpUser}',
    pass: '${smtpPass}'
  },

  // 管理员配置
  admin: {
    employeeCode: '${employeeCode}',
    passwordHash: '${passwordHash}'
  },

  // RSS源配置
  rss: {
    feedUrl: '${rssUrl}'
  },

  // 前端URL (CORS配置)
  clientUrl: '${clientUrl}'
}`

  fs.writeFileSync(configPath, config)

  console.log('\n✅ 配置文件已生成: server/config.js')
  console.log('\n📋 管理员账号信息:')
  console.log(`   员工编码: ${employeeCode}`)
  console.log(`   密码: ${password}`)
  
  console.log('\n⚠️  安全提醒:')
  console.log('   1. 请妥善保管管理员账号信息')
  console.log('   2. 生产环境请修改默认密码')
  console.log('   3. 确保配置文件不被提交到版本控制')

  console.log('\n🎉 设置完成！现在可以运行 npm run dev 启动开发服务器')

  rl.close()
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

setup().catch(console.error)
