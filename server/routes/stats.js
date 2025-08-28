const express = require('express')
const { authenticateToken, requirePermission } = require('../middleware/auth')
const feishuService = require('../services/feishuService')
const newsService = require('../services/newsService')

const router = express.Router()

// 获取仪表板统计数据 (需要管理员权限)
router.get('/dashboard', authenticateToken, requirePermission('stats.view'), async (req, res) => {
  try {
    // 获取所有报名记录
    const registrations = await feishuService.getAllRegistrations({ pageSize: 1000 })
    
    // 统计各种状态的数量
    const statusCounts = {}
    const typeCounts = {}
    const recentRegistrations = []
    
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    registrations.items.forEach(item => {
      // 状态统计
      const status = item.status || '未知状态'
      statusCounts[status] = (statusCounts[status] || 0) + 1
      
      // 类型统计
      const type = item.type || '未知类型'
      typeCounts[type] = (typeCounts[type] || 0) + 1
      
      // 今日报名
      const createDate = new Date(item.createdTime)
      if (createDate >= todayStart) {
        recentRegistrations.push({
          id: item.id,
          registrationId: item.registrationId,
          name: item.name,
          programName: item.programName,
          type: item.type,
          status: item.status,
          createdTime: item.createdTime
        })
      }
    })

    // 计算各种统计指标
    const totalRegistrations = registrations.items.length
    const todayRegistrations = recentRegistrations.length
    const pendingReview = statusCounts['待审核'] || 0
    const approved = (statusCounts['一审通过'] || 0) + 
                    (statusCounts['二审通过'] || 0) + 
                    (statusCounts['终审通过'] || 0)
    const rejected = statusCounts['初审驳回'] || 0

    // 获取新闻统计
    let newsStats = null
    try {
      const newsCache = newsService.getCacheStatus()
      newsStats = {
        total: newsCache.itemCount,
        lastUpdate: newsCache.lastFetch,
        cacheAge: newsCache.cacheAge
      }
    } catch (error) {
      console.error('获取新闻统计失败:', error)
    }

    // 热门节目类型 (取前5)
    const popularTypes = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }))

    // 状态分布
    const statusDistribution = Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)

    // 最近7天的报名趋势
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dateEnd = new Date(dateStart)
      dateEnd.setDate(dateEnd.getDate() + 1)
      
      const dayRegistrations = registrations.items.filter(item => {
        const createDate = new Date(item.createdTime)
        return createDate >= dateStart && createDate < dateEnd
      }).length
      
      last7Days.push({
        date: dateStart.toISOString().split('T')[0],
        count: dayRegistrations
      })
    }

    const dashboardData = {
      overview: {
        totalRegistrations,
        todayRegistrations,
        pendingReview,
        approved,
        rejected,
        approvalRate: totalRegistrations > 0 ? Math.round((approved / totalRegistrations) * 100) : 0
      },
      statusDistribution,
      popularTypes,
      recentRegistrations: recentRegistrations.slice(0, 10), // 最近10条
      registrationTrend: last7Days,
      news: newsStats,
      systemInfo: {
        lastUpdate: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    }

    res.json({
      message: '获取成功',
      data: dashboardData
    })
  } catch (error) {
    console.error('获取仪表板数据失败:', error)
    res.status(500).json({ 
      message: '获取统计数据失败' 
    })
  }
})

