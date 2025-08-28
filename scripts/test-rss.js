#!/usr/bin/env node
/**
 * RSS新闻获取测试脚本
 */

const newsService = require('../server/services/newsService')

async function testRSS() {
  console.log('🚀 开始测试RSS新闻获取...\n')
  
  try {
    // 获取缓存状态
    const cacheStatus = newsService.getCacheStatus()
    console.log('📊 缓存状态:')
    console.log(`  - 有缓存: ${cacheStatus.hasCache}`)
    console.log(`  - 最后获取: ${cacheStatus.lastFetch ? new Date(cacheStatus.lastFetch).toLocaleString('zh-CN') : '无'}`)
    console.log(`  - 缓存时长: ${cacheStatus.cacheAge ? Math.round(cacheStatus.cacheAge / 1000) + '秒' : '无'}`)
    console.log(`  - 文章数量: ${cacheStatus.itemCount}`)
    console.log()

    // 强制刷新获取最新数据
    console.log('🔄 强制刷新RSS数据...')
    const news = await newsService.refreshNews()
    
    console.log('📰 RSS源信息:')
    console.log(`  - 标题: ${news.title}`)
    console.log(`  - 描述: ${news.description}`)
    console.log(`  - 链接: ${news.link}`)
    console.log(`  - 最后更新: ${news.lastBuildDate}`)
    console.log(`  - 文章数量: ${news.items.length}`)
    console.log()

    if (news.items.length > 0) {
      console.log('📄 最新文章:')
      news.items.slice(0, 5).forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.title}`)
        console.log(`     链接: ${item.link}`)
        console.log(`     发布时间: ${item.pubDate ? new Date(item.pubDate).toLocaleString('zh-CN') : '未知'}`)
        console.log(`     作者: ${item.author || '未知'}`)
        console.log(`     分类: ${item.categories.join(', ') || '无'}`)
        console.log(`     摘要: ${item.excerpt}`)
        if (item.thumbnail) {
          console.log(`     缩略图: ${item.thumbnail}`)
        }
        console.log()
      })

      // 按分类统计
      const categoryStats = {}
      news.items.forEach(item => {
        item.categories.forEach(cat => {
          categoryStats[cat] = (categoryStats[cat] || 0) + 1
        })
      })

      if (Object.keys(categoryStats).length > 0) {
        console.log('📊 分类统计:')
        Object.entries(categoryStats)
          .sort(([,a], [,b]) => b - a)
          .forEach(([category, count]) => {
            console.log(`  - ${category}: ${count} 篇`)
          })
        console.log()
      }

      // 测试搜索功能
      console.log('🔍 测试搜索功能 (关键词: "新闻"):')
      const searchResults = await newsService.searchNews('新闻')
      console.log(`  找到 ${searchResults.length} 篇相关文章`)
      searchResults.slice(0, 3).forEach((item, index) => {
        console.log(`    ${index + 1}. ${item.title}`)
      })
    } else {
      console.log('❌ 没有获取到任何文章')
    }

  } catch (error) {
    console.error('❌ RSS测试失败:', error.message)
    if (error.stack) {
      console.error('详细错误信息:', error.stack)
    }
  }

  console.log('\n✅ RSS测试完成!')
}

// 如果直接运行脚本
if (require.main === module) {
  testRSS()
}

module.exports = testRSS
