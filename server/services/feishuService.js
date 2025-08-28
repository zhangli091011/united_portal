const axios = require('axios')
const config = require('../config')

class FeishuService {
  constructor() {
    this.baseURL = 'https://open.feishu.cn/open-apis'
    this.accessToken = null
    this.tokenExpiry = null
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    try {
      const response = await axios.post(`${this.baseURL}/auth/v3/tenant_access_token/internal`, {
        app_id: config.feishu.appId,
        app_secret: config.feishu.appSecret
      })

      const { tenant_access_token, expire } = response.data
      this.accessToken = tenant_access_token
      this.tokenExpiry = Date.now() + (expire - 60) * 1000 // 提前60秒过期

      return this.accessToken
    } catch (error) {
      console.error('获取飞书访问令牌失败:', error.response?.data || error.message)
      throw new Error('飞书认证失败')
    }
  }

  async makeRequest(method, endpoint, data = null) {
    const token = await this.getAccessToken()
    
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
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

  // 生成报名编号 - 新规则: 26ZCW + 日期(YYYYMMDD) + 3位自增数字
  async generateRegistrationId() {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD格式
    const prefix = `26ZCW${dateStr}`
    
    try {
      // 获取当天已有的编号数量
      const endpoint = `/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/records`
      const response = await this.makeRequest('GET', endpoint + '?page_size=500')
      
      if (response.code === 0 && response.data?.items) {
        // 过滤出当天的编号
        const todayNumbers = response.data.items
          .map(item => item.fields['编号'])
          .filter(id => id && id.startsWith(prefix))
          .map(id => {
            const match = id.match(/26ZCW\d{8}(\d{3})$/)
            return match ? parseInt(match[1], 10) : 0
          })
          .filter(num => !isNaN(num))
        
        // 找到最大编号并加1
        const maxNumber = todayNumbers.length > 0 ? Math.max(...todayNumbers) : 0
        const nextNumber = (maxNumber + 1).toString().padStart(3, '0')
        
        return `${prefix}${nextNumber}`
      }
    } catch (error) {
      console.error('获取编号时出错，使用默认编号:', error)
    }
    
    // 如果出错，使用001作为默认编号
    return `${prefix}001`
  }

  // 创建报名记录
  async createRegistration(data) {
    const record = {
      fields: {
        '参演单位': data.name,
        '作品类型': data.type,
        '作品名称': data.programName,
        '演职人员': data.performers,
        '参演单位负责人联系方式': parseInt(data.contact),
        '演职人员是否出镜': data.onCamera || '',
        '作品状态': ['待审核'],
        '备注': data.remarks || '',
        '请确定您所报名的节目为自创，或已受到原创授权的节目': [data.copyright]
        // 不设置编号和日期字段，让飞书自动生成
      }
    }

    // 处理可选字段
    if (data.description) {
      if (data.type === '其他') {
        record.fields['作品类型-其他-补充内容'] = data.description
      } else if (data.type === '乐器') {
        record.fields['作品类型-乐器-補充內容'] = data.description
      }
    }

    const endpoint = `/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/records`
    
    try {
      const response = await this.makeRequest('POST', endpoint, record)
      
      // 检查响应结构
      if (response.code !== 0) {
        throw new Error(`飞书API返回错误: ${response.msg}`)
      }
      
      const recordData = response.data?.record
      if (!recordData) {
        console.error('飞书API响应结构异常:', JSON.stringify(response, null, 2))
        throw new Error('飞书API响应结构异常')
      }
      
      // 尝试获取飞书自动生成的编号
      let actualRegistrationId = recordData.fields['编号']
      
      // 如果创建时没有返回编号，我们需要重新查询记录来获取
      if (!actualRegistrationId) {
        console.log('📋 创建时未返回编号，正在重新查询记录获取编号...')
        try {
          // 通过记录ID重新获取记录
          const getRecordResponse = await this.makeRequest('GET', 
            `/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/records/${recordData.record_id}`)
          
          if (getRecordResponse.code === 0 && getRecordResponse.data?.record?.fields['编号']) {
            actualRegistrationId = getRecordResponse.data.record.fields['编号']
            console.log('✅ 重新查询获取到编号:', actualRegistrationId)
          } else {
            // 如果还是获取不到，使用我们自己生成的编号作为备用
            actualRegistrationId = await this.generateRegistrationId()
            console.log('⚠️  使用备用编号:', actualRegistrationId)
          }
        } catch (queryError) {
          console.error('重新查询记录失败:', queryError)
          actualRegistrationId = await this.generateRegistrationId()
          console.log('⚠️  查询失败，使用备用编号:', actualRegistrationId)
        }
      }
      
      return {
        registrationId: actualRegistrationId,
        recordId: recordData.record_id,
        createdTime: recordData.created_time || new Date().toISOString()
      }
    } catch (error) {
      console.error('创建飞书记录失败:', error)
      throw new Error('报名信息保存失败')
    }
  }

  // 查询报名记录
  async getRegistration(registrationId) {
    // 先尝试获取所有记录，然后在内存中过滤
    const endpoint = `/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/records`
    
    try {
      const response = await this.makeRequest('GET', endpoint + '?page_size=500')
      
      if (response.code !== 0) {
        throw new Error(`飞书API返回错误: ${response.msg}`)
      }
      
      if (!response.data?.items) {
        throw new Error('无法获取记录列表')
      }

      // 在内存中查找匹配的记录
      const record = response.data.items.find(item => {
        const recordId = item.fields['编号']
        return recordId === registrationId
      })

      if (!record) {
        throw new Error('报名记录不存在')
      }

      return this.formatRecord(record)
    } catch (error) {
      console.error('查询飞书记录失败:', error)
      if (error.message === '报名记录不存在') {
        throw error
      }
      throw new Error('查询报名信息失败')
    }
  }

  // 通过record_id直接查询记录
  async getRegistrationByRecordId(recordId) {
    const endpoint = `/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/records/${recordId}`
    
    try {
      const response = await this.makeRequest('GET', endpoint)
      
      if (response.code !== 0) {
        throw new Error(`飞书API返回错误: ${response.msg}`)
      }
      
      if (!response.data?.record) {
        throw new Error('记录不存在')
      }

      return this.formatRecord(response.data.record)
    } catch (error) {
      console.error('通过record_id查询飞书记录失败:', error)
      if (error.message === '记录不存在') {
        throw error
      }
      throw new Error('查询报名信息失败')
    }
  }

  // 获取所有报名记录
  async getAllRegistrations(params = {}) {
    const { pageSize = 1000, status, type, pageToken, sortBy = 'registrationId', sortOrder = 'desc' } = params
    
    const endpoint = `/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/records`
    
    try {
      // 构建查询参数
      const queryParams = new URLSearchParams({
        page_size: pageSize.toString()
      })
      
      // 添加page_token参数用于分页
      if (pageToken) {
        queryParams.append('page_token', pageToken)
      }
      
      // 添加过滤条件（如果飞书支持的话）
      if (status) {
        queryParams.append('filter', `CurrentValue.["作品状态"] = "${status}"`)
      }
      
      const response = await this.makeRequest('GET', `${endpoint}?${queryParams.toString()}`)
      
      if (response.code !== 0) {
        throw new Error(`飞书API返回错误: ${response.msg}`)
      }
      
      if (!response.data?.items) {
        return {
          items: [],
          hasMore: false,
          total: 0,
          pageToken: null,
          nextPageToken: null
        }
      }

      // 先过滤掉不完整的记录（只有编号字段的记录）
      const completeRecords = response.data.items.filter(item => {
        return Object.keys(item.fields).length > 1 // 超过1个字段
      })
      
      let filteredItems = completeRecords.map(record => this.formatRecord(record))
      
      // 在内存中进行额外过滤（飞书API过滤功能有限）
      if (status) {
        filteredItems = filteredItems.filter(item => 
          item.status && item.status.includes(status)
        )
      }
      
      if (type) {
        filteredItems = filteredItems.filter(item => 
          item.type === type
        )
      }
      
      // 在内存中进行排序
      filteredItems.sort((a, b) => {
        let aValue = a[sortBy]
        let bValue = b[sortBy]
        
        // 处理不同类型的字段
        if (sortBy === 'registrationId') {
          // 编号排序：按编号字符串排序
          aValue = aValue || ''
          bValue = bValue || ''
        } else if (sortBy === 'createdTime' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
          // 时间排序：转换为时间戳
          aValue = aValue ? new Date(aValue).getTime() : 0
          bValue = bValue ? new Date(bValue).getTime() : 0
        } else {
          // 其他字段：字符串排序
          aValue = (aValue || '').toString().toLowerCase()
          bValue = (bValue || '').toString().toLowerCase()
        }
        
        // 根据排序方向返回结果
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
        }
      })
      
      return {
        items: filteredItems,
        hasMore: response.data.has_more || false,
        total: response.data.total || filteredItems.length,
        pageToken: pageToken,
        nextPageToken: response.data.page_token || null
      }
    } catch (error) {
      console.error('获取飞书记录列表失败:', error)
      throw new Error('获取报名列表失败')
    }
  }

