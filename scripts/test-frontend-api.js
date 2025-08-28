#!/usr/bin/env node

const axios = require('axios')

const FRONTEND_URL = 'http://localhost:5173'
const API_BASE = 'https://united.quantumlight.cc/api'

async function testFrontendAPI() {
  console.log('🔍 测试前端API连接')
  console.log('===================\n')

  try {
    // 1. 检查前端是否运行
    console.log('1. 检查前端服务器...')
    try {
      await axios.get(FRONTEND_URL, { timeout: 5000 })
      console.log('✅ 前端服务器运行正常')
    } catch (error) {
      console.log('❌ 前端服务器未运行，请先启动: npm run client:dev')
      return
    }

    // 2. 测试跨域请求
    console.log('\n2. 测试API跨域请求...')
    try {
      const response = await axios.get(`${API_BASE}/news`, {
        headers: {
          'Origin': FRONTEND_URL,
          'Access-Control-Request-Method': 'GET'
        }
      })
      console.log('✅ 新闻API响应正常')
      console.log('📰 新闻数据:', response.data.message)
      console.log('📰 新闻条数:', response.data.data?.items?.length || 0)
    } catch (error) {
      console.log('❌ 新闻API请求失败:', error.response?.status, error.message)
    }

    // 3. 测试管理员API（需要登录）
    console.log('\n3. 测试管理员API...')
    try {
      // 先登录
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        employeeCode: 'admin123',
        password: 'admin123',
        type: 'employee'
      })
      
      const token = loginResponse.data.data.token
      console.log('✅ 登录成功')
      
      // 测试获取报名数据
      const regResponse = await axios.get(`${API_BASE}/registrations`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Origin': FRONTEND_URL
        }
      })
      
      console.log('✅ 报名数据获取成功')
      console.log('📋 报名记录数:', regResponse.data.data?.items?.length || 0)
      
    } catch (error) {
      console.log('❌ 管理员API请求失败:', error.response?.status, error.message)
    }

    // 4. 测试具体的前端环境变量
    console.log('\n4. 检查前端配置...')
    console.log('预期API地址:', API_BASE)
    console.log('前端地址:', FRONTEND_URL)

  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  }
}

async function checkServices() {
  console.log('🔧 服务状态检查')
  console.log('================')
  
  // 检查后端
  try {
    await axios.get('http://localhost:3001/health', { timeout: 3000 })
    console.log('✅ 后端服务正常 (3001)')
  } catch (error) {
    console.log('❌ 后端服务未运行 (3001)')
  }
  
  // 检查前端
  try {
    await axios.get('http://localhost:5173', { timeout: 3000 })
    console.log('✅ 前端服务正常 (5173)')
  } catch (error) {
    console.log('❌ 前端服务未运行 (5173)')
  }
  
  console.log('')
}

async function main() {
  await checkServices()
  await testFrontendAPI()
}

if (require.main === module) {
  main().catch(console.error)
}
