const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

console.log('🚀 开始安装权限管理系统...')

// 安装后端SQLite依赖
console.log('📦 安装后端依赖...')
try {
  process.chdir(path.join(__dirname, 'server'))
  execSync('npm install sqlite3', { stdio: 'inherit' })
  console.log('✅ 后端依赖安装完成')
} catch (error) {
  console.error('❌ 后端依赖安装失败:', error.message)
  process.exit(1)
}

// 返回项目根目录
process.chdir(__dirname)

// 检查配置文件
const configPath = path.join(__dirname, 'server/config.js')
if (!fs.existsSync(configPath)) {
  console.log('⚠️  配置文件不存在，请复制 config.example.js 到 config.js 并配置')
  process.exit(1)
}

console.log('🎉 权限管理系统安装完成！')
console.log('')
console.log('📋 接下来的步骤：')
console.log('1. 启动后端服务: cd server && npm run dev')
console.log('2. 启动前端服务: cd client && npm run dev')
console.log('3. 使用以下账号登录：')
console.log('   - 超级管理员: superadmin / admin123')
console.log('   - 管理员: admin / admin123')
console.log('4. 登录后请及时修改密码')
console.log('')
console.log('🔐 权限说明：')
console.log('- 超级管理员：拥有所有权限，可以管理用户')
console.log('- 管理员：拥有基础管理权限，由超级管理员分配具体权限')
