import axios from 'axios'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://united.quantumlight.cc/api'

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('token')
      window.location.href = '/admin/login'
    }
    
    const message = error.response?.data?.message || '网络错误'
    toast.error(message)
    
    return Promise.reject(error)
  }
)

// 认证API
export const authAPI = {
  login: (credentials, type) => api.post('/auth/login', { ...credentials, type }),
  verifyToken: () => api.get('/auth/verify'),
  feishuAuth: (code) => api.post('/auth/feishu', { code }),
  feishuAuthUrl: () => api.get('/auth/feishu/auth-url'),
}

// 用户管理API
export const userAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  updatePassword: (id, passwordData) => api.put(`/users/${id}/password`, passwordData),
  delete: (id) => api.delete(`/users/${id}`),
  getPermissions: () => api.get('/users/permissions/list'),
  getProfile: () => api.get('/users/profile/me'),
}

// 字段管理API
export const fieldAPI = {
  getAll: () => api.get('/fields'),
  getById: (fieldId) => api.get(`/fields/${fieldId}`),
  create: (fieldData) => api.post('/fields', fieldData),
  update: (fieldId, fieldData) => api.put(`/fields/${fieldId}`, fieldData),
  delete: (fieldId) => api.delete(`/fields/${fieldId}`),
  sync: () => api.post('/fields/sync'),
  getTypes: () => api.get('/fields/config/types'),
  validate: (fieldData) => api.post('/fields/validate', fieldData)
}

// 邮箱管理API
export const emailAPI = {
  getAll: () => api.get('/emails'),
  create: (emailData) => api.post('/emails', emailData),
  update: (emailId, emailData) => api.put(`/emails/${emailId}`, emailData),
  delete: (emailId) => api.delete(`/emails/${emailId}`),
  toggle: (emailId) => api.patch(`/emails/${emailId}/toggle`),
  test: (testData) => api.post('/emails/test', testData),
  bulkTest: (testData) => api.post('/emails/bulk-test', testData),
  getStats: () => api.get('/emails/stats')
}

// 报名API
export const registrationAPI = {
  submit: (data) => api.post('/registrations', data),
  query: (registrationId) => api.get(`/registrations/${registrationId}`),
  getAll: (params) => api.get('/registrations', { params }),
  update: (id, data) => api.put(`/registrations/${id}`, data),
  delete: (id) => api.delete(`/registrations/${id}`),
  approve: (id, data) => api.patch(`/registrations/${id}/approve`, data),
  reject: (id, data) => api.patch(`/registrations/${id}/reject`, data),
  secondApprove: (id, data) => api.patch(`/registrations/${id}/second-approve`, data),
  finalApprove: (id, data) => api.patch(`/registrations/${id}/final-approve`, data),
  updateStatus: (id, data) => api.patch(`/registrations/${id}/status`, data),
  getStatusOptions: () => api.get('/registrations/meta/status-options'),
  getTypeOptions: () => api.get('/registrations/meta/type-options'),
  sendBulkEmail: (data) => api.post('/registrations/bulk-email', data),
  getEmailHistory: (params) => api.get('/registrations/email-history', { params }),
}

// 新闻API
export const newsAPI = {
  getAll: (params) => api.get('/news', { params }),
  refresh: () => api.post('/news/refresh'),
  getCategories: () => api.get('/news/meta/categories'),
}

// 统计API
export const statsAPI = {
  getDashboard: () => api.get('/stats/dashboard'),
  getPublicStats: () => api.get('/stats/public'),
  exportRegistrations: (format) => api.get('/stats/export/registrations', { params: { format } }),
}

// 设置API
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  update: (settings) => api.put('/settings', settings),
  getDebug: () => api.get('/settings/debug'),
  updateDebug: (debugSettings) => api.put('/settings/debug', debugSettings),
  getDebugPublic: () => api.get('/settings/debug/public'),
  reset: () => api.post('/settings/reset'),
  backup: () => api.post('/settings/backup'),
}

// 日志API
export const logAPI = {
  getLoginLogs: (params) => api.get('/logs/login', { params }),
  getOperationLogs: (params) => api.get('/logs/operation', { params }),
  getStats: (days = 7) => api.get(`/logs/stats?days=${days}`),
  cleanup: (retentionDays) => api.post('/logs/cleanup', { retentionDays }),
  export: (type, format, params) => api.get(`/logs/export?type=${type}&format=${format}`, { 
    params,
    responseType: 'blob'
  })
}

// Halo博客API
export const haloAPI = {
  // 基础配置
  getStatus: () => api.get('/halo/status'),
  config: (baseUrl, token) => api.post('/halo/config', { baseUrl, token }),
  test: () => api.post('/halo/test'),
  
  // 文章管理
  getPosts: (params) => api.get('/halo/posts', { params }),
  getPost: (postId) => api.get(`/halo/posts/${postId}`),
  createPost: (data) => api.post('/halo/posts', data),
  updatePost: (postId, data) => api.put(`/halo/posts/${postId}`, data),
  deletePost: (postId) => api.delete(`/halo/posts/${postId}`),
  publishPost: (postId) => api.patch(`/halo/posts/${postId}/publish`),
  unpublishPost: (postId) => api.patch(`/halo/posts/${postId}/unpublish`),
  
  // 分类管理
  getCategories: () => api.get('/halo/categories'),
  getCategory: (categoryId) => api.get(`/halo/categories/${categoryId}`),
  createCategory: (data) => api.post('/halo/categories', data),
  updateCategory: (categoryId, data) => api.put(`/halo/categories/${categoryId}`, data),
  deleteCategory: (categoryId) => api.delete(`/halo/categories/${categoryId}`),
  
  // 标签管理
  getTags: () => api.get('/halo/tags'),
  getTag: (tagId) => api.get(`/halo/tags/${tagId}`),
  createTag: (data) => api.post('/halo/tags', data),
  updateTag: (tagId, data) => api.put(`/halo/tags/${tagId}`, data),
  deleteTag: (tagId) => api.delete(`/halo/tags/${tagId}`),
  
  // 新闻同步
  syncNews: (newsId, options) => api.post(`/halo/sync/news/${newsId}`, options),
  batchSyncNews: (options) => api.post('/halo/sync/news/batch', options)
}

// 健康检查API
export const healthAPI = {
  getStatus: () => api.get('/health/status'),
  runAllChecks: () => api.get('/health/check'),
  runCheck: (checkName) => api.get(`/health/check/${checkName}`),
  getSystemInfo: () => api.get('/health/system'),
  getAvailableChecks: () => api.get('/health/checks')
}

export default api
