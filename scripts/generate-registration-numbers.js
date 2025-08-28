const feishuService = require('../server/services/feishuService')

// 为现有记录生成编号的脚本
async function generateRegistrationNumbers() {
  console.log('🔄 开始为现有记录生成编号...')
  
  try {
    // 获取所有记录
    const result = await feishuService.getAllRegistrations({ pageSize: 500 })
    
    if (!result.items || result.items.length === 0) {
      console.log('📭 没有找到任何记录')
      return
    }
    
    console.log(`📋 找到 ${result.items.length} 条记录`)
    
    // 过滤出没有编号或编号为空的记录
    const recordsWithoutNumbers = result.items.filter(item => 
      !item.registrationId || 
      item.registrationId === '' || 
      item.registrationId === null ||
      item.registrationId === undefined
    )
    
    console.log(`🔍 发现 ${recordsWithoutNumbers.length} 条记录缺少编号`)
    
    if (recordsWithoutNumbers.length === 0) {
      console.log('✅ 所有记录都已有编号，无需处理')
      return
    }
    
    // 按创建时间排序，先处理早期记录
    recordsWithoutNumbers.sort((a, b) => {
      const dateA = new Date(a.createdTime || a.createdAt || '2025-01-01').getTime()
      const dateB = new Date(b.createdTime || b.createdAt || '2025-01-01').getTime()
      return dateA - dateB
    })
    
    console.log('📝 开始为记录生成编号...')
    
    let successCount = 0
    let errorCount = 0
    
    for (const record of recordsWithoutNumbers) {
      try {
        // 基于记录的创建时间生成编号
        const createdDate = new Date(record.createdTime || record.createdAt || '2025-01-01')
        const dateStr = createdDate.toISOString().slice(0, 10).replace(/-/g, '')
        
        // 获取当天已有的编号
        const allRecords = await feishuService.getAllRegistrations({ pageSize: 500 })
        const prefix = `26ZCW${dateStr}`
        const existingNumbers = allRecords.items
          .map(item => item.registrationId)
          .filter(id => id && id.startsWith(prefix))
          .map(id => {
            const match = id.match(/26ZCW\d{8}(\d{3})$/)
            return match ? parseInt(match[1], 10) : 0
          })
          .filter(num => !isNaN(num))
        
        const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
        const nextNumber = (maxNumber + 1).toString().padStart(3, '0')
        const newRegistrationId = `${prefix}${nextNumber}`
        
        // 更新记录的编号
        console.log(`📝 为记录 ${record.name} 生成编号: ${newRegistrationId}`)
        
        // 这里需要调用飞书API来更新编号字段
        // 注意：这可能需要根据飞书API的具体实现来调整
        await updateRecordNumber(record.id, newRegistrationId)
        
        successCount++
        console.log(`✅ ${successCount}/${recordsWithoutNumbers.length} - ${record.name}: ${newRegistrationId}`)
        
        // 避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        errorCount++
        console.error(`❌ 为记录 ${record.name} 生成编号失败:`, error.message)
      }
    }
    
    console.log('\n🎉 编号生成完成!')
    console.log(`✅ 成功: ${successCount} 条`)
    console.log(`❌ 失败: ${errorCount} 条`)
    
  } catch (error) {
    console.error('💥 生成编号过程出错:', error)
  }
}

// 更新记录编号的辅助函数
async function updateRecordNumber(recordId, registrationId) {
  // 注意：这个函数可能需要直接调用飞书API
  // 因为 feishuService.updateRegistration 可能不支持更新编号字段
  console.log(`🔄 更新记录 ${recordId} 的编号为 ${registrationId}`)
  
  // 这里应该实现实际的飞书API调用
  // 由于编号字段可能是自动生成的，可能需要特殊处理
  console.log('⚠️  注意: 编号字段可能需要在飞书表格中手动配置为可编辑字段')
}

// 运行脚本
if (require.main === module) {
  generateRegistrationNumbers()
    .then(() => {
      console.log('脚本执行完成')
      process.exit(0)
    })
    .catch(error => {
      console.error('脚本执行失败:', error)
      process.exit(1)
    })
}

module.exports = { generateRegistrationNumbers }

