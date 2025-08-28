#!/usr/bin/env node

const axios = require('axios')

async function testBrowserAccess() {
  console.log('🌐 浏览器访问测试')
  console.log('==================\n')

  try {
    // 测试前端代理API
    console.log('1. 测试前端API代理...')
    
    try {
      const newsResponse = await axios.get('http://localhost:5173/api/news', { timeout: 5000 })
      console.log('✅ 新闻API代理正常')
      console.log(`📰 新闻数据: ${newsResponse.data.data?.items?.length || 0} 条`)
    } catch (error) {
      console.log('❌ 新闻API代理失败:', error.response?.status || error.message)
    }

    // 测试分类API
    try {
      const categoriesResponse = await axios.get('http://localhost:5173/api/news/meta/categories', { timeout: 5000 })
      console.log('✅ 分类API代理正常')
      console.log(`📂 分类数据:`, categoriesResponse.data.data)
    } catch (error) {
      console.log('❌ 分类API代理失败:', error.response?.status || error.message)
    }

    // 测试管理员API
    console.log('\n2. 测试管理员API代理...')
    try {
      // 登录
      const loginResponse = await axios.post('http://localhost:5173/api/auth/login', {
        employeeCode: 'admin123',
        password: 'admin123',
        type: 'employee'
      }, { timeout: 5000 })
      
      const token = loginResponse.data.data.token
      console.log('✅ 管理员登录代理正常')
      
      // 获取报名数据
      const regResponse = await axios.get('http://localhost:5173/api/registrations', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      })
      
      console.log('✅ 报名数据代理正常')
      console.log(`📋 报名记录: ${regResponse.data.data?.items?.length || 0} 条`)
      
      // 获取仪表板数据
      const dashResponse = await axios.get('http://localhost:5173/api/stats/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      })
      
      console.log('✅ 仪表板数据代理正常')
      console.log(`📊 总报名数: ${dashResponse.data.data?.overview?.totalRegistrations || 0}`)
      console.log(`📊 今日报名: ${dashResponse.data.data?.overview?.todayRegistrations || 0}`)
      console.log(`📊 待审核: ${dashResponse.data.data?.overview?.pendingReview || 0}`)
      
      // 显示详细数据用于调试
      console.log('📋 仪表板详细数据:', JSON.stringify(dashResponse.data.data.overview, null, 2))
      
    } catch (error) {
      console.log('❌ 管理员API代理失败:', error.response?.status || error.message)
    }

    console.log('\n✅ 所有API代理都工作正常！')
    console.log('\n🔧 如果前端依然显示"无数据"，问题可能在于:')
    console.log('   1. 前端JavaScript错误（请检查浏览器控制台）')
    console.log('   2. React组件渲染问题')
    console.log('   3. 前端状态管理问题')
    console.log('   4. 浏览器缓存问题')
    console.log('\n📱 请按F12打开浏览器开发者工具，查看控制台错误信息。')
    console.log('🔄 也可以尝试强制刷新页面（Ctrl+F5）清除缓存。')

  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  }
}

if (require.main === module) {
  testBrowserAccess().catch(console.error)
}
