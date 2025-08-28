#!/usr/bin/env node

const axios = require('axios')

const API_BASE = 'https://united.quantumlight.cc/api'

async function testAdminData() {
  console.log('📊 测试管理员后台数据')
  console.log('====================\n')

  try {
    // 1. 先登录获取token
    console.log('1. 登录获取token...')
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      employeeCode: 'admin123',
      password: 'admin123',
      type: 'employee'
    })
    
    const token = loginResponse.data.data.token
    console.log('✅ 登录成功，token:', token.substring(0, 20) + '...')

    // 2. 测试获取报名列表
    console.log('\n2. 测试获取报名列表...')
    const registrationsResponse = await axios.get(`${API_BASE}/registrations`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    console.log('✅ 报名列表API响应状态:', registrationsResponse.status)
    console.log('📋 响应数据结构:')
    const regData = registrationsResponse.data
    console.log('   - message:', regData.message)
    console.log('   - data.items.length:', regData.data?.items?.length || 0)
    console.log('   - data.total:', regData.data?.total || 0)
    console.log('   - data.hasMore:', regData.data?.hasMore)
    
    if (regData.data?.items?.length > 0) {
      console.log('\n📝 前3条记录示例:')
      regData.data.items.slice(0, 3).forEach((item, index) => {
        console.log(`   记录 ${index + 1}:`)
        console.log(`     - ID: ${item.id}`)
        console.log(`     - 编号: ${item.registrationId}`)
        console.log(`     - 参演单位: ${item.name}`)
        console.log(`     - 作品名称: ${item.programName}`)
        console.log(`     - 状态: ${item.status}`)
        console.log(`     - 创建时间: ${item.createdTime}`)
      })
    } else {
      console.log('⚠️  报名列表为空')
    }

    // 3. 测试仪表板统计数据
    console.log('\n3. 测试仪表板统计数据...')
    const dashboardResponse = await axios.get(`${API_BASE}/stats/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    console.log('✅ 仪表板API响应状态:', dashboardResponse.status)
    const dashData = dashboardResponse.data.data
    console.log('📊 统计数据:')
    console.log('   - 总报名数:', dashData.overview?.totalRegistrations || 0)
    console.log('   - 今日报名:', dashData.overview?.todayRegistrations || 0)
    console.log('   - 待审核:', dashData.overview?.pendingReview || 0)
    console.log('   - 已通过:', dashData.overview?.approved || 0)
    console.log('   - 已驳回:', dashData.overview?.rejected || 0)
    
    if (dashData.recentRegistrations?.length > 0) {
      console.log('\n📅 最近报名:')
      dashData.recentRegistrations.slice(0, 3).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name} - ${item.programName} (${item.status})`)
      })
    }

    // 4. 测试分页
    console.log('\n4. 测试分页功能...')
    const pageResponse = await axios.get(`${API_BASE}/registrations?page=1&pageSize=5`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    console.log('✅ 分页响应:', pageResponse.status)
    console.log('📄 分页数据:')
    console.log('   - 当前页记录数:', pageResponse.data.data?.items?.length || 0)
    console.log('   - 是否还有更多:', pageResponse.data.data?.hasMore)

    console.log('\n🎉 管理员数据测试完成！')

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
    await axios.get('https://united.quantumlight.cc/health', { timeout: 5000 })
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

  await testAdminData()
}

if (require.main === module) {
  main().catch(console.error)
}
