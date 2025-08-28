const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs').promises
const { authenticateToken, requirePermission } = require('../middleware/auth')

const router = express.Router()

// 配置multer用于图片上传
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/theme')
    try {
      await fs.mkdir(uploadDir, { recursive: true })
      cb(null, uploadDir)
    } catch (error) {
      cb(error)
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `${req.body.type}-${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('只允许上传图片文件'))
    }
  }
})

// 主题设置文件路径
const themeConfigPath = path.join(__dirname, '../data/theme.json')

// 确保数据目录存在
const ensureDataDir = async () => {
  const dataDir = path.dirname(themeConfigPath)
  try {
    await fs.mkdir(dataDir, { recursive: true })
  } catch (error) {
    console.log('数据目录已存在')
  }
}

// 读取主题设置
const readThemeConfig = async () => {
  try {
    const data = await fs.readFile(themeConfigPath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    // 如果文件不存在，返回默认设置
    return {}
  }
}

// 写入主题设置
const writeThemeConfig = async (config) => {
  await ensureDataDir()
  await fs.writeFile(themeConfigPath, JSON.stringify(config, null, 2))
}

// 获取主题设置
router.get('/', async (req, res) => {
  try {
    const config = await readThemeConfig()
    res.json(config)
  } catch (error) {
    console.error('获取主题设置失败:', error)
    res.status(500).json({ error: '获取主题设置失败' })
  }
})

// 保存主题设置
router.post('/', authenticateToken, requirePermission('theme.manage'), async (req, res) => {
  try {
    const config = req.body
    
    // 验证配置数据
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: '无效的配置数据' })
    }

    await writeThemeConfig(config)
    res.json({ message: '主题设置保存成功', config })
  } catch (error) {
    console.error('保存主题设置失败:', error)
    res.status(500).json({ error: '保存主题设置失败' })
  }
})

// 上传主题图片
router.post('/upload-theme-image', authenticateToken, requirePermission('theme.manage'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' })
    }

    const { type } = req.body
    if (!['background', 'logo'].includes(type)) {
      return res.status(400).json({ error: '无效的图片类型' })
    }

    // 构建图片URL
    const imageUrl = `/uploads/theme/${req.file.filename}`
    
    // 更新主题配置
    const config = await readThemeConfig()
    if (type === 'background') {
      config.backgroundImage = imageUrl
    } else if (type === 'logo') {
      config.logoUrl = imageUrl
    }
    
    await writeThemeConfig(config)

    res.json({ 
      message: '图片上传成功',
      imageUrl,
      type
    })
  } catch (error) {
    console.error('图片上传失败:', error)
    res.status(500).json({ error: '图片上传失败' })
  }
})

// 删除主题图片
router.delete('/image/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params
    if (!['background', 'logo'].includes(type)) {
      return res.status(400).json({ error: '无效的图片类型' })
    }

    const config = await readThemeConfig()
    
    // 获取当前图片路径
    let currentImagePath = null
    if (type === 'background' && config.backgroundImage) {
      currentImagePath = path.join(__dirname, '../uploads/theme', path.basename(config.backgroundImage))
      config.backgroundImage = null
    } else if (type === 'logo' && config.logoUrl) {
      currentImagePath = path.join(__dirname, '../uploads/theme', path.basename(config.logoUrl))
      config.logoUrl = null
    }

    // 删除物理文件
    if (currentImagePath) {
      try {
        await fs.unlink(currentImagePath)
      } catch (error) {
        console.log('文件已不存在或删除失败')
      }
    }

    await writeThemeConfig(config)

    res.json({ message: '图片删除成功' })
  } catch (error) {
    console.error('删除图片失败:', error)
    res.status(500).json({ error: '删除图片失败' })
  }
})

// 重置主题为默认设置
router.post('/reset', authenticateToken, requirePermission('theme.manage'), async (req, res) => {
  try {
    await writeThemeConfig({})
    res.json({ message: '主题已重置为默认设置' })
  } catch (error) {
    console.error('重置主题失败:', error)
    res.status(500).json({ error: '重置主题失败' })
  }
})

module.exports = router
