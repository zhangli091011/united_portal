const express = require('express')
const { authenticateToken, requirePermission } = require('../middleware/auth')
const { autoLogOperation } = require('../middleware/logging')
const haloService = require('../services/haloService')
const newsService = require('../services/newsService')
const { body, validationResult } = require('express-validator')

const router = express.Router()

// 获取Halo状态
router.get('/status', 
  authenticateToken, 
  requirePermission('halo.view'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const status = haloService.getStatus()
      const testResult = status.isConfigured ? await haloService.testConnection() : false
      
      res.json({
        message: '获取Halo状态成功',
        data: {
          ...status,
          connectionTest: testResult
        }
      })
    } catch (error) {
      console.error('获取Halo状态失败:', error)
      res.status(500).json({ 
        message: '获取Halo状态失败',
        error: error.message 
      })
    }
  }
)

// 配置Halo连接
router.post('/config',
  authenticateToken,
  requirePermission('halo.config'),
  autoLogOperation('halo'),
  [
    body('baseUrl').notEmpty().withMessage('博客地址不能为空').isURL().withMessage('博客地址格式不正确'),
    body('token').notEmpty().withMessage('访问令牌不能为空')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: '参数验证失败',
          errors: errors.array()
        })
      }

      const { baseUrl, token } = req.body
      
      // 配置Halo连接
      haloService.configure(baseUrl, token)
      
      // 测试连接
      const testResult = await haloService.testConnection()
      
      if (testResult) {
        res.json({
          message: 'Halo博客配置成功',
          data: {
            isConfigured: true,
            baseUrl,
            connectionTest: true
          }
        })
      } else {
        res.status(400).json({
          message: 'Halo博客连接测试失败，请检查配置'
        })
      }
    } catch (error) {
      console.error('配置Halo失败:', error)
      res.status(500).json({ 
        message: '配置Halo失败',
        error: error.message 
      })
    }
  }
)

// 测试连接
router.post('/test',
  authenticateToken,
  requirePermission('halo.view'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const testResult = await haloService.testConnection()
      
      if (testResult) {
        res.json({
          message: 'Halo博客连接测试成功',
          data: { connectionTest: true }
        })
      } else {
        res.status(400).json({
          message: 'Halo博客连接测试失败'
        })
      }
    } catch (error) {
      console.error('测试Halo连接失败:', error)
      res.status(500).json({ 
        message: '测试Halo连接失败',
        error: error.message 
      })
    }
  }
)

// 获取Halo分类列表
router.get('/categories',
  authenticateToken,
  requirePermission('halo.view'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const categoriesResponse = await haloService.getCategories()
      const categories = categoriesResponse.items || []
      
      res.json({
        message: '获取分类成功',
        data: categoriesResponse // 返回完整的响应对象，包含 items
      })
    } catch (error) {
      console.error('获取Halo分类失败:', error)
      res.status(500).json({ 
        message: '获取Halo分类失败',
        error: error.message 
      })
    }
  }
)

// 获取Halo标签列表
router.get('/tags',
  authenticateToken,
  requirePermission('halo.view'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const tagsResponse = await haloService.getTags()
      const tags = tagsResponse.items || []
      
      res.json({
        message: '获取标签成功',
        data: tagsResponse // 返回完整的响应对象，包含 items
      })
    } catch (error) {
      console.error('获取Halo标签失败:', error)
      res.status(500).json({ 
        message: '获取Halo标签失败',
        error: error.message 
      })
    }
  }
)

// 获取Halo文章列表
router.get('/posts',
  authenticateToken,
  requirePermission('halo.view'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const { page = 0, size = 10 } = req.query
      const postsResponse = await haloService.getPosts(parseInt(page), parseInt(size))
      const posts = postsResponse.items || []
      
      res.json({
        message: '获取文章成功',
        data: postsResponse // 返回完整的响应对象，包含 items
      })
    } catch (error) {
      console.error('获取Halo文章失败:', error)
      res.status(500).json({ 
        message: '获取Halo文章失败',
        error: error.message 
      })
    }
  }
)

