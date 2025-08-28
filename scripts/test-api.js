#!/usr/bin/env node

const axios = require('axios')

const API_BASE = 'https://united.quantumlight.cc/api'

async function testAPI() {
  console.log('🧪 API 测试工具')
  console.log('================\n')

  try {
    // 1. 测试健康检查
    console.log('1. 测试健康检查...')
    const healthResponse = await axios.get('https://united.quantumlight.cc/health')
    console.log('✅ 健康检查通过:', healthResponse.data)

    // 2. 测试报名提交
    console.log('\n2. 测试报名提交...')
    const registrationData = {
      name: '测试单位',
      contact: '12345678901',
      type: '歌曲',
      programName: '测试歌曲',
      performers: '测试演员',
      copyright: '我确定！',
      description: '这是一个测试报名',
      onCamera: '是'
    }

    const submitResponse = await axios.post(`${API_BASE}/registrations`, registrationData)
    console.log('✅ 报名提交成功:', submitResponse.data)
    
    const registrationId = submitResponse.data.data.registrationId
    console.log('📋 报名编号:', registrationId)

    // 3. 测试报名查询
    console.log('\n3. 测试报名查询...')
    try {
      const queryResponse = await axios.get(`${API_BASE}/registrations/${registrationId}`)
      console.log('✅ 报名查询成功:', queryResponse.data)
    } catch (error) {
      console.log('⚠️  报名查询失败 (这可能是正常的，如果飞书表格字段配置不完整):', error.response?.data || error.message)
    }

    // 4. 测试管理员登录
    console.log('\n4. 测试管理员登录...')
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        employeeCode: 'admin123',
        password: 'admin123',
        type: 'employee'
      })
      console.log('✅ 管理员登录成功')
      
      const token = loginResponse.data.data.token
      
      // 5. 测试获取报名列表
      console.log('\n5. 测试获取报名列表...')
      try {
        const listResponse = await axios.get(`${API_BASE}/registrations`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        console.log('✅ 获取报名列表成功，记录数:', listResponse.data.data.items.length)
      } catch (error) {
        console.log('⚠️  获取报名列表失败:', error.response?.data || error.message)
      }

    } catch (error) {
      console.log('⚠️  管理员登录失败:', error.response?.data || error.message)
    }

    // 6. 测试新闻接口
    console.log('\n6. 测试新闻接口...')
    try {
      const newsResponse = await axios.get(`${API_BASE}/news?limit=3`)
      console.log('✅ 新闻获取成功，文章数:', newsResponse.data.data.items?.length || 0)
    } catch (error) {
      console.log('⚠️  新闻获取失败:', error.response?.data || error.message)
    }

    console.log('\n🎉 API 测试完成！')

  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:', error.message)
    if (error.response) {
      console.error('响应状态:', error.response.status)
      console.error('响应数据:', error.response.data)
    }
  }
}

// 检查服务器是否运行
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

  await testAPI()
}

if (require.main === module) {
  main().catch(console.error)
}
