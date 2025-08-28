const axios = require('axios')
const config = require('../server/config')

// 测试排序功能
async function testSorting() {
  console.log('🧪 开始测试排序功能...')
  
  const baseURL = process.env.NODE_ENV === 'production' 
    ? 'https://united.quantumlight.cc/api' 
    : 'http://localhost:3001/api'
  
  // 获取管理员token进行测试
  const loginData = {
    type: 'username',
    username: 'superadmin',
    password: 'admin123'
  }
  
  try {
    console.log('🔐 登录管理员账户...')
    const loginResponse = await axios.post(`${baseURL}/auth/login`, loginData)
    const token = loginResponse.data.token
    
    if (!token) {
      throw new Error('登录失败，未获取到token')
    }
    
    console.log('✅ 登录成功')
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
    
    // 测试不同的排序参数
    const sortTests = [
      { sortBy: 'registrationId', sortOrder: 'desc', description: '按编号降序' },
      { sortBy: 'registrationId', sortOrder: 'asc', description: '按编号升序' },
      { sortBy: 'name', sortOrder: 'asc', description: '按报名单位名称升序' },
      { sortBy: 'createdTime', sortOrder: 'desc', description: '按创建时间降序' },
      { sortBy: 'status', sortOrder: 'asc', description: '按状态升序' },
      { sortBy: 'programName', sortOrder: 'asc', description: '按节目名称升序' }
    ]
    
    for (const test of sortTests) {
      console.log(`\n🔍 测试: ${test.description}`)
      
      try {
        const response = await axios.get(`${baseURL}/registrations`, {
          headers,
          params: {
            pageSize: 10,
            sortBy: test.sortBy,
            sortOrder: test.sortOrder
          }
        })
        
        const data = response.data.data
        console.log(`📊 返回 ${data.items?.length || 0} 条记录`)
        
        if (data.items && data.items.length > 0) {
          console.log('🔢 前3条记录的排序字段值:')
          data.items.slice(0, 3).forEach((item, index) => {
            const value = item[test.sortBy] || '(空)'
            console.log(`  ${index + 1}. ${value}`)
          })
          
          // 验证排序是否正确
          if (data.items.length > 1) {
            const values = data.items.map(item => item[test.sortBy])
            const isCorrectOrder = validateSortOrder(values, test.sortBy, test.sortOrder)
            console.log(`✅ 排序${isCorrectOrder ? '正确' : '有误'}`)
          }
        } else {
          console.log('📭 没有数据返回')
        }
        
      } catch (error) {
        console.error(`❌ 测试失败:`, error.response?.data?.message || error.message)
      }
    }
    
    // 测试默认排序（应该按编号降序）
    console.log('\n🔍 测试默认排序（无排序参数）')
    try {
      const response = await axios.get(`${baseURL}/registrations`, {
        headers,
        params: { pageSize: 5 }
      })
      
      const data = response.data.data
      console.log(`📊 返回 ${data.items?.length || 0} 条记录`)
      console.log('🏷️  默认应按编号降序排列')
      
      if (data.items && data.items.length > 0) {
        console.log('编号列表:')
        data.items.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.registrationId || '(无编号)'}`)
        })
      }
      
    } catch (error) {
      console.error(`❌ 默认排序测试失败:`, error.response?.data?.message || error.message)
    }
    
    console.log('\n🎉 排序功能测试完成!')
    
  } catch (error) {
    console.error('💥 测试过程出错:', error.response?.data || error.message)
  }
}

// 验证排序是否正确
function validateSortOrder(values, field, order) {
  if (values.length < 2) return true
  
  for (let i = 0; i < values.length - 1; i++) {
    const current = values[i]
    const next = values[i + 1]
    
    // 处理空值
    if (current == null && next == null) continue
    if (current == null) return order === 'asc'
    if (next == null) return order === 'desc'
    
    let comparison
    if (field === 'createdTime' || field === 'createdAt' || field === 'updatedAt') {
      // 时间字段比较
      const currentTime = new Date(current).getTime()
      const nextTime = new Date(next).getTime()
      comparison = currentTime - nextTime
    } else {
      // 字符串比较
      comparison = String(current).localeCompare(String(next))
    }
    
    if (order === 'asc' && comparison > 0) return false
    if (order === 'desc' && comparison < 0) return false
  }
  
  return true
}

// 运行测试
if (require.main === module) {
  testSorting()
    .then(() => {
      console.log('测试完成')
      process.exit(0)
    })
    .catch(error => {
      console.error('测试失败:', error)
      process.exit(1)
    })
}

module.exports = { testSorting }

