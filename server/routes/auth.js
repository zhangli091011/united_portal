const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const axios = require('axios')
const config = require('../config')
const { loginValidation } = require('../middleware/validation')
const { authenticateToken } = require('../middleware/auth')
const { logLogin } = require('../middleware/logging')
const feishuService = require('../services/feishuService')
const database = require('../services/database')

const router = express.Router()

// 用户名密码登录（支持数据库用户）
router.post('/login', loginValidation, async (req, res) => {
  try {
    const { employeeCode, username, password, type } = req.body

    if (type === 'employee') {
      // 兼容原有的员工编码登录
      if (employeeCode !== config.admin.employeeCode) {
        await logLogin('failed', '员工编码错误')(req, res)
        return res.status(401).json({ message: '员工编码错误' })
      }

      const isPasswordValid = await bcrypt.compare(password, config.admin.passwordHash)
      if (!isPasswordValid) {
        await logLogin('failed', '密码错误')(req, res)
        return res.status(401).json({ message: '密码错误' })
      }

      const user = {
        id: 'admin',
        employeeCode,
        name: '管理员',
        username: employeeCode,
        role: 'admin',
        loginType: 'employee'
      }
      
      req.user = user // 设置用户信息用于日志记录

      const token = jwt.sign(user, config.jwtSecret, { expiresIn: '7d' })

      // 记录成功登录
      await logLogin('success')(req, res)

      res.json({
        message: '登录成功',
        data: {
          user,
          token
        }
      })
    } else if (type === 'username') {
      // 数据库用户登录
      try {
        const user = await database.getUserByUsername(username)
        if (!user) {
          await logLogin('failed', '用户名不存在')(req, res)
          return res.status(401).json({ message: '用户名或密码错误' })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash)
        if (!isPasswordValid) {
          await logLogin('failed', '密码错误')(req, res)
          return res.status(401).json({ message: '用户名或密码错误' })
        }

        // 更新最后登录时间
        try {
          await database.updateLastLogin(user.id)
        } catch (updateError) {
          console.error('更新登录时间失败:', updateError)
          // 不影响登录流程，继续执行
        }

        const userInfo = {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.username,
          role: user.role,
          permissions: user.permissions,
          loginType: 'username'
        }
        
        req.user = userInfo // 设置用户信息用于日志记录

        const token = jwt.sign(userInfo, config.jwtSecret, { expiresIn: '7d' })

        // 记录成功登录
        await logLogin('success')(req, res)

        res.json({
          message: '登录成功',
          data: {
            user: userInfo,
            token
          }
        })
      } catch (dbError) {
        console.error('数据库用户登录失败:', dbError)
        return res.status(500).json({ message: '数据库连接失败，请稍后重试' })
      }
    } else {
      return res.status(400).json({ message: '不支持的登录类型' })
    }
  } catch (error) {
    console.error('登录失败:', error)
    res.status(500).json({ message: '登录失败，请重试' })
  }
})

// 飞书Auth登录
router.post('/feishu', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      await logLogin('failed', '授权码为空')(req, res)
      return res.status(400).json({ message: '授权码不能为空' })
    }

    // 获取飞书访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/authen/v1/access_token', {
      grant_type: 'authorization_code',
      client_id: config.feishu.appId,
      client_secret: config.feishu.appSecret,
      code,
      redirect_uri: `${config.clientUrl}/admin/login`
    })

    const { access_token } = tokenResponse.data.data

    // 获取用户信息
    const userInfo = await feishuService.getUserInfo(access_token)

    const user = {
      id: userInfo.user_id,
      name: userInfo.name,
      username: userInfo.name || userInfo.email,
      email: userInfo.email,
      avatar: userInfo.avatar_url,
      role: 'admin',
      loginType: 'feishu'
    }
    
    req.user = user // 设置用户信息用于日志记录
    req.body.type = 'feishu' // 设置登录类型

    const token = jwt.sign(user, config.jwtSecret, { expiresIn: '7d' })

    // 记录成功登录
    await logLogin('success')(req, res)

    res.json({
      message: '登录成功',
      data: {
        user,
        token
      }
    })
  } catch (error) {
    console.error('飞书登录失败:', error)
    await logLogin('failed', `飞书登录异常: ${error.message}`)(req, res)
    res.status(500).json({ message: '飞书登录失败，请重试' })
  }
})

// 验证token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    message: '令牌有效',
    data: req.user
  })
})

// 登出（客户端处理，这里仅做记录）
router.post('/logout', authenticateToken, (req, res) => {
  // 实际的登出逻辑在客户端完成（删除token）
  res.json({ message: '登出成功' })
})

// 获取飞书授权URL
router.get('/feishu/auth-url', (req, res) => {
  const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?` +
    `app_id=${config.feishu.appId}&` +
    `redirect_uri=${encodeURIComponent(config.clientUrl + '/admin/login')}&` +
    `response_type=code&` +
    `state=united_portal`

  res.json({
    data: {
      authUrl
    }
  })
})

module.exports = router
