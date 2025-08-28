# 中春晚 United Portal · 团队内网一站式平台

一个基于 React + Node.js 构建的现代化团队门户系统，支持节目报名、状态查询、后台管理、新闻中心等功能。

## ✨ 功能特性

### 🎭 报名系统
- **无需登录报名** - 用户可直接填写信息提交报名
- **自动编号生成** - 系统自动生成格式化的报名编号
- **邮件通知** - 自动发送确认邮件到QQ邮箱
- **飞书存储** - 数据同步存储到飞书多维表格
- **状态查询** - 通过编号查询报名审核状态

### 🔐 后台管理
- **双重登录** - 支持员工编码和飞书 Auth 两种登录方式
- **报名审核** - 查看、审核、修改、删除报名记录
- **数据统计** - 实时统计报名数据和审核状态
- **数据导出** - 支持 CSV 格式导出报名数据

### 📰 新闻中心
- **RSS 集成** - 自动获取 Hola 博客文章
- **卡片展示** - 美观的卡片化新闻展示
- **搜索过滤** - 支持关键词搜索和分类筛选

### 🎨 UI/UX 设计
- **黑橙科技感** - 独特的霓虹橙配色方案
- **响应式设计** - 完美适配桌面端和移动端
- **卡片化交互** - 现代化的用户界面设计
- **流畅动画** - 优雅的交互动画效果

## 🛠 技术栈

### 前端
- **React 18** - 现代化 React 框架
- **Vite** - 快速构建工具
- **TailwindCSS** - 原子化 CSS 框架
- **React Router** - 客户端路由
- **React Query** - 数据状态管理
- **React Hook Form** - 表单处理
- **Lucide React** - 现代图标库

### 后端
- **Node.js** - JavaScript 运行时
- **Express** - Web 应用框架
- **JWT** - 身份认证
- **Nodemailer** - 邮件服务
- **RSS Parser** - RSS 解析
- **Axios** - HTTP 客户端

### 集成服务
- **飞书 API** - 多维表格存储和身份认证
- **QQ 邮箱 SMTP** - 邮件通知服务
- **RSS 源** - 新闻内容获取

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖
```bash
# 安装所有依赖
npm run install:all

# 或分别安装
npm install
cd server && npm install
cd ../client && npm install
```

### 配置环境
1. 复制 `server/config.example.js` 为 `server/config.js`
2. 填入相应的配置信息：

```javascript
module.exports = {
  // 飞书配置
  feishu: {
    appId: 'your_feishu_app_id',
    appSecret: 'your_feishu_app_secret',
    bitableAppToken: 'your_bitable_app_token',
    tableId: 'your_table_id'
  },

  // QQ邮箱配置
  email: {
    host: 'smtp.qq.com',
    port: 587,
    user: 'your_qq_email@qq.com',
    pass: 'your_qq_auth_code'
  },

  // 管理员配置
  admin: {
    employeeCode: 'admin123',
    passwordHash: '$2a$10$...' // 使用 bcrypt 加密的密码
  },

  // RSS源配置
  rss: {
    feedUrl: 'https://your-blog.com/rss'
  }
}
```

### 启动开发服务
```bash
# 同时启动前端和后端
npm run dev

# 或分别启动
npm run server:dev  # 后端服务 (端口 3001)
npm run client:dev  # 前端服务 (端口 5173)
```

### 生产环境部署
```bash
# 构建前端
npm run build

# 启动生产服务
npm start
```

## 📁 项目结构

```
united-portal/
├── client/                 # 前端应用
│   ├── src/
│   │   ├── components/     # React 组件
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API 服务
│   │   ├── contexts/      # React Context
│   │   └── ...
│   ├── public/
│   └── package.json
├── server/                 # 后端应用
│   ├── routes/            # API 路由
│   ├── services/          # 业务服务
│   ├── middleware/        # 中间件
│   └── package.json
├── package.json           # 根配置
└── README.md
```

## 🔧 配置说明

### 飞书多维表格配置
1. 创建飞书应用并获取 App ID 和 App Secret
2. 创建多维表格并获取 App Token 和 Table ID
3. 确保表格字段与系统字段匹配：
   - 参演单位 (Text)
   - 作品类型 (SingleSelect)
   - 作品名称 (Text)
   - 演职人员 (Text)
   - 参演单位负责人联系方式 (Number)
   - 作品状态 (MultiSelect)
   - 编号 (AutoNumber)
   - 日期 (DateTime)

### QQ邮箱SMTP配置
1. 开启QQ邮箱SMTP服务
2. 获取授权码（非登录密码）
3. 配置SMTP服务器信息

### 管理员账号配置
```bash
# 生成密码哈希
node -e "console.log(require('bcryptjs').hashSync('your_password', 10))"
```

## 🎯 使用指南

### 用户端操作
1. **报名流程**
   - 访问首页点击"报名"卡片
   - 填写参演单位、联系方式、节目信息等
   - 提交后获得报名编号
   - 确认邮件发送到QQ邮箱

2. **状态查询**
   - 点击"申请状态查询"卡片
   - 输入报名编号查询状态
   - 查看审核进度和备注信息

### 管理员操作
1. **登录后台**
   - 员工编码登录或飞书授权登录
   - 进入管理员后台界面

2. **报名管理**
   - 查看所有报名记录
   - 审核通过/驳回操作
   - 编辑报名信息
   - 导出数据

3. **数据统计**
   - 查看报名趋势图表
   - 统计审核状态分布
   - 监控系统运行状态

## 🔍 API 接口

### 报名相关
- `POST /api/registrations` - 提交报名
- `GET /api/registrations/:id` - 查询报名
- `GET /api/registrations` - 获取报名列表 (需认证)
- `PUT /api/registrations/:id` - 更新报名 (需认证)
- `DELETE /api/registrations/:id` - 删除报名 (需认证)

### 认证相关
- `POST /api/auth/login` - 管理员登录
- `POST /api/auth/feishu` - 飞书授权登录
- `GET /api/auth/verify` - 验证token

### 新闻相关
- `GET /api/news` - 获取新闻列表
- `GET /api/news/:id` - 获取新闻详情
- `POST /api/news/refresh` - 刷新新闻 (需认证)

### 统计相关
- `GET /api/stats/dashboard` - 获取仪表板数据 (需认证)
- `GET /api/stats/export/registrations` - 导出报名数据 (需认证)

## 🛡️ 安全特性

- JWT Token 认证
- 请求频率限制
- 输入数据验证
- XSS 防护
- CSRF 防护
- HTTPS 支持（生产环境）

## 🎨 设计理念

项目采用"黑橙科技感"的设计风格，灵感来源于赛博朋克美学：

- **主色调**: 霓虹橙 (#FF6B35) + 深黑 (#0A0A0A)
- **辅助色**: 霓虹蓝 (#00BFFF)、霓虹绿 (#00FF7F)
- **交互**: 卡片悬浮效果、霓虹光晕、流畅动画
- **布局**: 卡片化设计、响应式网格、移动端优化

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👨‍💻 开发团队

AdventureX Team - 让创作更简单

## 🆘 问题反馈

如果您在使用过程中遇到问题，请通过以下方式联系我们：

- 提交 GitHub Issue
- 发送邮件到 team@adventurex.com
- 联系项目维护者

---

**联合门户 · AdventureX** - 团队内网一站式平台