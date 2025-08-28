const axios = require('axios')

// 配置基础URL
const BASE_URL = 'http://localhost:5170/api'

async function testHealthCheck() {
  console.log('🔍 开始测试健康检查API...\n')

  try {
    // 测试公开状态端点
    console.log('1. 测试公开状态端点 (/health/status)')
    const statusResponse = await axios.get(`${BASE_URL}/health/status`)
    console.log('✅ 状态:', statusResponse.data)
    console.log('   响应时间:', statusResponse.headers['x-response-time'] || 'N/A')
    console.log('')

    // 测试获取可用检查项（需要登录）
    console.log('2. 测试获取可用检查项 (/health/checks)')
    try {
      const checksResponse = await axios.get(`${BASE_URL}/health/checks`)
      console.log('✅ 可用检查项:', Object.keys(checksResponse.data.data))
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  需要登录权限 (预期行为)')
      } else {
        console.log('❌ 错误:', error.message)
      }
    }
    console.log('')

    // 测试详细健康检查（需要登录）
    console.log('3. 测试详细健康检查 (/health/check)')
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health/check`)
      console.log('✅ 详细检查结果:', healthResponse.data.data.overall)
      console.log('   检查项数量:', healthResponse.data.data.summary.total)
      console.log('   正常服务:', healthResponse.data.data.summary.healthy)
      console.log('   警告服务:', healthResponse.data.data.summary.warning)
      console.log('   异常服务:', healthResponse.data.data.summary.error)
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  需要登录权限 (预期行为)')
      } else {
        console.log('❌ 错误:', error.message)
      }
    }
    console.log('')

    // 测试单项检查（需要登录）
    console.log('4. 测试单项检查 (/health/check/database)')
    try {
      const dbCheckResponse = await axios.get(`${BASE_URL}/health/check/database`)
      console.log('✅ 数据库检查:', dbCheckResponse.data.data.database.status)
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  需要登录权限 (预期行为)')
      } else {
        console.log('❌ 错误:', error.message)
      }
    }
    console.log('')

    // 测试系统信息（需要登录）
    console.log('5. 测试系统信息 (/health/system)')
    try {
      const systemResponse = await axios.get(`${BASE_URL}/health/system`)
      console.log('✅ 系统信息:')
      console.log('   平台:', systemResponse.data.data.platform)
      console.log('   Node版本:', systemResponse.data.data.nodeVersion)
      console.log('   运行时间:', Math.round(systemResponse.data.data.uptime), '秒')
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  需要登录权限 (预期行为)')
      } else {
        console.log('❌ 错误:', error.message)
      }
    }
    console.log('')

    console.log('🎉 健康检查API测试完成！')
    console.log('\n📝 说明:')
    console.log('   - /health/status 是公开端点，无需认证')
    console.log('   - 其他端点需要管理员权限')
    console.log('   - 在生产环境中，请确保正确配置认证')

  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 提示: 请确保后端服务正在运行 (npm start)')
    }
  }
}

// 如果是直接运行脚本
if (require.main === module) {
  testHealthCheck()
}

module.exports = { testHealthCheck }