  // 更新报名记录
  async updateRegistration(recordId, updates) {
    const endpoint = `/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/records/${recordId}`
    
    const updateData = {
      fields: {}
    }

    // 映射更新字段
    if (updates.status) {
      updateData.fields['作品状态'] = [updates.status]
    }
    if (updates.remarks !== undefined) {
      updateData.fields['备注'] = updates.remarks
    }
    if (updates.name) {
      updateData.fields['参演单位'] = updates.name
    }
    if (updates.contact) {
      updateData.fields['参演单位负责人联系方式'] = parseInt(updates.contact)
    }
    if (updates.programName) {
      updateData.fields['作品名称'] = updates.programName
    }
    if (updates.performers) {
      updateData.fields['演职人员'] = updates.performers
    }

    try {
      const response = await this.makeRequest('PUT', endpoint, updateData)
      return this.formatRecord(response.data.record)
    } catch (error) {
      console.error('更新飞书记录失败:', error)
      throw new Error('更新报名信息失败')
    }
  }

  // 删除报名记录
  async deleteRegistration(recordId) {
    const endpoint = `/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/records/${recordId}`
    
    try {
      await this.makeRequest('DELETE', endpoint)
      return true
    } catch (error) {
      console.error('删除飞书记录失败:', error)
      throw new Error('删除报名信息失败')
    }
  }

