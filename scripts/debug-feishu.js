#!/usr/bin/env node

const axios = require('axios')
const config = require('../server/config')

class FeishuDebugger {
  constructor() {
    this.baseURL = 'https://open.feishu.cn/open-apis'
    this.accessToken = null
  }

  async getAccessToken() {
    try {
      const response = await axios.post(`${this.baseURL}/auth/v3/tenant_access_token/internal`, {
        app_id: config.feishu.appId,
        app_secret: config.feishu.appSecret
      })

      if (response.data.code !== 0) {
        throw new Error(`获取访问令牌失败: ${response.data.msg}`)
      }

      this.accessToken = response.data.tenant_access_token
      console.log('✅ 飞书访问令牌获取成功')
      return this.accessToken
    } catch (error) {
      console.error('❌ 获取飞书访问令牌失败:', error.response?.data || error.message)
      throw error
    }
  }

  async makeRequest(method, endpoint, data = null) {
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    }

    if (data) {
      config.data = data
    }

    try {
      const response = await axios(config)
      return response.data
    } catch (error) {
      console.error('飞书API请求失败:', error.response?.data || error.message)
      throw error
    }
  }

  async debugTable() {
    console.log('🔍 调试飞书多维表格')
    console.log('====================\n')

    try {
      await this.getAccessToken()

      // 1. 获取表格字段列表
      console.log('1. 获取表格字段列表...')
      const fieldsResponse = await this.makeRequest('GET', 
        `/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/fields`)
      
      if (fieldsResponse.code !== 0) {
        throw new Error(`获取字段列表失败: ${fieldsResponse.msg}`)
      }

      console.log('✅ 字段列表获取成功，共', fieldsResponse.data.items.length, '个字段:')
      fieldsResponse.data.items.forEach((field, index) => {
        console.log(`   ${index + 1}. ${field.field_name} (${field.ui_type}, ID: ${field.field_id})`)
      })

      // 2. 获取最新的10条记录查看数据结构
      console.log('\n2. 获取最新的10条记录查看数据结构...')
      const recordsResponse = await this.makeRequest('GET', 
        `/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/records?page_size=10&sort=["日期（自动化筛选条件） DESC"]`)
      
      if (recordsResponse.code !== 0) {
        throw new Error(`获取记录失败: ${recordsResponse.msg}`)
      }

      console.log('✅ 记录获取成功，共', recordsResponse.data.items.length, '条记录:')
      recordsResponse.data.items.forEach((record, index) => {
        console.log(`\n   记录 ${index + 1} (ID: ${record.record_id}):`)
        Object.entries(record.fields).forEach(([fieldName, value]) => {
          console.log(`     ${fieldName}: ${JSON.stringify(value)}`)
        })
      })

      // 3. 查找编号字段
      console.log('\n3. 查找编号相关字段...')
      const numberFields = fieldsResponse.data.items.filter(field => 
        field.field_name.includes('编号') || field.ui_type === 'AutoNumber'
      )
      
      if (numberFields.length > 0) {
        console.log('✅ 找到编号字段:')
        numberFields.forEach(field => {
          console.log(`   - ${field.field_name} (${field.ui_type}, ID: ${field.field_id})`)
        })
      } else {
        console.log('⚠️  未找到编号字段')
      }

      console.log('\n🎉 调试完成！')
      
    } catch (error) {
      console.error('\n❌ 调试过程中出现错误:', error.message)
    }
  }
}

async function main() {
  if (!config.feishu.appId || !config.feishu.appSecret) {
    console.log('❌ 飞书配置不完整，请先运行 npm run setup 配置')
    process.exit(1)
  }

  const feishuDebugger = new FeishuDebugger()
  await feishuDebugger.debugTable()
}

if (require.main === module) {
  main().catch(console.error)
}
