const axios = require('axios')

// 调试字段API
async function debugFieldAPI() {
  console.log('🔍 开始调试字段API...')
  
  const baseURL = 'https://united.quantumlight.cc/api'
  
  console.log('🌐 API基础URL:', baseURL)
  
  // 测试未认证访问
  console.log('\n1️⃣ 测试未认证访问')
  try {
    const response = await axios.get(`${baseURL}/fields`)
    console.log('❌ 未认证访问应该失败，但成功了:', response.status)
  } catch (error) {
    console.log('✅ 未认证访问正确被拒绝:', error.response?.status, error.response?.data?.message)
  }
  
  // 获取超级管理员token
  const loginData = {
    type: 'username',
    username: 'superadmin',
    password: 'admin123'
  }
  
  try {
    console.log('\n2️⃣ 超级管理员登录')
    const loginResponse = await axios.post(`${baseURL}/auth/login`, loginData)
    const token = loginResponse.data.token
    const user = loginResponse.data.user
    
    console.log('✅ 登录成功:', {
      username: user.username,
      role: user.role,
      permissions: user.permissions
    })
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
    
    // 测试字段类型配置API
    console.log('\n3️⃣ 测试字段类型配置API')
    try {
      const typesResponse = await axios.get(`${baseURL}/fields/config/types`, { headers })
      console.log('✅ 字段类型API成功:', {
        status: typesResponse.status,
        dataLength: typesResponse.data.data?.length
      })
    } catch (error) {
      console.log('❌ 字段类型API失败:', error.response?.status, error.response?.data)
    }
    
    // 测试字段列表API
    console.log('\n4️⃣ 测试字段列表API')
    try {
      const fieldsResponse = await axios.get(`${baseURL}/fields`, { headers })
      console.log('✅ 字段列表API成功:', {
        status: fieldsResponse.status,
        totalFields: fieldsResponse.data.data?.total,
        fieldsCount: fieldsResponse.data.data?.fields?.length
      })
      
      if (fieldsResponse.data.data?.fields?.length > 0) {
        console.log('字段名称:', fieldsResponse.data.data.fields.map(f => f.name))
      }
    } catch (error) {
      console.log('❌ 字段列表API失败:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        error: error.response?.data
      })
    }
    
    // 测试同步API
    console.log('\n5️⃣ 测试同步API')
    try {
      const syncResponse = await axios.post(`${baseURL}/fields/sync`, {}, { headers })
      console.log('✅ 同步API成功:', {
        status: syncResponse.status,
        totalFields: syncResponse.data.data?.totalFields
      })
    } catch (error) {
      console.log('❌ 同步API失败:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        error: error.response?.data
      })
    }
    
    // 测试普通管理员访问
    console.log('\n6️⃣ 测试普通管理员访问')
    const adminLoginData = {
      type: 'username',
      username: 'admin',
      password: 'admin123'
    }
    
    try {
      const adminLoginResponse = await axios.post(`${baseURL}/auth/login`, adminLoginData)
      const adminToken = adminLoginResponse.data.token
      const adminUser = adminLoginResponse.data.user
      
      console.log('普通管理员信息:', {
        username: adminUser.username,
        role: adminUser.role,
        permissions: adminUser.permissions
      })
      
      const adminHeaders = {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
      
      // 尝试访问字段API
      try {
        await axios.get(`${baseURL}/fields`, { headers: adminHeaders })
        console.log('❌ 普通管理员不应该能访问字段API')
      } catch (error) {
        console.log('✅ 普通管理员正确被拒绝:', error.response?.status, error.response?.data?.message)
      }
    } catch (error) {
      console.log('⚠️  普通管理员登录失败:', error.response?.data?.message)
    }
    
  } catch (error) {
    console.error('💥 登录失败:', error.response?.data || error.message)
  }
}

// 运行调试
if (require.main === module) {
  debugFieldAPI()
    .then(() => {
      console.log('\n🎉 调试完成')
      process.exit(0)
    })
    .catch(error => {
      console.error('调试失败:', error)
      process.exit(1)
    })
}

module.exports = { debugFieldAPI }