  // 格式化记录
  formatRecord(record) {
    const fields = record.fields
    
    return {
      id: record.record_id,
      registrationId: fields['编号'],
      name: fields['参演单位'],
      contact: fields['参演单位负责人联系方式']?.toString(),
      type: fields['作品类型'],
      programName: fields['作品名称'],
      performers: fields['演职人员'],
      onCamera: fields['演职人员是否出镜'],
      status: Array.isArray(fields['作品状态']) ? fields['作品状态'][0] : fields['作品状态'],
      remarks: fields['备注'],
      copyright: Array.isArray(fields['请确定您所报名的节目为自创，或已受到原创授权的节目']) 
        ? fields['请确定您所报名的节目为自创，或已受到原创授权的节目'][0] 
        : fields['请确定您所报名的节目为自创，或已受到原创授权的节目'],
      createdTime: fields['日期（自动化筛选条件）'],
      description: fields['作品类型-其他-补充内容'] || fields['作品类型-乐器-補充內容'] || '',
      createdAt: record.created_time,
      updatedAt: record.last_modified_time
    }
  }

  // 同步字段信息
  async syncFields() {
    try {
      console.log('🔄 开始同步飞书字段信息...')
      
      // 动态引入避免循环引用
      const feishuFieldService = require('./feishuFieldService')
      
      // 获取最新的字段映射
      const fieldMapping = await feishuFieldService.syncFieldMapping()
      
      // 更新当前的字段映射缓存
      this.fieldMapping = fieldMapping
      
      console.log('✅ 字段信息同步完成:', {
        总字段数: fieldMapping.list.length,
        字段名称: fieldMapping.list.map(f => f.name)
      })
      
      return fieldMapping
    } catch (error) {
      console.error('❌ 同步字段信息失败:', error)
      throw error
    }
  }

  // 根据字段映射格式化记录
  formatRecordWithMapping(record, fieldMapping = null) {
    const fields = record.fields
    const mapping = fieldMapping || this.fieldMapping
    
    // 如果没有字段映射，使用默认格式化
    if (!mapping) {
      return this.formatRecord(record)
    }
    
    const formattedRecord = {
      id: record.record_id,
      createdAt: record.created_time,
      updatedAt: record.last_modified_time
    }
    
    // 使用字段映射动态格式化
    Object.keys(fields).forEach(fieldName => {
      const fieldInfo = mapping.byName[fieldName]
      const value = fields[fieldName]
      
      if (fieldInfo) {
        // 根据字段类型格式化值
        formattedRecord[this.getFieldKey(fieldName)] = this.formatFieldValue(value, fieldInfo.type)
      } else {
        // 未映射的字段使用原始名称
        formattedRecord[fieldName] = value
      }
    })
    
    return formattedRecord
  }

  // 获取字段的键名（用于API响应）
  getFieldKey(fieldName) {
    const keyMapping = {
      '编号': 'registrationId',
      '参演单位': 'name',
      '参演单位负责人联系方式': 'contact',
      '作品类型': 'type',
      '作品名称': 'programName',
      '演职人员': 'performers',
      '演职人员是否出镜': 'onCamera',
      '作品状态': 'status',
      '备注': 'remarks',
      '请确定您所报名的节目为自创，或已受到原创授权的节目': 'copyright',
      '日期（自动化筛选条件）': 'createdTime',
      '作品类型-其他-补充内容': 'description',
      '作品类型-乐器-補充內容': 'description'
    }
    
    return keyMapping[fieldName] || fieldName.toLowerCase().replace(/\s+/g, '_')
  }

  // 格式化字段值
  formatFieldValue(value, fieldType) {
    if (value === null || value === undefined) {
      return null
    }
    
    switch (fieldType) {
      case 'select':
      case 'multiSelect':
        return Array.isArray(value) ? value[0] : value
      case 'number':
      case 'currency':
        return typeof value === 'string' ? parseFloat(value) : value
      case 'date':
        return value
      case 'checkbox':
        return Boolean(value)
      case 'user':
        return Array.isArray(value) ? value.map(u => u.name || u.id) : value
      default:
        return value
    }
  }

  // 飞书Auth登录
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get('https://open.feishu.cn/open-apis/authen/v1/user_info', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      return response.data.data
    } catch (error) {
      console.error('获取飞书用户信息失败:', error)
      throw new Error('获取用户信息失败')
    }
  }
}

module.exports = new FeishuService()
