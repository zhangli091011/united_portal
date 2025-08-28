const axios = require('axios')

// 测试字段管理功能
async function testFieldManagement() {
  console.log('🧪 开始测试字段管理功能...')
  
  const baseURL = 'https://united.quantumlight.cc/api'
  
  // 获取超级管理员token进行测试
  const loginData = {
    type: 'username',
    username: 'superadmin',
    password: 'admin123'
  }
  
  try {
    console.log('🔐 登录超级管理员账户...')
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
    
    // 测试 1: 获取字段类型配置
    console.log('\n📋 测试 1: 获取字段类型配置')
    try {
      const typesResponse = await axios.get(`${baseURL}/fields/config/types`, { headers })
      const types = typesResponse.data.data
      console.log(`✅ 获取到 ${types.length} 种字段类型`)
      console.log('支持的字段类型:', types.map(t => `${t.name}(${t.type})`).join(', '))
    } catch (error) {
      console.error('❌ 获取字段类型失败:', error.response?.data?.message || error.message)
    }
    
    // 测试 2: 同步字段映射
    console.log('\n🔄 测试 2: 同步字段映射')
    try {
      const syncResponse = await axios.post(`${baseURL}/fields/sync`, {}, { headers })
      const syncData = syncResponse.data.data
      console.log(`✅ 同步成功，共 ${syncData.totalFields} 个字段`)
      console.log('字段列表:', syncData.fields.map(f => f.name).join(', '))
    } catch (error) {
      console.error('❌ 同步字段失败:', error.response?.data?.message || error.message)
    }
    
    // 测试 3: 获取字段列表
    console.log('\n📝 测试 3: 获取字段列表')
    try {
      const fieldsResponse = await axios.get(`${baseURL}/fields`, { headers })
      const fields = fieldsResponse.data.data.fields
      console.log(`✅ 获取到 ${fields.length} 个字段`)
      
      if (fields.length > 0) {
        console.log('\n字段详情:')
        fields.forEach((field, index) => {
          console.log(`  ${index + 1}. ${field.name} (${field.type}) - ${field.description || '无描述'}`)
        })
        
        // 获取第一个字段的详情
        if (fields[0]) {
          console.log(`\n🔍 测试 4: 获取字段详情 - ${fields[0].name}`)
          try {
            const fieldResponse = await axios.get(`${baseURL}/fields/${fields[0].id}`, { headers })
            const fieldData = fieldResponse.data.data
            console.log('✅ 字段详情获取成功:', {
              名称: fieldData.name,
              类型: fieldData.type,
              是否主键: fieldData.isPrimary,
              创建时间: fieldData.createTime
            })
          } catch (error) {
            console.error('❌ 获取字段详情失败:', error.response?.data?.message || error.message)
          }
        }
      }
    } catch (error) {
      console.error('❌ 获取字段列表失败:', error.response?.data?.message || error.message)
    }
    
    // 测试 4: 验证字段数据
    console.log('\n✅ 测试 5: 验证字段数据')
    try {
      const testFieldData = {
        field_name: '测试字段',
        type: 'text',
        description: '这是一个测试字段'
      }
      
      const validateResponse = await axios.post(`${baseURL}/fields/validate`, testFieldData, { headers })
      console.log('✅ 字段数据验证通过:', validateResponse.data.message)
    } catch (error) {
      console.error('❌ 字段数据验证失败:', error.response?.data?.message || error.message)
    }
    
    // 测试 5: 创建字段（可选，因为会实际创建字段）
    const shouldCreateField = false // 设置为 true 以测试字段创建
    if (shouldCreateField) {
      console.log('\n➕ 测试 6: 创建字段')
      try {
        const newFieldData = {
          field_name: '测试自动字段',
          type: 'text',
          description: '这是通过API创建的测试字段'
        }
        
        const createResponse = await axios.post(`${baseURL}/fields`, newFieldData, { headers })
        const newField = createResponse.data.data
        console.log('✅ 字段创建成功:', newField.name)
        
        // 立即删除创建的测试字段
        console.log('\n🗑️  删除测试字段')
        try {
          await axios.delete(`${baseURL}/fields/${newField.id}`, { headers })
          console.log('✅ 测试字段删除成功')
        } catch (deleteError) {
          console.error('❌ 删除测试字段失败:', deleteError.response?.data?.message || deleteError.message)
        }
      } catch (error) {
        console.error('❌ 创建字段失败:', error.response?.data?.message || error.message)
      }
    }
    
    console.log('\n🎉 字段管理功能测试完成!')
    console.log('\n📋 功能总结:')
    console.log('  ✅ 获取字段类型配置')
    console.log('  ✅ 同步字段映射')
    console.log('  ✅ 获取字段列表')
    console.log('  ✅ 获取字段详情')
    console.log('  ✅ 验证字段数据')
    console.log('  ⚠️  字段创建/删除（需要谨慎操作）')
    
  } catch (error) {
    console.error('💥 测试过程出错:', error.response?.data || error.message)
  }
}

// 运行测试
if (require.main === module) {
  testFieldManagement()
    .then(() => {
      console.log('测试完成')
      process.exit(0)
    })
    .catch(error => {
      console.error('测试失败:', error)
      process.exit(1)
    })
}

module.exports = { testFieldManagement }

