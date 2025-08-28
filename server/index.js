const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const config = require('./config')
const authRoutes = require('./routes/auth')
const registrationRoutes = require('./routes/registrations')
const newsRoutes = require('./routes/news')
const statsRoutes = require('./routes/stats')
const settingsRoutes = require('./routes/settings')
const themeRoutes = require('./routes/theme')
const fieldRoutes = require('./routes/fields')
const emailRoutes = require('./routes/emails')
const testRoutes = require('./routes/test')
const userRoutes = require('./routes/users')
const logRoutes = require('./routes/logs')
const haloRoutes = require('./routes/halo')
const healthRoutes = require('./routes/health')

// 导入数据库和初始化脚本
const database = require('./services/database')
const initSuperAdmin = require('./scripts/init-superadmin')

const app = express()

// 信任代理设置 - 允许从代理服务器获取真实IP
// 在生产环境中，应用通常部署在Nginx等反向代理后面
app.set('trust proxy', true)

// 安全中间件
app.use(helmet())

// CORS配置
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://united.quantumlight.cc',
  'https://www.united.quantumlight.cc'
]

app.use(cors({
  origin: function (origin, callback) {
    // 允许没有origin的请求 (比如移动应用)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.log('CORS blocked origin:', origin)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// 请求日志
app.use(morgan('combined'))

// 限流配置
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 每个IP最多100个请求
  message: {
    error: '请求过于频繁，请稍后再试'
  },
  // 标准化IP地址获取
  standardHeaders: true, // 返回rate limit信息在headers中
  legacyHeaders: false, // 禁用X-RateLimit-*头
  // 自定义key生成器，确保在代理环境下正确识别用户
  keyGenerator: (req) => {
    // 优先使用X-Forwarded-For中的第一个IP（真实客户端IP）
    const forwarded = req.get('X-Forwarded-For')
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    // 回退到连接IP
    return req.ip || req.connection.remoteAddress || 'unknown'
  }
})

// 应用限流到API路由
app.use('/api/', limiter)

// 解析请求体
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// 静态文件服务 - 主题上传的图片
app.use('/uploads', express.static('uploads'))

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  })
})

// API路由
app.use('/api/auth', authRoutes)
app.use('/api/registrations', registrationRoutes)
app.use('/api/news', newsRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/theme', themeRoutes)
app.use('/api/fields', fieldRoutes)
app.use('/api/emails', emailRoutes)
app.use('/api/test', testRoutes)
app.use('/api/users', userRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/halo', haloRoutes)
app.use('/api/health', healthRoutes)

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ message: '接口不存在' })
})

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err)
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: '请求数据格式错误' })
  }
  
  res.status(err.status || 500).json({
    message: err.message || '服务器内部错误',
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  })
})

const PORT = config.port

app.listen(PORT, async () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`)
  console.log(`🌍 环境: ${config.nodeEnv}`)
  console.log(`📱 前端地址: ${config.clientUrl}`)
  
  // 初始化超级管理员
  try {
    // 等待数据库初始化完成
    setTimeout(async () => {
      try {
        await initSuperAdmin()
      } catch (error) {
        console.error('初始化超级管理员失败:', error)
        console.log('💡 提示：如果是首次部署，请确保已安装 sqlite3: npm install sqlite3')
      }
    }, 2000)
  } catch (error) {
    console.error('权限系统初始化失败:', error)
  }
})
