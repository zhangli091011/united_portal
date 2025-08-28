#!/usr/bin/env node

const axios = require('axios')

async function debugStatsData() {
  console.log('🔍 统计数据调试')
  console.log('================\n')

  try {
    // 登录获取token
    const loginResponse = await axios.post('https://united.quantumlight.cc/api/auth/login', {
      employeeCode: 'admin123',
      password: 'admin123',
      type: 'employee'
    })
    
    const token = loginResponse.data.data.token
    console.log('✅ 管理员登录成功')
    
    // 获取原始报名数据
    console.log('\n1. 检查原始报名数据...')
    const regResponse = await axios.get('https://united.quantumlight.cc/api/registrations?pageSize=50', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const registrations = regResponse.data.data.items
    console.log(`📋 获取到 ${registrations.length} 条报名记录`)
    
    if (registrations.length > 0) {
      console.log('\n📝 第一条记录示例:')
      const firstRecord = registrations[0]
      console.log('ID:', firstRecord.id)
      console.log('编号:', firstRecord.registrationId)
      console.log('名称:', firstRecord.name)
      console.log('类型:', firstRecord.type)
      console.log('状态:', firstRecord.status)
      console.log('创建时间:', firstRecord.createdTime)
      console.log('createdAt:', firstRecord.createdAt)
      console.log('完整记录:', JSON.stringify(firstRecord, null, 2))
      
      // 分析所有记录的字段
      console.log('\n📊 字段统计:')
      const fieldStats = {
        hasType: 0,
        hasStatus: 0,
        hasCreatedTime: 0,
        hasCreatedAt: 0,
        validCreatedTime: 0
      }
      
      const typeCount = {}
      const statusCount = {}
      const dateFormats = new Set()
      
      registrations.forEach(record => {
        if (record.type) {
          fieldStats.hasType++
          typeCount[record.type] = (typeCount[record.type] || 0) + 1
        }
        if (record.status) {
          fieldStats.hasStatus++
          statusCount[record.status] = (statusCount[record.status] || 0) + 1
        }
        if (record.createdTime) {
          fieldStats.hasCreatedTime++
          dateFormats.add(typeof record.createdTime)
          try {
            const date = new Date(record.createdTime)
            if (!isNaN(date.getTime())) {
              fieldStats.validCreatedTime++
            }
          } catch (e) {
            console.log('无效日期格式:', record.createdTime)
          }
        }
        if (record.createdAt) {
          fieldStats.hasCreatedAt++
        }
      })
      
      console.log('字段完整性:', fieldStats)
      console.log('类型分布:', typeCount)
      console.log('状态分布:', statusCount)
      console.log('日期格式类型:', Array.from(dateFormats))
    }
    
    // 获取仪表板数据
    console.log('\n2. 检查仪表板统计数据...')
    const dashResponse = await axios.get('https://united.quantumlight.cc/api/stats/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const dashData = dashResponse.data.data
    console.log('📊 仪表板数据:')
    console.log('总览:', dashData.overview)
    console.log('状态分布:', dashData.statusDistribution)
    console.log('类型分布:', dashData.popularTypes)
    console.log('今日数据:', dashData.recentRegistrations?.length || 0)
    
    // 手动计算统计数据验证
    console.log('\n3. 手动验证统计计算...')
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    let manualStats = {
      total: registrations.length,
      today: 0,
      pending: 0,
      validDates: 0,
      invalidDates: 0
    }
    
    registrations.forEach(record => {
      // 检查今日报名
      try {
        const createDate = new Date(record.createdTime)
        if (!isNaN(createDate.getTime())) {
          manualStats.validDates++
          if (createDate >= todayStart) {
            manualStats.today++
          }
        } else {
          manualStats.invalidDates++
          console.log('无效日期:', record.registrationId, record.createdTime)
        }
      } catch (e) {
        manualStats.invalidDates++
        console.log('日期解析错误:', record.registrationId, record.createdTime)
      }
      
      // 检查待审核
      if (record.status === '待审核') {
        manualStats.pending++
      }
    })
    
    console.log('✅ 手动计算结果:', manualStats)
    console.log('🔍 系统计算结果:', dashData.overview)
    
    // 比较结果
    if (manualStats.total !== dashData.overview.totalRegistrations) {
      console.log('❌ 总数不匹配!')
    }
    if (manualStats.today !== dashData.overview.todayRegistrations) {
      console.log('❌ 今日报名数不匹配!')
    }
    if (manualStats.pending !== dashData.overview.pendingReview) {
      console.log('❌ 待审核数不匹配!')
    }
    
    if (manualStats.invalidDates > 0) {
      console.log(`⚠️  发现 ${manualStats.invalidDates} 个无效日期，这可能是统计为0的原因!`)
    }

  } catch (error) {
    console.error('❌ 调试失败:', error.message)
    if (error.response?.data) {
      console.error('错误详情:', error.response.data)
    }
  }
}

if (require.main === module) {
  debugStatsData().catch(console.error)
}