// 同步单条新闻到Halo
router.post('/sync/news/:newsId',
  authenticateToken,
  requirePermission('halo.sync'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const { newsId } = req.params
      const { categoryName, tags, autoPublish } = req.body
      
      // 获取新闻详情
      const newsItem = await newsService.getNewsItem(newsId)
      if (!newsItem) {
        return res.status(404).json({
          message: '新闻不存在'
        })
      }
      
      // 同步到Halo
      const result = await haloService.syncNewsToHalo(newsItem, {
        categoryName: categoryName || 'RSS新闻',
        tags: tags || ['RSS', '新闻'],
        autoPublish: autoPublish !== undefined ? autoPublish : true
      })
      
      if (result.success) {
        res.json({
          message: '新闻同步成功',
          data: result
        })
      } else {
        res.status(400).json({
          message: '新闻同步失败',
          error: result.error
        })
      }
    } catch (error) {
      console.error('同步新闻到Halo失败:', error)
      res.status(500).json({ 
        message: '同步新闻到Halo失败',
        error: error.message 
      })
    }
  }
)

// 批量同步新闻到Halo
router.post('/sync/news/batch',
  authenticateToken,
  requirePermission('halo.sync'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const { newsIds, categoryName, tags, autoPublish, limit } = req.body
      
      let newsItems = []
      
      if (newsIds && newsIds.length > 0) {
        // 同步指定的新闻
        for (const newsId of newsIds) {
          const newsItem = await newsService.getNewsItem(newsId)
          if (newsItem) {
            newsItems.push(newsItem)
          }
        }
      } else {
        // 同步最新的新闻
        const news = await newsService.getLatestNews(limit || 5)
        newsItems = news.items
      }
      
      if (newsItems.length === 0) {
        return res.status(400).json({
          message: '没有找到要同步的新闻'
        })
      }
      
      // 批量同步
      const result = await haloService.batchSyncNews(newsItems, {
        categoryName: categoryName || 'RSS新闻',
        tags: tags || ['RSS', '新闻'],
        autoPublish: autoPublish !== undefined ? autoPublish : true
      })
      
      res.json({
        message: `批量同步完成: 成功 ${result.success} 条, 失败 ${result.failed} 条`,
        data: result
      })
    } catch (error) {
      console.error('批量同步新闻到Halo失败:', error)
      res.status(500).json({ 
        message: '批量同步新闻到Halo失败',
        error: error.message 
      })
    }
  }
)

// 创建分类
router.post('/categories',
  authenticateToken,
  requirePermission('halo.manage'),
  autoLogOperation('halo'),
  [
    body('name').notEmpty().withMessage('分类名称不能为空')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: '参数验证失败',
          errors: errors.array()
        })
      }

      const { name, slug, description } = req.body
      
      const result = await haloService.createCategory(name, slug, description)
      
      if (result) {
        res.json({
          message: '创建分类成功',
          data: {
            id: result.metadata?.name,
            name: result.spec?.displayName,
            slug: result.spec?.slug,
            description: result.spec?.description
          }
        })
      } else {
        res.status(400).json({
          message: '创建分类失败'
        })
      }
    } catch (error) {
      console.error('创建Halo分类失败:', error)
      res.status(500).json({ 
        message: '创建Halo分类失败',
        error: error.message 
      })
    }
  }
)

// 创建标签
router.post('/tags',
  authenticateToken,
  requirePermission('halo.manage'),
  autoLogOperation('halo'),
  [
    body('name').notEmpty().withMessage('标签名称不能为空')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: '参数验证失败',
          errors: errors.array()
        })
      }

      const { name, slug, color } = req.body
      
      const result = await haloService.createTag(name, slug, color)
      
      if (result) {
        res.json({
          message: '创建标签成功',
          data: {
            id: result.metadata?.name,
            name: result.spec?.displayName,
            slug: result.spec?.slug,
            color: result.spec?.color
          }
        })
      } else {
        res.status(400).json({
          message: '创建标签失败'
        })
      }
    } catch (error) {
      console.error('创建Halo标签失败:', error)
      res.status(500).json({ 
        message: '创建Halo标签失败',
        error: error.message 
      })
    }
  }
)

// 获取单个文章
router.get('/posts/:postId', 
  authenticateToken, 
  requirePermission('halo.view'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const { postId } = req.params
      const post = await haloService.getPost(postId)
      
      res.json({
        message: '获取文章成功',
        data: post
      })
    } catch (error) {
      console.error('获取文章失败:', error)
      res.status(500).json({ 
        message: '获取文章失败',
        error: error.message 
      })
    }
  }
)

// 创建文章
router.post('/posts', 
  authenticateToken, 
  requirePermission('halo.manage'),
  autoLogOperation('halo'),
  [
    body('title').notEmpty().withMessage('标题不能为空'),
    body('content').notEmpty().withMessage('内容不能为空')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: '验证失败',
          errors: errors.array()
        })
      }

      const post = await haloService.createPost(req.body)
      
      res.json({
        message: '创建文章成功',
        data: post
      })
    } catch (error) {
      console.error('创建文章失败:', error)
      res.status(500).json({ 
        message: '创建文章失败',
        error: error.message 
      })
    }
  }
)

