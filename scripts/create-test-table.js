#!/usr/bin/env node

const axios = require('axios')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

class FeishuTableCreator {
  constructor() {
    this.baseURL = 'https://open.feishu.cn/open-apis'
    this.accessToken = null
  }

  async getAccessToken(appId, appSecret) {
    try {
      const response = await axios.post(`${this.baseURL}/auth/v3/tenant_access_token/internal`, {
        app_id: appId,
        app_secret: appSecret
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

  // 创建多维表格应用
  async createBitableApp(name = '联合门户报名系统') {
    console.log(`🔧 创建多维表格应用: ${name}`)
    
    const appData = {
      name,
      folder_token: '', // 可选，指定文件夹
      icon: '📋'
    }

    try {
      const response = await this.makeRequest('POST', '/bitable/v1/apps', appData)
      
      if (response.code !== 0) {
        throw new Error(`创建应用失败: ${response.msg}`)
      }

      const appToken = response.data.app.app_token
      console.log('✅ 多维表格应用创建成功')
      console.log(`   App Token: ${appToken}`)
      
      return appToken
    } catch (error) {
      console.error('❌ 创建多维表格应用失败:', error)
      throw error
    }
  }

  // 获取默认表格ID
  async getDefaultTableId(appToken) {
    console.log('🔍 获取默认表格ID...')
    
    try {
      const response = await this.makeRequest('GET', `/bitable/v1/apps/${appToken}/tables`)
      
      if (response.code !== 0) {
        throw new Error(`获取表格列表失败: ${response.msg}`)
      }

      if (response.data.items.length === 0) {
        throw new Error('没有找到表格')
      }

      const tableId = response.data.items[0].table_id
      console.log('✅ 获取默认表格ID成功')
      console.log(`   Table ID: ${tableId}`)
      
      return tableId
    } catch (error) {
      console.error('❌ 获取表格ID失败:', error)
      throw error
    }
  }

  // 创建字段
  async createField(appToken, tableId, fieldData) {
    console.log(`🔧 创建字段: ${fieldData.field_name}`)
    
    try {
      const response = await this.makeRequest('POST', `/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, fieldData)
      
      if (response.code !== 0) {
        throw new Error(`创建字段失败: ${response.msg}`)
      }

      console.log(`✅ 字段创建成功: ${fieldData.field_name}`)
      return response.data.field
    } catch (error) {
      console.error(`❌ 创建字段失败 (${fieldData.field_name}):`, error.response?.data || error.message)
      // 继续创建其他字段，不抛出错误
      return null
    }
  }

  // 定义所有需要的字段
  getRequiredFields() {
    return [
      {
        field_name: '参演单位',
        type: 1, // 文本
        property: {}
      },
      {
        field_name: '作品类型',
        type: 3, // 单选
        property: {
          options: [
            { name: '公益短片（非合作方请不要选择此项）' },
            { name: '小品' },
            { name: '相声' },
            { name: '乐器' },
            { name: '戏曲' },
            { name: '说唱' },
            { name: '舞蹈' },
            { name: '歌曲' },
            { name: '魔术' },
            { name: '杂技' },
            { name: '《难忘今宵》合唱' },
            { name: '混剪' },
            { name: '其他' },
            { name: '公益短片' }
          ]
        }
      },
      {
        field_name: '作品类型-其他-补充内容',
        type: 1, // 文本
        property: {}
      },
      {
        field_name: '作品类型-乐器-補充內容',
        type: 1, // 文本
        property: {}
      },
      {
        field_name: '作品名称',
        type: 1, // 文本
        property: {}
      },
      {
        field_name: '演职人员',
        type: 1, // 文本
        property: {}
      },
      {
        field_name: '参演单位负责人联系方式',
        type: 2, // 数字
        property: {
          formatter: '0'
        }
      },
      {
        field_name: '演职人员是否出镜',
        type: 3, // 单选
        property: {
          options: [
            { name: '是' },
            { name: '否' }
          ]
        }
      },
      {
        field_name: '作品状态',
        type: 4, // 多选
        property: {
          options: [
            { name: '未按规范填写表格' },
            { name: '作品所有者自愿取消' },
            { name: '已联系' },
            { name: '有待斟酌' },
            { name: '一审通过' },
            { name: '二审通过' },
            { name: '终审通过' },
            { name: '初审驳回' },
            { name: '团队独立立项' },
            { name: '拒绝联系' },
            { name: '无法联系' }
          ]
        }
      },
      {
        field_name: '备注',
        type: 1, // 文本
        property: {}
      },
      {
        field_name: '信息统计',
        type: 3, // 单选
        property: {
          options: [
            { name: '已进入合唱群' },
            { name: '1' }
          ]
        }
      },
      {
        field_name: '请确定您所报名的节目为自创，或已受到原创授权的节目',
        type: 4, // 多选
        property: {
          options: [
            { name: '我确定！' },
            { name: '自行视频录制' },
            { name: '符合版权法的授权' },
            { name: '其他版权类型' }
          ]
        }
      },
      {
        field_name: '请确定您所报名的节目为自创，或已受到原创授权的节目-其他版权类型-补充内容',
        type: 1, // 文本
        property: {}
      },
      {
        field_name: '团队直辖作品发展成员',
        type: 4, // 多选
        property: {
          options: [
            { name: '初选' },
            { name: '审查' },
            { name: '定稿' }
          ]
        }
      },
      {
        field_name: '日期（自动化筛选条件）',
        type: 5, // 日期时间
        property: {
          auto_fill: true,
          date_formatter: 'yyyy/MM/dd HH:mm'
        }
      },
      {
        field_name: '编号',
        type: 1005, // 自动编号
        property: {
          auto_serial: {
            type: 'custom',
            options: [
              {
                type: 'fixed_text',
                value: '26ZCW'
              },
              {
                type: 'created_time',
                value: 'yyyyMMdd'
              },
              {
                type: 'system_number',
                value: '3'
              }
            ]
          }
        }
      }
    ]
  }

  // 创建完整的表格结构
  async createCompleteTable(appToken, tableId) {
    console.log('🏗️  开始创建表格字段结构...')
    
    const fields = this.getRequiredFields()
    const createdFields = []

    for (const fieldData of fields) {
      const field = await this.createField(appToken, tableId, fieldData)
      if (field) {
        createdFields.push(field)
      }
      // 添加延迟避免API限流
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log(`✅ 表格结构创建完成，成功创建 ${createdFields.length}/${fields.length} 个字段`)
    return createdFields
  }

  // 验证表格结构
  async verifyTableStructure(appToken, tableId) {
    console.log('🔍 验证表格结构...')
    
    try {
      const response = await this.makeRequest('GET', `/bitable/v1/apps/${appToken}/tables/${tableId}/fields`)
      
      if (response.code !== 0) {
        throw new Error(`获取字段列表失败: ${response.msg}`)
      }

      const fields = response.data.items
      const requiredFields = this.getRequiredFields()
      
      console.log(`📊 表格字段统计:`)
      console.log(`   总字段数: ${fields.length}`)
      console.log(`   必需字段数: ${requiredFields.length}`)
      
      const missingFields = requiredFields.filter(required => 
        !fields.some(field => field.field_name === required.field_name)
      )
      
      if (missingFields.length > 0) {
        console.log('⚠️  缺少以下字段:')
        missingFields.forEach(field => {
          console.log(`   - ${field.field_name}`)
        })
      } else {
        console.log('✅ 所有必需字段都已创建')
      }

      return {
        total: fields.length,
        required: requiredFields.length,
        missing: missingFields.length,
        fields: fields
      }
    } catch (error) {
      console.error('❌ 验证表格结构失败:', error)
      throw error
    }
  }

  // 生成配置代码
  generateConfigCode(appToken, tableId) {
    return `
// 飞书多维表格配置
feishu: {
  appId: 'your_feishu_app_id',
  appSecret: 'your_feishu_app_secret',
  bitableAppToken: '${appToken}',
  tableId: '${tableId}'
},`
  }
}

async function main() {
  console.log('🚀 飞书多维表格自动创建工具')
  console.log('===========================\n')

  const creator = new FeishuTableCreator()

  try {
    // 获取用户输入
    const appId = await askQuestion('请输入飞书 App ID: ')
    const appSecret = await askQuestion('请输入飞书 App Secret: ')
    
    if (!appId || !appSecret) {
      console.log('❌ App ID 和 App Secret 不能为空')
      rl.close()
      return
    }

    // 获取访问令牌
    await creator.getAccessToken(appId, appSecret)

    // 询问是创建新应用还是使用现有应用
    const createNew = await askQuestion('是否创建新的多维表格应用? (y/N): ')
    
    let appToken, tableId

    if (createNew.toLowerCase() === 'y') {
      // 创建新应用
      const appName = await askQuestion('请输入应用名称 (默认: 联合门户报名系统): ') || '联合门户报名系统'
      appToken = await creator.createBitableApp(appName)
      
      // 获取默认表格ID
      tableId = await creator.getDefaultTableId(appToken)
    } else {
      // 使用现有应用
      appToken = await askQuestion('请输入现有的 App Token: ')
      tableId = await askQuestion('请输入 Table ID: ')
      
      if (!appToken || !tableId) {
        console.log('❌ App Token 和 Table ID 不能为空')
        rl.close()
        return
      }
    }

    // 创建表格结构
    await creator.createCompleteTable(appToken, tableId)

    // 验证表格结构
    const verification = await creator.verifyTableStructure(appToken, tableId)

    // 输出配置信息
    console.log('\n🎉 表格创建完成！')
    console.log('\n📋 配置信息:')
    console.log(`App Token: ${appToken}`)
    console.log(`Table ID: ${tableId}`)
    
    console.log('\n📝 请将以下配置添加到 server/config.js:')
    console.log(creator.generateConfigCode(appToken, tableId))

    console.log('\n🔗 表格访问链接:')
    console.log(`https://bytedance.feishu.cn/base/${appToken}`)

    if (verification.missing > 0) {
      console.log('\n⚠️  注意: 部分字段创建失败，可能需要手动在飞书中创建')
    }

  } catch (error) {
    console.error('\n❌ 创建过程中发生错误:', error.message)
  } finally {
    rl.close()
  }
}

// 运行脚本
if (require.main === module) {
  main().catch(console.error)
}

module.exports = FeishuTableCreator
