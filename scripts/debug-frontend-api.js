#!/usr/bin/env node

const axios = require('axios')

const API_BASE = 'https://united.quantumlight.cc/api'
const FRONTEND_BASE = 'http://localhost:5173'

async function debugFrontendAPI() {
  console.log('🔍 前端API调试')
  console.log('================\n')

  try {
    // 1. 检查服务器状态
    console.log('1. 检查服务器状态...')
    
    try {
      const frontendResponse = await axios.get(FRONTEND_BASE, { timeout: 5000 })
      console.log('✅ 前端服务器响应正常')
    } catch (error) {
      console.log('❌ 前端服务器无响应:', error.message)
      console.log('请确保运行: npm run dev')
      return
    }

    try {
      const backendResponse = await axios.get('https://united.quantumlight.cc/health', { timeout: 5000 })
      console.log('✅ 后端服务器响应正常')
    } catch (error) {
      console.log('❌ 后端服务器无响应:', error.message)
      return
    }

    // 2. 测试API代理（通过前端）
    console.log('\n2. 测试前端API代理...')
    try {
      const proxyResponse = await axios.get(`${FRONTEND_BASE}/api/health`, { timeout: 5000 })
      console.log('✅ 前端API代理工作正常')
    } catch (error) {
      console.log('❌ 前端API代理失败:', error.response?.status, error.message)
      console.log('这可能是Vite代理配置问题')
    }

    // 3. 直接测试后端API
    console.log('\n3. 测试后端API端点...')
    
    // 测试新闻API
    try {
      const newsResponse = await axios.get(`${API_BASE}/news`)
      console.log('✅ 新闻API响应正常')
      console.log('📰 新闻数据:', newsResponse.data.data?.items?.length || 0, '条')
    } catch (error) {
      console.log('❌ 新闻API失败:', error.response?.status, error.message)
    }

    // 测试管理员登录和数据
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        employeeCode: 'admin123',
        password: 'admin123',
        type: 'employee'
      })
      
      const token = loginResponse.data.data.token
      console.log('✅ 管理员登录成功')
      
      // 测试报名数据
      const regResponse = await axios.get(`${API_BASE}/registrations`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      console.log('✅ 报名数据获取成功')
      console.log('📋 报名记录:', regResponse.data.data.items.length, '条')
      
      // 测试仪表板数据
      const dashResponse = await axios.get(`${API_BASE}/stats/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      console.log('✅ 仪表板数据获取成功')
      console.log('📊 统计数据:', JSON.stringify(dashResponse.data.data.stats, null, 2))
      
    } catch (error) {
      console.log('❌ 管理员API失败:', error.response?.status, error.message)
    }

    // 4. 检查CORS配置
    console.log('\n4. 检查CORS配置...')
    try {
      const corsResponse = await axios.get(`${API_BASE}/news`, {
        headers: {
          'Origin': FRONTEND_BASE
        }
      })
      console.log('✅ CORS配置正常')
    } catch (error) {
      console.log('❌ CORS配置问题:', error.message)
    }

  } catch (error) {
    console.error('❌ 调试过程出错:', error.message)
  }
}

if (require.main === module) {
  debugFrontendAPI().catch(console.error)
}