// 更新文章
router.put('/posts/:postId', 
  authenticateToken, 
  requirePermission('halo.manage'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const { postId } = req.params
      const post = await haloService.updatePost(postId, req.body)
      
      res.json({
        message: '更新文章成功',
        data: post
      })
    } catch (error) {
      console.error('更新文章失败:', error)
      res.status(500).json({ 
        message: '更新文章失败',
        error: error.message 
      })
    }
  }
)

// 删除文章
router.delete('/posts/:postId', 
  authenticateToken, 
  requirePermission('halo.manage'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const { postId } = req.params
      await haloService.deletePost(postId)
      
      res.json({
        message: '删除文章成功'
      })
    } catch (error) {
      console.error('删除文章失败:', error)
      res.status(500).json({ 
        message: '删除文章失败',
        error: error.message 
      })
    }
  }
)

// 发布文章
router.patch('/posts/:postId/publish', 
  authenticateToken, 
  requirePermission('halo.manage'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const { postId } = req.params
      const result = await haloService.publishPost(postId)
      
      res.json({
        message: '发布文章成功',
        data: result
      })
    } catch (error) {
      console.error('发布文章失败:', error)
      res.status(500).json({ 
        message: '发布文章失败',
        error: error.message 
      })
    }
  }
)

// 取消发布文章
router.patch('/posts/:postId/unpublish', 
  authenticateToken, 
  requirePermission('halo.manage'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const { postId } = req.params
      const result = await haloService.unpublishPost(postId)
      
      res.json({
        message: '取消发布文章成功',
        data: result
      })
    } catch (error) {
      console.error('取消发布文章失败:', error)
      res.status(500).json({ 
        message: '取消发布文章失败',
        error: error.message 
      })
    }
  }
)

// 获取单个分类
router.get('/categories/:categoryId', 
  authenticateToken, 
  requirePermission('halo.view'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const { categoryId } = req.params
      const category = await haloService.getCategory(categoryId)
      
      res.json({
        message: '获取分类成功',
        data: category
      })
    } catch (error) {
      console.error('获取分类失败:', error)
      res.status(500).json({ 
        message: '获取分类失败',
        error: error.message 
      })
    }
  }
)

// 更新分类
router.put('/categories/:categoryId', 
  authenticateToken, 
  requirePermission('halo.manage'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const { categoryId } = req.params
      const category = await haloService.updateCategory(categoryId, req.body)
      
      res.json({
        message: '更新分类成功',
        data: category
      })
    } catch (error) {
      console.error('更新分类失败:', error)
      res.status(500).json({ 
        message: '更新分类失败',
        error: error.message 
      })
    }
  }
)

// 删除分类
router.delete('/categories/:categoryId', 
  authenticateToken, 
  requirePermission('halo.manage'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const { categoryId } = req.params
      await haloService.deleteCategory(categoryId)
      
      res.json({
        message: '删除分类成功'
      })
    } catch (error) {
      console.error('删除分类失败:', error)
      res.status(500).json({ 
        message: '删除分类失败',
        error: error.message 
      })
    }
  }
)

// 获取单个标签
router.get('/tags/:tagId', 
  authenticateToken, 
  requirePermission('halo.view'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const { tagId } = req.params
      const tag = await haloService.getTag(tagId)
      
      res.json({
        message: '获取标签成功',
        data: tag
      })
    } catch (error) {
      console.error('获取标签失败:', error)
      res.status(500).json({ 
        message: '获取标签失败',
        error: error.message 
      })
    }
  }
)

// 更新标签
router.put('/tags/:tagId', 
  authenticateToken, 
  requirePermission('halo.manage'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const { tagId } = req.params
      const tag = await haloService.updateTag(tagId, req.body)
      
      res.json({
        message: '更新标签成功',
        data: tag
      })
    } catch (error) {
      console.error('更新标签失败:', error)
      res.status(500).json({ 
        message: '更新标签失败',
        error: error.message 
      })
    }
  }
)

// 删除标签
router.delete('/tags/:tagId', 
  authenticateToken, 
  requirePermission('halo.manage'),
  autoLogOperation('halo'),
  async (req, res) => {
    try {
      const { tagId } = req.params
      await haloService.deleteTag(tagId)
      
      res.json({
        message: '删除标签成功'
      })
    } catch (error) {
      console.error('删除标签失败:', error)
      res.status(500).json({ 
        message: '删除标签失败',
        error: error.message 
      })
    }
  }
)

module.exports = router

