#!/usr/bin/env node

const axios = require('axios')

const API_BASE = 'http://localhost:3001/api'

async function testLogin() {
  console.log('🔐 测试管理员登录功能')
  console.log('===================\n')

  try {
    // 测试员工编码登录
    console.log('1. 测试员工编码登录...')
    const loginData = {
      employeeCode: 'admin123',
      password: 'admin123',
      type: 'employee'
    }

    const loginResponse = await axios.post(`${API_BASE}/auth/login`, loginData)
    console.log('✅ 登录响应:', JSON.stringify(loginResponse.data, null, 2))
    
    const token = loginResponse.data.data.token
    const user = loginResponse.data.data.user
    
    console.log('🎫 Token:', token ? token.substring(0, 20) + '...' : 'null')
    console.log('👤 User:', user)

    // 测试token验证
    console.log('\n2. 测试token验证...')
    const verifyResponse = await axios.get(`${API_BASE}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    console.log('✅ 验证响应:', JSON.stringify(verifyResponse.data, null, 2))

    // 测试访问受保护的资源
    console.log('\n3. 测试访问管理员资源...')
    const dashboardResponse = await axios.get(`${API_BASE}/stats/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    console.log('✅ 仪表板数据获取成功，报名记录数:', dashboardResponse.data.data.overview?.totalRegistrations || 0)

    console.log('\n🎉 登录功能测试完成！')

  } catch (error) {
    console.error('\n❌ 测试失败:', error.response?.data || error.message)
    if (error.response) {
      console.error('响应状态:', error.response.status)
      console.error('响应头:', error.response.headers)
    }
  }
}

async function checkServer() {
  try {
    await axios.get('http://localhost:3001/health', { timeout: 5000 })
    return true
  } catch (error) {
    return false
  }
}

async function main() {
  const serverRunning = await checkServer()
  if (!serverRunning) {
    console.log('❌ 服务器未运行，请先启动开发服务器:')
    console.log('   npm run dev')
    process.exit(1)
  }

  await testLogin()
}

if (require.main === module) {
  main().catch(console.error)
}
