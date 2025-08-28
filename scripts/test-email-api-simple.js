const axios = require('axios')

async function testEmailAPI() {
  console.log('🧪 简单测试邮箱API...')
  
  // 直接测试生产环境
  const baseURL = 'https://united.quantumlight.cc/api'
  console.log('🌐 API基础URL:', baseURL)
  
  try {
    // 测试登录
    console.log('\n🔐 尝试登录...')
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      type: 'username',
      username: 'superadmin',
      password: 'admin123'
    })
    
    const token = loginResponse.data.token
    console.log('✅ 登录成功')
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
    
    // 测试邮箱API
    console.log('\n📧 测试邮箱API...')
    const emailResponse = await axios.get(`${baseURL}/emails`, { headers })
    console.log('✅ 邮箱API访问成功:', {
      状态码: emailResponse.status,
      邮箱数量: emailResponse.data.data?.emails?.length || 0,
      统计信息: emailResponse.data.data?.stats || {}
    })
    
  } catch (error) {
    console.error('❌ 测试失败:', {
      状态码: error.response?.status,
      错误信息: error.response?.data?.message || error.message,
      详细错误: error.response?.data || error.message
    })
  }
}

testEmailAPI()

