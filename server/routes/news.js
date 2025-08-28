const express = require('express')
const { authenticateToken, optionalAuth } = require('../middleware/auth')
const newsService = require('../services/newsService')

const router = express.Router()

// 获取新闻列表 (无需登录)
router.get('/', async (req, res) => {
  try {
    const { search, category, limit } = req.query
    
    let result
    
    if (search) {
      // 搜索新闻
      const items = await newsService.searchNews(search)
      result = {
        title: 'AdventureX Blog - 搜索结果',
        description: `搜索 "${search}" 的结果`,
        items: limit ? items.slice(0, parseInt(limit)) : items,
        total: items.length
      }
    } else if (category) {
      // 按分类获取
      const items = await newsService.getNewsByCategory(category)
      result = {
        title: 'AdventureX Blog - 分类新闻',
        description: `分类 "${category}" 的文章`,
        items: limit ? items.slice(0, parseInt(limit)) : items,
        total: items.length
      }
    } else if (limit) {
      // 获取最新指定数量的新闻
      result = await newsService.getLatestNews(parseInt(limit))
    } else {
      // 获取所有新闻
      result = await newsService.getNews()
    }

    res.json({
      message: '获取成功',
      data: result
    })
  } catch (error) {
    console.error('获取新闻失败:', error)
    res.status(500).json({ 
      message: '获取新闻失败，请稍后重试' 
    })
  }
})

// 获取单条新闻详情 (无需登录)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const newsItem = await newsService.getNewsItem(id)
    
    if (!newsItem) {
      return res.status(404).json({ message: '新闻不存在' })
    }

    res.json({
      message: '获取成功',
      data: newsItem
    })
  } catch (error) {
    console.error('获取新闻详情失败:', error)
    res.status(500).json({ 
      message: '获取新闻详情失败' 
    })
  }
})

// 刷新新闻 (需要管理员权限)
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const result = await newsService.refreshNews()
    
    res.json({
      message: '刷新成功',
      data: {
        total: result.items.length,
        lastUpdate: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('刷新新闻失败:', error)
    res.status(500).json({ 
      message: '刷新新闻失败' 
    })
  }
})

// 获取缓存状态 (需要管理员权限)
router.get('/meta/cache-status', authenticateToken, (req, res) => {
  const cacheStatus = newsService.getCacheStatus()
  
  res.json({
    message: '获取成功',
    data: cacheStatus
  })
})

// 获取可用的分类 (无需登录)
router.get('/meta/categories', async (req, res) => {
  try {
    const news = await newsService.getNews()
    
    // 提取所有分类
    const categoriesSet = new Set()
    news.items.forEach(item => {
      if (item.categories && Array.isArray(item.categories)) {
        item.categories.forEach(cat => categoriesSet.add(cat))
      }
    })
    
    const categories = Array.from(categoriesSet).sort()
    
    res.json({
      message: '获取成功',
      data: categories
    })
  } catch (error) {
    console.error('获取分类失败:', error)
    res.status(500).json({ 
      message: '获取分类失败' 
    })
  }
})

// 获取最新文章（用于首页展示）
router.get('/latest/:count', async (req, res) => {
  try {
    const count = parseInt(req.params.count) || 5
    const result = await newsService.getLatestNews(count)
    
    res.json({
      message: '获取成功',
      data: result.items
    })
  } catch (error) {
    console.error('获取最新文章失败:', error)
    res.status(500).json({ 
      message: '获取最新文章失败' 
    })
  }
})

module.exports = router
