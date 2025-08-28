// 配置文件示例 - 请复制为 config.js 并填入真实配置
module.exports = {
  // 服务器配置
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT 密钥
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_here',

  // 飞书配置
  feishu: {
    appId: process.env.FEISHU_APP_ID || 'your_feishu_app_id',
    appSecret: process.env.FEISHU_APP_SECRET || 'your_feishu_app_secret',
    bitableAppToken: process.env.FEISHU_BITABLE_APP_TOKEN || 'your_bitable_app_token',
    tableId: process.env.FEISHU_TABLE_ID || 'your_table_id'
  },

  // QQ邮箱配置
  email: {
    host: process.env.SMTP_HOST || 'smtp.qq.com',
    port: process.env.SMTP_PORT || 587,
    user: process.env.SMTP_USER || 'your_qq_email@qq.com',
    pass: process.env.SMTP_PASS || 'your_qq_auth_code'
  },

  // 管理员配置
  admin: {
    employeeCode: process.env.ADMIN_EMPLOYEE_CODE || 'admin123',
    passwordHash: process.env.ADMIN_PASSWORD_HASH || '$2a$10$example_hash'
  },

  // RSS源配置
  rss: {
    feedUrl: process.env.RSS_FEED_URL || 'https://your-blog.com/rss'
  },

  // 前端URL (CORS配置)
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
};
