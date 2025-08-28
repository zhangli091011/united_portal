#!/usr/bin/env node

const axios = require('axios')
const config = require('../server/config')

async function debugFeishuPermissions() {
  console.log('🔐 飞书API权限诊断')
  console.log('==================\n')

  try {
    console.log('📋 当前配置信息:')
    console.log('APP ID:', config.feishu.appId)
    console.log('Bitable Token:', config.feishu.bitableToken?.substring(0, 20) + '...')
    console.log('Table ID:', config.feishu.tableId)
    console.log()

    // 1. 测试获取access token
    console.log('1. 测试获取access token...')
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/', {
      app_id: config.feishu.appId,
      app_secret: config.feishu.appSecret
    })

    if (tokenResponse.data.code === 0) {
      console.log('✅ 获取access token成功')
      const accessToken = tokenResponse.data.tenant_access_token
      
      // 2. 测试读取权限
      console.log('\n2. 测试读取权限...')
      try {
        const readResponse = await axios.get(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/records?page_size=1`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        )
        
        if (readResponse.data.code === 0) {
          console.log('✅ 读取权限正常')
          console.log('📊 读取到记录数:', readResponse.data.data?.items?.length || 0)
        } else {
          console.log('❌ 读取权限失败:', readResponse.data.msg)
        }
      } catch (error) {
        console.log('❌ 读取权限测试失败:', error.response?.data || error.message)
      }

      // 3. 测试写入权限（获取一个record来尝试更新）
      console.log('\n3. 测试写入权限...')
      try {
        // 先获取一个记录
        const recordsResponse = await axios.get(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/records?page_size=1`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        )

        if (recordsResponse.data.code === 0 && recordsResponse.data.data?.items?.length > 0) {
          const firstRecord = recordsResponse.data.data.items[0]
          const recordId = firstRecord.record_id
          
          console.log('🎯 尝试更新记录:', recordId)
          
          // 尝试更新这个记录（只更新一个不重要的字段）
          const updateResponse = await axios.put(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/records/${recordId}`,
            {
              fields: {
                // 尝试更新备注字段，这样不会影响重要数据
                '备注': firstRecord.fields['备注'] || '权限测试'
              }
            },
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          )
          
          if (updateResponse.data.code === 0) {
            console.log('✅ 写入权限正常 - 可以更新记录')
          } else {
            console.log('❌ 写入权限失败:', updateResponse.data.msg)
            console.log('错误码:', updateResponse.data.code)
          }
        } else {
          console.log('❌ 无法获取测试记录')
        }
      } catch (error) {
        console.log('❌ 写入权限测试失败:', error.response?.status, error.response?.data?.msg || error.message)
        if (error.response?.status === 403) {
          console.log('\n🚨 权限不足！可能的原因:')
          console.log('   1. Bitable Token只有读权限，需要申请写权限')
          console.log('   2. 应用权限范围不包括更新记录')
          console.log('   3. Token已过期或无效')
          console.log('\n💡 解决方案:')
          console.log('   1. 检查飞书开放平台应用权限设置')
          console.log('   2. 确认Bitable应用已授权写入权限')
          console.log('   3. 重新生成Bitable Token')
        }
      }

    } else {
      console.log('❌ 获取access token失败:', tokenResponse.data.msg)
    }

  } catch (error) {
    console.error('❌ 权限诊断失败:', error.message)
    if (error.response?.data) {
      console.error('错误详情:', error.response.data)
    }
  }
}

if (require.main === module) {
  debugFeishuPermissions().catch(console.error)
}
