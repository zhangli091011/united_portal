const Parser = require('rss-parser')
const config = require('../config')

class NewsService {
  constructor() {
    this.parser = new Parser({
      customFields: {
        item: [
          'description',
          'content:encoded',
          'media:content',
          'media:thumbnail'
        ]
      }
    })
    this.cache = {
      data: null,
      lastFetch: null,
      ttl: 10 * 60 * 1000 // 10分钟缓存
    }
  }

  // 获取RSS新闻
  async getNews(forceRefresh = false) {
    // 检查缓存
    if (!forceRefresh && this.cache.data && this.cache.lastFetch) {
      const cacheAge = Date.now() - this.cache.lastFetch
      if (cacheAge < this.cache.ttl) {
        console.log('📰 使用缓存的RSS数据')
        return this.cache.data
      }
    }

    try {
      console.log('📰 获取RSS数据:', config.rss.feedUrl)
      const feed = await this.parser.parseURL(config.rss.feedUrl)
      
      const processedNews = {
        title: feed.title,
        description: feed.description,
        link: feed.link,
        lastBuildDate: feed.lastBuildDate,
        items: feed.items.map(item => this.processItem(item)).slice(0, 20) // 最多20条
      }

      // 更新缓存
      this.cache.data = processedNews
      this.cache.lastFetch = Date.now()

      console.log(`📰 成功获取 ${processedNews.items.length} 条新闻`)
      return processedNews
    } catch (error) {
      console.error('📰 获取RSS新闻失败:', error.message)
      
      // 如果有缓存数据，返回缓存
      if (this.cache.data) {
        console.log('📰 RSS获取失败，返回缓存数据')
        return this.cache.data
      }
      
      throw new Error('获取新闻失败')
    }
  }

  // 处理新闻项目
  processItem(item) {
    return {
      id: this.generateId(item.link || item.guid),
      title: this.cleanText(item.title),
      link: item.link,
      description: this.cleanText(item.description || item.summary),
      content: this.cleanText(item['content:encoded'] || item.content),
      pubDate: item.pubDate,
      isoDate: item.isoDate,
      author: item.author || item.creator,
      categories: item.categories || [],
      thumbnail: this.extractThumbnail(item),
      excerpt: this.generateExcerpt(item.description || item.summary)
    }
  }

  // 生成ID
  generateId(link) {
    if (!link) return Date.now().toString()
    return Buffer.from(link).toString('base64').slice(0, 16)
  }

  // 清理文本
  cleanText(text) {
    if (!text) return ''
    
    return text
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  // 提取缩略图
  extractThumbnail(item) {
    // 尝试从多个字段提取缩略图
    if (item['media:thumbnail'] && item['media:thumbnail'].$ && item['media:thumbnail'].$.url) {
      return item['media:thumbnail'].$.url
    }
    
    if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
      const url = item['media:content'].$.url
      if (this.isImageUrl(url)) {
        return url
      }
    }

    // 从description中提取第一张图片
    if (item.description) {
      const imgMatch = item.description.match(/<img[^>]+src="([^"]+)"/i)
      if (imgMatch && imgMatch[1]) {
        return imgMatch[1]
      }
    }

    // 从content中提取第一张图片
    if (item['content:encoded']) {
      const imgMatch = item['content:encoded'].match(/<img[^>]+src="([^"]+)"/i)
      if (imgMatch && imgMatch[1]) {
        return imgMatch[1]
      }
    }

    return null
  }

  // 判断是否为图片URL
  isImageUrl(url) {
    return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url)
  }

  // 生成摘要
  generateExcerpt(text, maxLength = 150) {
    if (!text) return ''
    
    const cleaned = this.cleanText(text)
    if (cleaned.length <= maxLength) return cleaned
    
    return cleaned.substring(0, maxLength) + '...'
  }

  // 强制刷新新闻
  async refreshNews() {
    return await this.getNews(true)
  }

  // 获取单条新闻详情（如果需要）
  async getNewsItem(id) {
    const news = await this.getNews()
    return news.items.find(item => item.id === id)
  }

  // 搜索新闻
  async searchNews(query) {
    const news = await this.getNews()
    const searchTerm = query.toLowerCase()
    
    return news.items.filter(item => 
      item.title.toLowerCase().includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm) ||
      item.content.toLowerCase().includes(searchTerm) ||
      item.categories.some(cat => cat.toLowerCase().includes(searchTerm))
    )
  }

  // 按分类获取新闻
  async getNewsByCategory(category) {
    const news = await this.getNews()
    const categoryLower = category.toLowerCase()
    
    return news.items.filter(item => 
      item.categories.some(cat => cat.toLowerCase().includes(categoryLower))
    )
  }

  // 获取最新新闻（指定数量）
  async getLatestNews(count = 5) {
    const news = await this.getNews()
    return {
      ...news,
      items: news.items.slice(0, count)
    }
  }

  // 获取缓存状态
  getCacheStatus() {
    return {
      hasCache: !!this.cache.data,
      lastFetch: this.cache.lastFetch,
      cacheAge: this.cache.lastFetch ? Date.now() - this.cache.lastFetch : null,
      ttl: this.cache.ttl,
      itemCount: this.cache.data ? this.cache.data.items.length : 0
    }
  }
}

module.exports = new NewsService()
