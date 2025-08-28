const axios = require('axios')
const config = require('../config')

class FeishuFieldService {
  constructor() {
    this.baseURL = 'https://open.feishu.cn/open-apis'
    this.accessToken = null
    this.tokenExpiry = null
  }

  // 获取访问令牌
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    try {
      const response = await axios.post(`${this.baseURL}/auth/v3/tenant_access_token/internal`, {
        app_id: config.feishu.appId,
        app_secret: config.feishu.appSecret
      })

      if (response.data.code === 0) {
        this.accessToken = response.data.tenant_access_token
        this.tokenExpiry = Date.now() + (response.data.expire - 60) * 1000 // 提前60秒刷新
        return this.accessToken
      } else {
        throw new Error(`获取访问令牌失败: ${response.data.msg}`)
      }
    } catch (error) {
      console.error('获取飞书访问令牌失败:', error)
      throw error
    }
  }

  // 通用API请求方法
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
      console.error('飞书字段API请求失败:', error.response?.data || error.message)
      throw error
    }
  }

  // 获取表格字段列表
  async getFields() {
    const endpoint = `/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/fields`
    
    try {
      const response = await this.makeRequest('GET', endpoint)
      
      if (response.code !== 0) {
        throw new Error(`获取字段列表失败: ${response.msg}`)
      }

      return response.data.items.map(field => this.formatField(field))
    } catch (error) {
      console.error('获取飞书字段列表失败:', error)
      throw new Error('获取字段列表失败')
    }
  }

  // 创建新字段
  async createField(fieldData) {
    const endpoint = `/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/fields`
    
    // 验证必填字段
    if (!fieldData.field_name || !fieldData.type) {
      throw new Error('字段名称和类型不能为空')
    }

    const createData = {
      field_name: fieldData.field_name,
      type: fieldData.type,
      description: fieldData.description || '',
      property: fieldData.property || {}
    }

    try {
      const response = await this.makeRequest('POST', endpoint, createData)
      
      if (response.code !== 0) {
        throw new Error(`创建字段失败: ${response.msg}`)
      }

      return this.formatField(response.data.field)
    } catch (error) {
      console.error('创建飞书字段失败:', error)
      throw new Error('创建字段失败')
    }
  }

  // 更新字段
  async updateField(fieldId, fieldData) {
    const endpoint = `/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/fields/${fieldId}`
    
    const updateData = {}
    
    // 只包含可更新的字段
    if (fieldData.field_name) updateData.field_name = fieldData.field_name
    if (fieldData.description !== undefined) updateData.description = fieldData.description
    if (fieldData.property) updateData.property = fieldData.property

    if (Object.keys(updateData).length === 0) {
      throw new Error('没有可更新的字段')
    }

    try {
      const response = await this.makeRequest('PUT', endpoint, updateData)
      
      if (response.code !== 0) {
        throw new Error(`更新字段失败: ${response.msg}`)
      }

      return this.formatField(response.data.field)
    } catch (error) {
      console.error('更新飞书字段失败:', error)
      throw new Error('更新字段失败')
    }
  }

  // 删除字段
  async deleteField(fieldId) {
    const endpoint = `/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/fields/${fieldId}`
    
    try {
      const response = await this.makeRequest('DELETE', endpoint)
      
      if (response.code !== 0) {
        throw new Error(`删除字段失败: ${response.msg}`)
      }

      return true
    } catch (error) {
      console.error('删除飞书字段失败:', error)
      throw new Error('删除字段失败')
    }
  }

  // 获取单个字段详情
  async getField(fieldId) {
    const endpoint = `/bitable/v1/apps/${config.feishu.bitableAppToken}/tables/${config.feishu.tableId}/fields/${fieldId}`
    
    try {
      const response = await this.makeRequest('GET', endpoint)
      
      if (response.code !== 0) {
        throw new Error(`获取字段详情失败: ${response.msg}`)
      }

      return this.formatField(response.data.field)
    } catch (error) {
      console.error('获取飞书字段详情失败:', error)
      throw new Error('获取字段详情失败')
    }
  }

  // 格式化字段数据
  formatField(field) {
    return {
      id: field.field_id,
      name: field.field_name,
      type: field.type,
      description: field.description || '',
      property: field.property || {},
      isPrimary: field.is_primary || false,
      uiType: field.ui_type || field.type,
      createTime: field.create_time,
      updateTime: field.update_time
    }
  }

  // 同步字段映射（用于数据转换）
  async syncFieldMapping() {
    try {
      const fields = await this.getFields()
      
      // 创建字段映射关系
      const fieldMapping = {
        byName: {},
        byId: {},
        list: fields
      }

      fields.forEach(field => {
        fieldMapping.byName[field.name] = field
        fieldMapping.byId[field.id] = field
      })

      console.log('🔄 字段映射同步完成:', {
        总数: fields.length,
        字段列表: fields.map(f => f.name)
      })

      return fieldMapping
    } catch (error) {
      console.error('同步字段映射失败:', error)
      throw error
    }
  }

  // 验证字段类型和属性
  validateFieldData(fieldData) {
    const validTypes = [
      'text', 'number', 'select', 'multiSelect', 'date', 'checkbox',
      'user', 'phone', 'url', 'email', 'currency', 'rating',
      'progress', 'singleLink', 'formula', 'createdTime', 'modifiedTime',
      'createdUser', 'modifiedUser', 'autoNumber', 'barcode', 'duplex'
    ]

    if (!validTypes.includes(fieldData.type)) {
      throw new Error(`不支持的字段类型: ${fieldData.type}`)
    }

    // 根据字段类型验证属性
    if (fieldData.type === 'select' || fieldData.type === 'multiSelect') {
      if (!fieldData.property?.options || !Array.isArray(fieldData.property.options)) {
        throw new Error('选择字段必须提供选项列表')
      }
    }

    if (fieldData.type === 'number' || fieldData.type === 'currency') {
      if (fieldData.property?.precision !== undefined && 
          (fieldData.property.precision < 0 || fieldData.property.precision > 10)) {
        throw new Error('数值字段精度必须在0-10之间')
      }
    }

    return true
  }

  // 获取字段类型配置
  getFieldTypeConfig(type) {
    const typeConfigs = {
      text: { name: '文本', editable: true, hasOptions: false },
      number: { name: '数字', editable: true, hasOptions: false },
      select: { name: '单选', editable: true, hasOptions: true },
      multiSelect: { name: '多选', editable: true, hasOptions: true },
      date: { name: '日期', editable: true, hasOptions: false },
      checkbox: { name: '复选框', editable: true, hasOptions: false },
      user: { name: '人员', editable: true, hasOptions: false },
      phone: { name: '电话', editable: true, hasOptions: false },
      url: { name: '链接', editable: true, hasOptions: false },
      email: { name: '邮箱', editable: true, hasOptions: false },
      currency: { name: '货币', editable: true, hasOptions: false },
      rating: { name: '评分', editable: true, hasOptions: false },
      progress: { name: '进度', editable: true, hasOptions: false },
      createdTime: { name: '创建时间', editable: false, hasOptions: false },
      modifiedTime: { name: '修改时间', editable: false, hasOptions: false },
      createdUser: { name: '创建人', editable: false, hasOptions: false },
      modifiedUser: { name: '修改人', editable: false, hasOptions: false },
      autoNumber: { name: '自动编号', editable: false, hasOptions: false }
    }

    return typeConfigs[type] || { name: type, editable: true, hasOptions: false }
  }
}

module.exports = new FeishuFieldService()