// 获取报名统计 (需要管理员权限)
router.get('/registrations', authenticateToken, requirePermission('stats.view'), async (req, res) => {
  try {
    const { period = '7d' } = req.query
    
    // 根据period计算时间范围
    const now = new Date()
    let startDate
    
    switch (period) {
      case '1d':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case '7d':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 7)
        break
      case '30d':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 30)
        break
      case '1y':
        startDate = new Date(now)
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
      default:
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 7)
    }

    const registrations = await feishuService.getAllRegistrations({ pageSize: 1000 })
    
    // 过滤指定时间范围内的数据
    const filteredRegistrations = registrations.items.filter(item => {
      const createDate = new Date(item.createdTime)
      return createDate >= startDate
    })

    // 按日期分组统计
    const dailyStats = {}
    filteredRegistrations.forEach(item => {
      const date = new Date(item.createdTime).toISOString().split('T')[0]
      if (!dailyStats[date]) {
        dailyStats[date] = { total: 0, byType: {}, byStatus: {} }
      }
      dailyStats[date].total++
      
      const type = item.type || '未知'
      dailyStats[date].byType[type] = (dailyStats[date].byType[type] || 0) + 1
      
      const status = item.status || '未知'
      dailyStats[date].byStatus[status] = (dailyStats[date].byStatus[status] || 0) + 1
    })

    res.json({
      message: '获取成功',
      data: {
        period,
        total: filteredRegistrations.length,
        dailyStats,
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      }
    })
  } catch (error) {
    console.error('获取报名统计失败:', error)
    res.status(500).json({ 
      message: '获取报名统计失败' 
    })
  }
})

// 获取公开统计数据 (无需认证，用于主页展示)
router.get('/public', async (req, res) => {
  try {
    // 获取所有报名记录
    const registrations = await feishuService.getAllRegistrations({ pageSize: 1000 })
    
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    // 统计今日报名数量
    const todayRegistrations = registrations.items.filter(item => {
      const createDate = new Date(item.createdTime)
      return createDate >= todayStart
    }).length
    
    // 统计待审核数量
    const pendingReview = registrations.items.filter(item => 
      item.status === '待审核' || item.status === '审核中'
    ).length
    
    // 获取新闻统计
    let newsCount = 0
    try {
      const newsCache = newsService.getCacheStatus()
      newsCount = newsCache.itemCount
    } catch (error) {
      console.error('获取新闻统计失败:', error)
    }
    
    // 系统状态检查
    const systemStatus = {
      status: 'online',
      message: '正常运行'
    }
    
    res.json({
      message: '获取成功',
      data: {
        todayRegistrations,
        pendingReview,
        newsCount,
        systemStatus,
        lastUpdate: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('获取公开统计数据失败:', error)
    res.status(500).json({ 
      message: '获取统计数据失败',
      data: {
        todayRegistrations: 0,
        pendingReview: 0,
        newsCount: 0,
        systemStatus: {
          status: 'error',
          message: '数据获取失败'
        },
        lastUpdate: new Date().toISOString()
      }
    })
  }
})

// 导出报名数据 (需要管理员权限)
router.get('/export/registrations', authenticateToken, requirePermission('registration.export'), async (req, res) => {
  try {
    const { format = 'json' } = req.query
    
    const registrations = await feishuService.getAllRegistrations({ pageSize: 1000 })
    
    if (format === 'csv') {
      // 生成CSV格式
      const csvHeaders = [
        '报名编号', '参演单位', '联系方式', '作品类型', '作品名称', 
        '演职人员', '是否出镜', '状态', '报名时间', '备注'
      ]
      
      const csvRows = registrations.items.map(item => [
        item.registrationId || '',
        item.name || '',
        item.contact || '',
        item.type || '',
        item.programName || '',
        item.performers || '',
        item.onCamera || '',
        item.status || '',
        new Date(item.createdTime).toLocaleString('zh-CN'),
        item.remarks || ''
      ])
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(','))
        .join('\n')
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename=registrations_${new Date().toISOString().split('T')[0]}.csv`)
      res.send('\ufeff' + csvContent) // 添加BOM以支持中文
    } else {
      // JSON格式
      res.json({
        message: '导出成功',
        data: {
          total: registrations.items.length,
          exportTime: new Date().toISOString(),
          items: registrations.items
        }
      })
    }
  } catch (error) {
    console.error('导出数据失败:', error)
    res.status(500).json({ 
      message: '导出数据失败' 
    })
  }
})

module.exports = router
