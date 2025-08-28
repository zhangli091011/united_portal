#!/usr/bin/env node

const config = require('../server/config')
const feishuService = require('../server/services/feishuService')

async function debugFormatRecord() {
  console.log('🔍 调试formatRecord函数')
  console.log('========================\n')

  try {
    // 获取访问令牌
    await feishuService.getAccessToken()
    
    // 直接获取飞书数据，按时间倒序获取最新的记录
    const endpoint = `/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/records`
    const response = await feishuService.makeRequest('GET', `${endpoint}?page_size=25`)
    
    if (response.code !== 0) {
      throw new Error(`飞书API返回错误: ${response.msg}`)
    }

    console.log('1. 飞书记录分析:')
    console.log(`总记录数: ${response.data.items.length}`)
    
    // 分类记录：有完整数据 vs 只有编号
    const completeRecords = []
    const incompleteRecords = []
    
    response.data.items.forEach((record) => {
      const fieldCount = Object.keys(record.fields).length
      if (fieldCount > 1) { // 超过1个字段（不只是编号）
        completeRecords.push(record)
      } else {
        incompleteRecords.push(record)
      }
    })
    
    console.log(`完整记录数: ${completeRecords.length}`)
    console.log(`不完整记录数: ${incompleteRecords.length}`)
    
    if (completeRecords.length > 0) {
      console.log('\n2. 完整记录示例:')
      completeRecords.slice(0, 3).forEach((record, index) => {
        console.log(`\n记录 ${index + 1} (ID: ${record.record_id}):`)
        console.log('  字段数量:', Object.keys(record.fields).length)
        console.log('  原始字段:', JSON.stringify(record.fields, null, 2))
        
        // 测试格式化
        const formatted = feishuService.formatRecord(record)
        console.log('  格式化结果:', JSON.stringify(formatted, null, 2))
      })
    }
    
    if (incompleteRecords.length > 0) {
      console.log('\n3. 不完整记录示例:')
      incompleteRecords.slice(0, 3).forEach((record, index) => {
        console.log(`\n记录 ${index + 1} (ID: ${record.record_id}):`)
        console.log('  原始字段:', JSON.stringify(record.fields, null, 2))
      })
    }

  } catch (error) {
    console.error('❌ 调试失败:', error.message)
  }
}

if (require.main === module) {
  debugFormatRecord().catch(console.error)
}
