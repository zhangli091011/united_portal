/**
 * Halo博客API客户端
 * 用于外部接入Halo进行文章发布、分类和标签管理
 */

const axios = require('axios')
const crypto = require('crypto')
const config = require('../config')

class HaloService {
  constructor() {
    this.baseUrl = null
    this.token = null
    this.apiBase = null
    this.contentApiBase = null
    this.headers = null
    this.isConfigured = false
    
    // 初始化配置
    this.initializeConfig()
  }

  /**
   * 初始化Halo配置
   */
  initializeConfig() {
    try {
      if (config.halo && config.halo.baseUrl && config.halo.token) {
        this.configure(config.halo.baseUrl, config.halo.token)
        console.log('✅ Halo博客配置已初始化')
      } else {
        console.log('ℹ️ Halo博客配置未设置，请在配置文件中添加相关配置')
      }
    } catch (error) {
      console.error('❌ Halo博客配置初始化失败:', error.message)
    }
  }

  configure(baseUrl, token) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // 移除末尾斜杠
    this.token = token
    this.apiBase = `${this.baseUrl}/apis/api.console.halo.run/v1alpha1`
    this.contentApiBase = `${this.baseUrl}/apis/content.halo.run/v1alpha1`
    this.headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    }
    this.isConfigured = true
  }

  /**
   * 检查是否已配置
   */
  checkConfiguration() {
    if (!this.isConfigured) {
      throw new Error('Halo博客未配置，请先设置博客地址和访问令牌')
    }
  }

  /**
   * 发送HTTP请求的通用方法
   * @param {string} method - HTTP方法
   * @param {string} url - 请求URL
   * @param {Object} data - 请求数据
   * @returns {Promise<Object>} 响应数据
   */
  async makeRequest(method, url, data = null) {
    this.checkConfiguration()

    try {
      const config = {
        method: method.toLowerCase(),
        url,
        headers: this.headers,
        timeout: 30000 // 30秒超时
      }

      if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
        config.data = data
      }

      console.log(`📤 Halo API请求: ${method.toUpperCase()} ${url}`)
      const response = await axios(config)
      console.log(`✅ Halo API响应: ${response.status}`)
      
      return response.data
    } catch (error) {
      const status = error.response?.status || 'unknown'
      const message = error.response?.data?.message || error.message
      console.error(`❌ Halo API请求失败: ${method.toUpperCase()} ${url} - ${status}: ${message}`)
      throw new Error(`Halo API请求失败: ${message}`)
    }
  }

  /**
   * 测试连接
   * @returns {Promise<boolean>} 连接是否成功
   */
  async testConnection() {
    try {
      this.checkConfiguration()
      const url = `${this.contentApiBase}/posts?page=0&size=1`
      await this.makeRequest('GET', url)
      console.log('✅ Halo博客连接测试成功')
      return true
    } catch (error) {
      console.error('❌ Halo博客连接测试失败:', error.message)
      return false
    }
  }

  /**
   * 获取所有分类
   * @returns {Promise<Array>} 分类列表
   */
  async getCategories() {
    try {
      const url = `${this.contentApiBase}/categories`
      const response = await this.makeRequest('GET', url)
      const categories = response.items || []
      console.log(`📋 获取到 ${categories.length} 个分类`)
      return response // 返回完整响应对象，包含 items
    } catch (error) {
      console.error('❌ 获取分类失败:', error.message)
      return { items: [] }
    }
  }

  /**
   * 获取所有标签
   * @returns {Promise<Array>} 标签列表
   */
  async getTags() {
    try {
      const url = `${this.contentApiBase}/tags`
      const response = await this.makeRequest('GET', url)
      const tags = response.items || []
      console.log(`🏷️ 获取到 ${tags.length} 个标签`)
      return response // 返回完整响应对象，包含 items
    } catch (error) {
      console.error('❌ 获取标签失败:', error.message)
      return { items: [] }
    }
  }

  /**
   * 创建分类
   * @param {string} name - 分类名称
   * @param {string} slug - 分类别名
   * @param {string} description - 分类描述
   * @returns {Promise<Object|null>} 创建的分类信息
   */
  async createCategory(name, slug = null, description = '') {
    try {
      if (!slug) {
        slug = this.generateSlug(name)
      }

      const categoryData = {
        apiVersion: 'content.halo.run/v1alpha1',
        kind: 'Category',
        metadata: {
          name: this.generateId('category'),
          generateName: 'category-'
        },
        spec: {
          displayName: name,
          slug,
          description,
          cover: '',
          template: '',
          priority: 0,
          children: []
        }
      }

      const url = `${this.contentApiBase}/categories`
      const response = await this.makeRequest('POST', url, categoryData)
      console.log(`✅ 成功创建分类: ${name}`)
      return response
    } catch (error) {
      console.error(`❌ 创建分类失败: ${name} - ${error.message}`)
      return null
    }
  }

  /**
   * 创建标签
   * @param {string} name - 标签名称
   * @param {string} slug - 标签别名
   * @param {string} color - 标签颜色
   * @returns {Promise<Object|null>} 创建的标签信息
   */
  async createTag(name, slug = null, color = '#ffffff') {
    try {
      if (!slug) {
        slug = this.generateSlug(name)
      }

      const tagData = {
        apiVersion: 'content.halo.run/v1alpha1',
        kind: 'Tag',
        metadata: {
          name: this.generateId('tag'),
          generateName: 'tag-'
        },
        spec: {
          displayName: name,
          slug,
          color,
          cover: ''
        }
      }

      const url = `${this.contentApiBase}/tags`
      const response = await this.makeRequest('POST', url, tagData)
      console.log(`✅ 成功创建标签: ${name}`)
      return response
    } catch (error) {
      console.error(`❌ 创建标签失败: ${name} - ${error.message}`)
      return null
    }
  }

  /**
   * 根据名称查找分类
   * @param {string} name - 分类名称
   * @returns {Promise<string|null>} 分类ID
   */
  async findCategoryByName(name) {
    try {
      const categories = await this.getCategories()
      const category = categories.find(cat => 
        cat.spec?.displayName === name
      )
      return category?.metadata?.name || null
    } catch (error) {
      console.error(`❌ 查找分类失败: ${name} - ${error.message}`)
      return null
    }
  }

  /**
   * 根据名称查找标签
   * @param {string} name - 标签名称
   * @returns {Promise<string|null>} 标签ID
   */
  async findTagByName(name) {
    try {
      const tags = await this.getTags()
      const tag = tags.find(t => 
        t.spec?.displayName === name
      )
      return tag?.metadata?.name || null
    } catch (error) {
      console.error(`❌ 查找标签失败: ${name} - ${error.message}`)
      return null
    }
  }

  /**
   * 创建文章
   * @param {Object} options - 文章配置
   * @returns {Promise<Object|null>} 创建的文章信息
   */
  async createPost(options) {
    try {
      const {
        title,
        content,
        contentType = 'MARKDOWN',
        slug = null,
        categories = [],
        tags = [],
        cover = '',
        excerpt = '',
        visible = 'PUBLIC',
        allowComment = true,
        pinned = false,
        publish = true
      } = options

      // 生成slug
      const postSlug = slug || this.generateSlug(title)

      // 处理分类
      const categoryRefs = []
      for (const categoryName of categories) {
        let categoryId = await this.findCategoryByName(categoryName)
        if (!categoryId) {
          // 分类不存在则创建
          const newCategory = await this.createCategory(categoryName)
          if (newCategory) {
            categoryId = newCategory.metadata?.name
          }
        }
        if (categoryId) {
          categoryRefs.push(categoryId)
        }
      }

      // 处理标签
      const tagRefs = []
      for (const tagName of tags) {
        let tagId = await this.findTagByName(tagName)
        if (!tagId) {
          // 标签不存在则创建
          const newTag = await this.createTag(tagName)
          if (newTag) {
            tagId = newTag.metadata?.name
          }
        }
        if (tagId) {
          tagRefs.push(tagId)
        }
      }

      // 准备文章数据
      const postData = {
        post: {
          apiVersion: 'content.halo.run/v1alpha1',
          kind: 'Post',
          metadata: {
            name: this.generateId('post'),
            annotations: {
              'content.halo.run/preferred-editor': 'default'
            }
          },
          spec: {
            title,
            slug: postSlug,
            template: '',
            cover,
            deleted: false,
            publish,
            publishTime: publish ? new Date().toISOString() : null,
            pinned,
            allowComment,
            visible,
            priority: 0,
            excerpt: {
              autoGenerate: !excerpt,
              raw: excerpt
            },
            categories: categoryRefs,
            tags: tagRefs,
            htmlMetas: []
          }
        },
        content: {
          raw: content,
          content: contentType === 'HTML' ? content : '',
          rawType: contentType
        }
      }

      const url = `${this.apiBase}/posts`
      const response = await this.makeRequest('POST', url, postData)
      console.log(`✅ 成功创建文章: ${title}`)
      return response
    } catch (error) {
      console.error(`❌ 创建文章失败: ${options.title} - ${error.message}`)
      return null
    }
  }

  /**
   * 发布文章
   * @param {string} postName - 文章名称
   * @returns {Promise<boolean>} 是否发布成功
   */
  async publishPost(postName) {
    try {
      const url = `${this.apiBase}/posts/${postName}/publish`
      await this.makeRequest('PUT', url)
      console.log(`✅ 成功发布文章: ${postName}`)
      return true
    } catch (error) {
      console.error(`❌ 发布文章失败: ${postName} - ${error.message}`)
      return false
    }
  }

  /**
   * 获取文章列表
   * @param {number} page - 页码
   * @param {number} size - 每页大小
   * @returns {Promise<Array>} 文章列表
   */
  async getPosts(page = 0, size = 10) {
    try {
      const url = `${this.apiBase}/posts?page=${page}&size=${size}`
      const response = await this.makeRequest('GET', url)
      const posts = response.items || []
      console.log(`📄 获取到 ${posts.length} 篇文章`)
      return response // 返回完整响应对象，包含 items
    } catch (error) {
      console.error('❌ 获取文章失败:', error.message)
      return { items: [] }
    }
  }

  /**
   * 同步RSS新闻到Halo博客
   * @param {Object} newsItem - 新闻项目
   * @param {Object} options - 同步选项
   * @returns {Promise<Object|null>} 同步结果
   */
  async syncNewsToHalo(newsItem, options = {}) {
    try {
      const {
        categoryName = '新闻资讯',
        tags = ['新闻', 'RSS'],
        autoPublish = true
      } = options

      // 构建Markdown内容
      let content = ''
      
      // 添加原文链接
      if (newsItem.link) {
        content += `> 原文链接: [${newsItem.title}](${newsItem.link})\n\n`
      }
      
      // 添加发布时间
      if (newsItem.pubDate) {
        content += `> 发布时间: ${new Date(newsItem.pubDate).toLocaleString('zh-CN')}\n\n`
      }

      // 添加作者信息
      if (newsItem.author) {
        content += `> 作者: ${newsItem.author}\n\n`
      }

      // 添加分隔线
      content += '---\n\n'

      // 添加文章内容
      if (newsItem.content) {
        content += newsItem.content
      } else if (newsItem.description) {
        content += newsItem.description
      }

      // 添加来源说明
      content += `\n\n---\n\n*本文转载自RSS源，版权归原作者所有。*`

      // 处理标签（包含新闻分类）
      const postTags = [...tags]
      if (newsItem.categories && newsItem.categories.length > 0) {
        postTags.push(...newsItem.categories.slice(0, 3)) // 最多添加3个分类作为标签
      }

      // 创建文章
      const postOptions = {
        title: newsItem.title,
        content,
        contentType: 'MARKDOWN',
        slug: this.generateSlug(newsItem.title),
        categories: [categoryName],
        tags: postTags,
        cover: newsItem.thumbnail || '',
        excerpt: newsItem.excerpt || newsItem.description || '',
        visible: 'PUBLIC',
        allowComment: true,
        pinned: false,
        publish: autoPublish
      }

      const result = await this.createPost(postOptions)
      
      if (result) {
        console.log(`✅ 成功同步新闻到Halo: ${newsItem.title}`)
        return {
          success: true,
          postId: result.post?.metadata?.name,
          postUrl: `${this.baseUrl}/archives/${postOptions.slug}`,
          title: newsItem.title
        }
      } else {
        throw new Error('创建文章失败')
      }
    } catch (error) {
      console.error(`❌ 同步新闻到Halo失败: ${newsItem.title} - ${error.message}`)
      return {
        success: false,
        error: error.message,
        title: newsItem.title
      }
    }
  }

  /**
   * 批量同步新闻到Halo
   * @param {Array} newsItems - 新闻列表
   * @param {Object} options - 同步选项
   * @returns {Promise<Object>} 批量同步结果
   */
  async batchSyncNews(newsItems, options = {}) {
    const results = {
      total: newsItems.length,
      success: 0,
      failed: 0,
      results: []
    }

    console.log(`📋 开始批量同步 ${newsItems.length} 条新闻到Halo博客`)

    for (const newsItem of newsItems) {
      try {
        const result = await this.syncNewsToHalo(newsItem, options)
        results.results.push(result)
        
        if (result.success) {
          results.success++
        } else {
          results.failed++
        }

        // 添加延迟避免请求过快
        await this.delay(1000)
      } catch (error) {
        results.failed++
        results.results.push({
          success: false,
          error: error.message,
          title: newsItem.title
        })
      }
    }

    console.log(`📊 批量同步完成: 成功 ${results.success} 条, 失败 ${results.failed} 条`)
    return results
  }

  /**
   * 生成唯一ID
   * @param {string} prefix - ID前缀
   * @returns {string} 唯一ID
   */
  generateId(prefix = 'item') {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${prefix}_${timestamp}_${random}`
  }

  /**
   * 生成URL友好的slug
   * @param {string} text - 原始文本
   * @returns {string} slug
   */
  generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-') // 保留中文字符
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50) // 限制长度
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取单个文章
   * @param {string} postId 文章ID
   * @returns {Object} 文章详情
   */
  async getPost(postId) {
    const url = `${this.apiBase}/posts/${postId}`
    return await this.makeRequest('GET', url)
  }

  /**
   * 更新文章
   * @param {string} postId 文章ID
   * @param {Object} postData 文章数据
   * @returns {Object} 更新结果
   */
  async updatePost(postId, postData) {
    const url = `${this.apiBase}/posts/${postId}`
    return await this.makeRequest('PUT', url, postData)
  }

  /**
   * 删除文章
   * @param {string} postId 文章ID
   * @returns {Object} 删除结果
   */
  async deletePost(postId) {
    const url = `${this.apiBase}/posts/${postId}`
    return await this.makeRequest('DELETE', url)
  }

  /**
   * 取消发布文章
   * @param {string} postName 文章名称
   * @returns {Object} 操作结果
   */
  async unpublishPost(postName) {
    try {
      const url = `${this.apiBase}/posts/${postName}/unpublish`
      return await this.makeRequest('PUT', url)
    } catch (error) {
      console.error('取消发布文章失败:', error.message)
      throw error
    }
  }

  /**
   * 获取单个分类
   * @param {string} categoryId 分类ID
   * @returns {Object} 分类详情
   */
  async getCategory(categoryId) {
    const url = `${this.apiBase}/categories/${categoryId}`
    return await this.makeRequest('GET', url)
  }

  /**
   * 更新分类
   * @param {string} categoryId 分类ID
   * @param {Object} categoryData 分类数据
   * @returns {Object} 更新结果
   */
  async updateCategory(categoryId, categoryData) {
    const url = `${this.apiBase}/categories/${categoryId}`
    return await this.makeRequest('PUT', url, categoryData)
  }

  /**
   * 删除分类
   * @param {string} categoryId 分类ID
   * @returns {Object} 删除结果
   */
  async deleteCategory(categoryId) {
    const url = `${this.apiBase}/categories/${categoryId}`
    return await this.makeRequest('DELETE', url)
  }

  /**
   * 获取单个标签
   * @param {string} tagId 标签ID
   * @returns {Object} 标签详情
   */
  async getTag(tagId) {
    const url = `${this.apiBase}/tags/${tagId}`
    return await this.makeRequest('GET', url)
  }

  /**
   * 更新标签
   * @param {string} tagId 标签ID
   * @param {Object} tagData 标签数据
   * @returns {Object} 更新结果
   */
  async updateTag(tagId, tagData) {
    const url = `${this.apiBase}/tags/${tagId}`
    return await this.makeRequest('PUT', url, tagData)
  }

  /**
   * 删除标签
   * @param {string} tagId 标签ID
   * @returns {Object} 删除结果
   */
  async deleteTag(tagId) {
    const url = `${this.apiBase}/tags/${tagId}`
    return await this.makeRequest('DELETE', url)
  }

  /**
   * 获取配置状态
   * @returns {Object} 配置状态
   */
  getStatus() {
    return {
      isConfigured: this.isConfigured,
      baseUrl: this.baseUrl,
      hasToken: !!this.token
    }
  }
}

module.exports = new HaloService()

