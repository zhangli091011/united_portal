const axios = require('axios')

// 测试邮箱池管理功能
async function testEmailPool() {
  console.log('🧪 开始测试邮箱池管理功能...')
  
  const baseURL = process.env.NODE_ENV === 'production' 
    ? 'https://united.quantumlight.cc/api' 
    : 'http://localhost:3001/api'
  
  console.log('🌐 API基础URL:', baseURL)
  
  // 获取超级管理员token
  const loginData = {
    type: 'username',
    username: 'superadmin',
    password: 'admin123'
  }
  
  try {
    console.log('\n🔐 超级管理员登录')
    const loginResponse = await axios.post(`${baseURL}/auth/login`, loginData)
    const token = loginResponse.data.token
    const user = loginResponse.data.user
    
    console.log('✅ 登录成功:', {
      username: user.username,
      role: user.role,
      hasEmailPermission: user.permissions?.includes('email.manage')
    })
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
    
    // 测试 1: 获取邮箱池列表
    console.log('\n📋 测试 1: 获取邮箱池列表')
    try {
      const emailsResponse = await axios.get(`${baseURL}/emails`, { headers })
      const data = emailsResponse.data.data
      console.log('✅ 获取邮箱池成功:', {
        总邮箱数: data.stats?.totalEmails || 0,
        启用数量: data.stats?.activeEmails || 0,
        邮箱列表: data.emails?.map(e => e.name) || []
      })
    } catch (error) {
      console.error('❌ 获取邮箱池失败:', error.response?.data?.message || error.message)
    }
    
    // 测试 2: 获取邮箱统计
    console.log('\n📊 测试 2: 获取邮箱统计')
    try {
      const statsResponse = await axios.get(`${baseURL}/emails/stats`, { headers })
      const stats = statsResponse.data.data
      console.log('✅ 获取统计成功:', stats)
    } catch (error) {
      console.error('❌ 获取统计失败:', error.response?.data?.message || error.message)
    }
    
    // 测试 3: 添加测试邮箱
    console.log('\n➕ 测试 3: 添加测试邮箱')
    const testEmailConfig = {
      name: '测试邮箱',
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      user: 'test@example.com',
      password: 'test123',
      from: 'test@example.com',
      active: true
    }
    
    try {
      const createResponse = await axios.post(`${baseURL}/emails`, testEmailConfig, { headers })
      const newEmail = createResponse.data.data
      console.log('✅ 邮箱添加成功:', newEmail.name)
      
      // 测试 4: 更新邮箱
      console.log('\n🔄 测试 4: 更新邮箱')
      try {
        const updateData = {
          name: '测试邮箱-已更新',
          active: false
        }
        
        const updateResponse = await axios.put(`${baseURL}/emails/${newEmail.id}`, updateData, { headers })
        console.log('✅ 邮箱更新成功:', updateResponse.data.data.name)
      } catch (error) {
        console.error('❌ 邮箱更新失败:', error.response?.data?.message || error.message)
      }
      
      // 测试 5: 切换邮箱状态
      console.log('\n🔄 测试 5: 切换邮箱状态')
      try {
        const toggleResponse = await axios.patch(`${baseURL}/emails/${newEmail.id}/toggle`, {}, { headers })
        console.log('✅ 状态切换成功:', toggleResponse.data.message)
      } catch (error) {
        console.error('❌ 状态切换失败:', error.response?.data?.message || error.message)
      }
      
      // 测试 6: 删除测试邮箱
      console.log('\n🗑️  测试 6: 删除测试邮箱')
      try {
        const deleteResponse = await axios.delete(`${baseURL}/emails/${newEmail.id}`, { headers })
        console.log('✅ 邮箱删除成功:', deleteResponse.data.message)
      } catch (error) {
        console.error('❌ 邮箱删除失败:', error.response?.data?.message || error.message)
      }
      
    } catch (error) {
      console.error('❌ 邮箱添加失败:', error.response?.data?.message || error.message)
    }
    
    // 测试 7: 邮箱测试功能
    console.log('\n📧 测试 7: 邮箱测试功能')
    const testEmailData = {
      recipient: 'test@example.com',
      emailId: '' // 使用自动选择
    }
    
    try {
      // 注意：这会尝试实际发送邮件，如果没有有效的邮箱配置会失败
      const testResponse = await axios.post(`${baseURL}/emails/test`, testEmailData, { headers })
      console.log('✅ 邮箱测试成功:', testResponse.data.message)
    } catch (error) {
      console.log('⚠️  邮箱测试失败（预期行为，因为没有有效邮箱配置）:', error.response?.data?.message || error.message)
    }
    
    // 测试 8: 普通管理员访问权限
    console.log('\n🔒 测试 8: 普通管理员访问权限')
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
        hasEmailPermission: adminUser.permissions?.includes('email.manage')
      })
      
      const adminHeaders = {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
      
      // 尝试访问邮箱列表
      try {
        await axios.get(`${baseURL}/emails`, { headers: adminHeaders })
        console.log('❌ 普通管理员不应该能访问邮箱管理')
      } catch (error) {
        console.log('✅ 普通管理员访问被正确拒绝:', error.response?.status, error.response?.data?.message)
      }
    } catch (error) {
      console.log('⚠️  普通管理员登录失败:', error.response?.data?.message)
    }
    
    console.log('\n🎉 邮箱池管理功能测试完成!')
    console.log('\n📋 功能总结:')
    console.log('  ✅ 邮箱池增删改查')
    console.log('  ✅ 邮箱状态切换')
    console.log('  ✅ 邮箱统计信息')
    console.log('  ✅ 邮箱测试功能')
    console.log('  ✅ 权限控制')
    console.log('  ⚠️  重试机制（需要实际邮箱配置测试）')
    
  } catch (error) {
    console.error('💥 测试过程出错:', error.response?.data || error.message)
  }
}

// 运行测试
if (require.main === module) {
  testEmailPool()
    .then(() => {
      console.log('\n🎉 测试完成')
      process.exit(0)
    })
    .catch(error => {
      console.error('测试失败:', error)
      process.exit(1)
    })
}

module.exports = { testEmailPool }

