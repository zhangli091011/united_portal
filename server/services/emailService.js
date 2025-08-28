const nodemailer = require('nodemailer')
const config = require('../config')
const emailPoolService = require('./emailPoolService')

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: false, // QQ邮箱使用STARTTLS
      auth: {
        user: config.email.user,
        pass: config.email.pass
      },
      tls: {
        rejectUnauthorized: false
      },
      // 设置默认的邮件选项，优先使用HTML
      defaults: {
        from: {
          name: '中春晚 United Portal',
          address: config.email.user
        }
      }
    })
  }

  // 验证邮件配置
  async verifyConnection() {
    try {
      await this.transporter.verify()
      console.log('📧 邮件服务连接成功')
      return true
    } catch (error) {
      console.error('📧 邮件服务连接失败:', error.message)
      return false
    }
  }

  // 检查邮件配置是否完整
  async isConfigured() {
    const config = require('../config')
    
    try {
      // 优先检查邮箱池，如果有可用邮箱则认为已配置
      await emailPoolService.ensureInitialized()
      const poolStats = await emailPoolService.getPoolStats()
      if (poolStats.activeEmails > 0) {
        return true
      }
    } catch (error) {
      console.warn('📧 检查邮箱池状态失败:', error.message)
    }
    
    // 否则检查传统配置
    return !!(config.email.user && config.email.pass && config.email.host)
  }

  // 使用邮箱池发送邮件（带重试机制）
  async sendEmailWithPool(mailOptions) {
    try {
      // 首先尝试使用邮箱池
      await emailPoolService.ensureInitialized()
      const poolStats = await emailPoolService.getPoolStats()
      
      console.log('📧 邮箱池状态:', poolStats)
      
      if (poolStats.activeEmails > 0) {
        console.log('📧 使用邮箱池发送邮件...')
        try {
          return await emailPoolService.sendEmailWithRetry(mailOptions)
        } catch (poolError) {
          console.error('📧 邮箱池发送失败:', poolError.message)
          
          // 如果邮箱池中包含配额错误，尝试传统方式
          if (poolError.message.includes('quota') || poolError.message.includes('配额')) {
            console.log('⚠️  邮箱池配额超限，尝试传统配置发送...')
          } else {
            // 对于非配额错误，直接抛出
            throw poolError
          }
        }
      }
      
      // 如果邮箱池不可用或配额超限，回退到传统方式
      console.log('📧 邮箱池不可用或配额超限，使用传统方式发送邮件...')
      if (!(await this.isConfigured())) {
        throw new Error('邮件服务未配置，且邮箱池不可用')
      }
      
      const info = await this.transporter.sendMail(mailOptions)
      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        emailUsed: '传统配置',
        attempt: 1
      }
    } catch (error) {
      console.error('📧 邮件发送完全失败:', error.message)
      
      // 如果是配额相关错误，提供更友好的错误信息
      if (error.message.includes('quota') || error.message.includes('limit') || 
          error.message.includes('exceed') || error.message.includes('配额')) {
        throw new Error(`邮件发送失败：发送配额已超限。${error.message}`)
      }
      
      throw error
    }
  }

  // 发送测试邮件（用于验证HTML显示）
  async sendTestEmail(recipientEmail) {
    const testRegistration = {
      registrationId: 'TEST26ZCW20250101001',
      name: '测试参演单位',
      programName: '测试节目名称',
      type: '测试类型',
      performers: '测试演员1, 测试演员2',
      createdTime: new Date().toISOString(),
      contact: recipientEmail.replace('@qq.com', '')
    }

    const subject = `【测试邮件】HTML邮件格式测试`
    const htmlContent = this.generateRegistrationEmailHTML(testRegistration)

    const mailOptions = {
      from: {
        name: '中春晚 United Portal',
        address: config.email.user
      },
      to: recipientEmail,
      subject,
      html: htmlContent,
      priority: 'high',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'MIME-Version': '1.0',
        'Content-Type': 'text/html; charset=UTF-8',
        'Content-Transfer-Encoding': '8bit'
      }
    }

    try {
      const info = await this.transporter.sendMail(mailOptions)
      console.log(`📧 测试邮件已发送: ${recipientEmail}`)
      return {
        success: true,
        messageId: info.messageId,
        recipient: recipientEmail
      }
    } catch (error) {
      console.error('📧 发送测试邮件失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 发送报名确认邮件
  async sendRegistrationConfirmation(registration, bccEmail = '') {
    const { contact, name, programName, registrationId } = registration

    // QQ号转换为QQ邮箱
    const recipientEmail = `${contact}@qq.com`

    const subject = `【${registrationId}】恭喜，初选报名成功！`
    
    const htmlContent = this.generateRegistrationEmailHTML(registration)

    const mailOptions = {
      from: {
        name: '中春晚 United Portal',
        address: config.email.user
      },
      to: recipientEmail,
      subject,
      html: htmlContent,
      priority: 'high',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'MIME-Version': '1.0',
        'Content-Type': 'text/html; charset=UTF-8'
      }
    }

    // 添加BCC邮箱
    if (bccEmail && bccEmail.trim()) {
      mailOptions.bcc = bccEmail.trim()
    }

    try {
      const result = await this.sendEmailWithPool(mailOptions)
      console.log(`📧 报名确认邮件已发送: ${recipientEmail} (使用: ${result.emailUsed})`)
      return {
        success: true,
        messageId: result.messageId,
        recipient: recipientEmail,
        emailUsed: result.emailUsed,
        attempt: result.attempt
      }
    } catch (error) {
      console.error('📧 发送报名确认邮件失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 发送状态更新邮件
  async sendStatusUpdate(registration, newStatus, adminNote = '', bccEmail = '') {
    console.log('📧 开始发送状态更新邮件:', {
      registrationId: registration.registrationId,
      contact: registration.contact,
      newStatus,
      adminNote
    })

    const { contact, name, programName, registrationId } = registration
    const recipientEmail = `${contact}@qq.com`

    const subject = `🎭 中春晚 United Portal - 报名状态更新 [${registrationId}]`
    
    const htmlContent = this.generateStatusUpdateEmailHTML(registration, newStatus, adminNote)

    const mailOptions = {
      from: {
        name: '中春晚 United Portal',
        address: config.email.user
      },
      to: recipientEmail,
      subject,
      html: htmlContent,
      priority: 'high',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'MIME-Version': '1.0',
        'Content-Type': 'text/html; charset=UTF-8'
      }
    }

    // 添加BCC邮箱
    if (bccEmail && bccEmail.trim()) {
      mailOptions.bcc = bccEmail.trim()
    }

    try {
      const result = await this.sendEmailWithPool(mailOptions)
      console.log(`📧 状态更新邮件已发送: ${recipientEmail} (使用: ${result.emailUsed})`)
      return {
        success: true,
        messageId: result.messageId,
        recipient: recipientEmail,
        emailUsed: result.emailUsed,
        attempt: result.attempt
      }
    } catch (error) {
      console.error('📧 发送状态更新邮件失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 生成报名确认邮件HTML
  generateRegistrationEmailHTML(registration) {
    const { registrationId, name, programName, type, performers, createdTime, contact } = registration
    const recipientEmail = `${contact}@qq.com`
    const currentTime = new Date().toLocaleString('zh-CN')
    const submitDate = new Date(createdTime).toLocaleDateString('zh-CN')
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>节目报名确认通知</title>
    <style>
        /* 全局样式 */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'DingTalk JinBuTi', 'Source Han Serif CN', 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #F9FAFB;
            min-height: 100vh;
            padding: 32px 16px;
        }

        /* 主容器 */
        .main-container {
            max-width: 768px;
            margin: 0 auto;
            background-color: #FFFFFF;
            border-radius: 8px;
            box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
            overflow: hidden;
        }

        /* 邮件头部 */
        .email-header {
            padding: 24px;
            border-bottom: 1px dashed #E5E7EB;
        }

        .header-content {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
        }

        .mail-icon {
            width: 40px;
            height: 40px;
            background-color: #2563EB;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .mail-icon svg {
            width: 20px;
            height: 20px;
            fill: #FFFFFF;
        }

        .header-text h1 {
            font-size: 20px;
            font-weight: 400;
            line-height: 28px;
            color: #000000;
            margin-bottom: 4px;
        }

        .timestamp {
            font-size: 14px;
            line-height: 20px;
            color: #6B7280;
        }

        /* 收件人信息 */
        .recipient-info {
            background-color: #F9FAFB;
            padding: 12px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .recipient-label {
            font-size: 16px;
            line-height: 24px;
            color: #4B5563;
            min-width: 80px;
        }

        .recipient-value {
            font-size: 16px;
            line-height: 24px;
            color: #000000;
        }

        /* 邮件正文 */
        .email-body {
            padding: 24px;
        }

        .greeting {
            font-size: 16px;
            line-height: 24px;
            color: #1F2937;
            margin-bottom: 24px;
        }

        .content-text {
            font-size: 16px;
            line-height: 24px;
            color: #1F2937;
            margin-bottom: 24px;
            text-indent: 2em;
        }

        /* 节目编号卡片 */
        .program-number-card {
            max-width: 298px;
            background: rgba(239, 246, 255, 0.1);
            border: 2px dashed #1D4ED8;
            border-radius: 8px;
            padding: 18px;
            margin-bottom: 24px;
        }

        .program-number-label {
            font-size: 16px;
            line-height: 24px;
            color: #4B5563;
            margin-bottom: 10px;
        }

        .program-number-value {
            font-size: 24px;
            line-height: 32px;
            color: #1D4ED8;
            font-weight: 400;
        }

        /* 节目信息表格 */
        .program-details {
            margin-bottom: 24px;
        }

        .detail-row {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
        }

        .detail-row:last-child {
            margin-bottom: 0;
        }

        .detail-label {
            font-size: 16px;
            line-height: 24px;
            color: #4B5563;
            min-width: 80px;
            margin-right: 16px;
        }

        .detail-value {
            font-size: 16px;
            line-height: 24px;
            color: #000000;
            flex: 1;
        }

        /* 须知信息 */
        .notice-section {
            background-color: #EFF6FF;
            border-radius: 8px;
            padding: 16px;
        }

        .notice-title {
            font-size: 16px;
            line-height: 24px;
            color: #1D4ED8;
            margin-bottom: 16px;
        }

        .notice-list {
            list-style: none;
        }

        .notice-item {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin-bottom: 8px;
        }

        .notice-item:last-child {
            margin-bottom: 0;
        }

        .notice-icon {
            width: 16px;
            height: 16px;
            margin-top: 4px;
            flex-shrink: 0;
        }

        .notice-icon svg {
            width: 16px;
            height: 16px;
            fill: #1D4ED8;
        }

        .notice-text {
            font-size: 16px;
            line-height: 24px;
            color: #374151;
        }

        /* 版权信息 */
        .footer {
            background-color: #F9FAFB;
            padding: 24px 0;
            border-radius: 0 0 8px 8px;
            text-align: center;
        }

        .footer-text {
            font-size: 16px;
            line-height: 24px;
            color: #4B5563;
            margin-bottom: 8px;
        }

        /* 响应式设计 */
        @media (max-width: 768px) {
            body {
                padding: 16px 8px;
            }

            .main-container {
                margin: 0;
            }

            .email-header,
            .email-body {
                padding: 16px;
            }

            .header-content {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }

            .detail-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
            }

            .detail-label {
                min-width: auto;
                margin-right: 0;
            }

            .program-number-card {
                max-width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="main-container">
        <!-- 邮件头部 -->
        <div class="email-header">
            <div class="header-content">
                <div class="mail-icon">
                    <svg viewBox="0 0 20 20">
                        <g transform="translate(0, -2.0703125)">
                            <path d="M1.875 15Q1.09375 14.9609 0.546875 14.4531Q0.0390625 13.9062 0 13.125Q0.0390625 12.1875 0.742188 11.6406L9.25781 5.23438Q10 4.76562 10.7422 5.23438L19.2578 11.6406Q19.9609 12.1875 20 13.125Q19.9609 13.9062 19.4531 14.4531Q18.9062 14.9609 18.125 15L1.875 15ZM0 10.625L0 2.5L0 10.625L0 2.5Q0.0390625 1.44531 0.742188 0.742188Q1.44531 0.0390625 2.5 0L17.5 0Q18.5547 0.0390625 19.2578 0.742188Q19.9609 1.44531 20 2.5L20 10.625L11.4844 4.25781Q10.8203 3.75 10 3.75Q9.17969 3.75 8.51562 4.25781L0 10.625Z"/>
                        </g>
                    </svg>
                </div>
                <div class="header-text">
                    <h1>【${registrationId}】节目信息邮件补充发布</h1>
                    <div class="timestamp">时间戳：${currentTime}</div>
                </div>
            </div>
            
            <div class="recipient-info">
                <span class="recipient-label">收件人：</span>
                <span class="recipient-value">${name}&lt;${recipientEmail}&gt;</span>
            </div>
        </div>

        <!-- 邮件正文 -->
        <div class="email-body">
            <div class="greeting">To ${recipientEmail}：</div>
            
            <div class="content-text">
                你好！感谢报名《2026年中学生春节联欢晚会》！节目组现在为您补发节目信息。望惠存！
            </div>

            <!-- 节目编号 -->
            <div class="program-number-card">
                <div class="program-number-label">节目编号</div>
                <div class="program-number-value">${registrationId}</div>
            </div>

            <!-- 节目详细信息 -->
            <div class="program-details">
                <div class="detail-row">
                    <span class="detail-label">参演单位：</span>
                    <span class="detail-value">${name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">节目名称：</span>
                    <span class="detail-value">${programName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">节目类型：</span>
                    <span class="detail-value">${type}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">演职人员：</span>
                    <span class="detail-value">${performers}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">提交时间：</span>
                    <span class="detail-value">${submitDate}</span>
                </div>
            </div>

            <!-- 须知信息 -->
            <div class="notice-section">
                <div class="notice-title">你需要知道的一些事情：</div>
                <ul class="notice-list">
                    <li class="notice-item">
                        <div class="notice-icon">
                            <svg viewBox="0 0 16 16">
                                <g transform="translate(0, -0.34375)">
                                    <path d="M8 0Q10.1875 0.03125 12 1.0625Q13.8125 2.125 14.9375 4Q16 5.90625 16 8Q16 10.0938 14.9375 12Q13.8125 13.875 12 14.9375Q10.1875 15.9688 8 16Q5.8125 15.9688 4 14.9375Q2.1875 13.875 1.0625 12Q0 10.0938 0 8Q0 5.90625 1.0625 4Q2.1875 2.125 4 1.0625Q5.8125 0.03125 8 0ZM11.5312 9.46875L7.53125 5.46875L11.5312 9.46875L7.53125 5.46875Q7 5.03125 6.46875 5.46875L4.46875 7.46875Q4.03125 8 4.46875 8.53125Q5 8.96875 5.53125 8.53125L7 7.0625L10.4688 10.5312Q11 10.9688 11.5312 10.5312Q11.9688 10 11.5312 9.46875Z"/>
                                </g>
                            </svg>
                        </div>
                        <span class="notice-text">节目编号是您在中春晚一站式工作平台查询作品状态的唯一标识，请妥善保存本邮件。</span>
                    </li>
                    <li class="notice-item">
                        <div class="notice-icon">
                            <svg viewBox="0 0 16 16">
                                <g transform="translate(0, -0.34375)">
                                    <path d="M8 0Q10.1875 0.03125 12 1.0625Q13.8125 2.125 14.9375 4Q16 5.90625 16 8Q16 10.0938 14.9375 12Q13.8125 13.875 12 14.9375Q10.1875 15.9688 8 16Q5.8125 15.9688 4 14.9375Q2.1875 13.875 1.0625 12Q0 10.0938 0 8Q0 5.90625 1.0625 4Q2.1875 2.125 4 1.0625Q5.8125 0.03125 8 0ZM11.5312 9.46875L7.53125 5.46875L11.5312 9.46875L7.53125 5.46875Q7 5.03125 6.46875 5.46875L4.46875 7.46875Q4.03125 8 4.46875 8.53125Q5 8.96875 5.53125 8.53125L7 7.0625L10.4688 10.5312Q11 10.9688 11.5312 10.5312Q11.9688 10 11.5312 9.46875Z"/>
                                </g>
                            </svg>
                        </div>
                        <span class="notice-text">26版中学生春晚交流群群号为：1013231003（仅此群）</span>
                    </li>
                    <li class="notice-item">
                        <div class="notice-icon">
                            <svg viewBox="0 0 16 16">
                                <g transform="translate(0, -0.34375)">
                                    <path d="M8 0Q10.1875 0.03125 12 1.0625Q13.8125 2.125 14.9375 4Q16 5.90625 16 8Q16 10.0938 14.9375 12Q13.8125 13.875 12 14.9375Q10.1875 15.9688 8 16Q5.8125 15.9688 4 14.9375Q2.1875 13.875 1.0625 12Q0 10.0938 0 8Q0 5.90625 1.0625 4Q2.1875 2.125 4 1.0625Q5.8125 0.03125 8 0ZM11.5312 9.46875L7.53125 5.46875L11.5312 9.46875L7.53125 5.46875Q7 5.03125 6.46875 5.46875L4.46875 7.46875Q4.03125 8 4.46875 8.53125Q5 8.96875 5.53125 8.53125L7 7.0625L10.4688 10.5312Q11 10.9688 11.5312 10.5312Q11.9688 10 11.5312 9.46875Z"/>
                                </g>
                            </svg>
                        </div>
                        <span class="notice-text">节目系非盈利性质，不收取任何费用。更多信息，请访问：youthgala.quantumlight.cc</span>
                    </li>
                </ul>
            </div>
        </div>

        <!-- 版权信息 -->
        <div class="footer">
            <div class="footer-text">© QuantumLight量子光隅团队 2024-2025 All Rights Reserved.</div>
            <div class="footer-text">AstraCore量子星辰 提供技术支持</div>
        </div>
    </div>
</body>
</html>`
  }

  // 生成报名确认邮件纯文本版本
  generateRegistrationEmailText(registration) {
    const { registrationId, name, programName, type, performers, createdTime, contact } = registration
    const recipientEmail = `${contact}@qq.com`
    
    return `
🎭 中春晚 United Portal - 报名确认通知

亲爱的 ${name}，

恭喜您！您已成功提交《2026年中学生春节联欢晚会》的节目报名。

节目信息：
报名编号: ${registrationId}
参演单位: ${name}
节目名称: ${programName}
节目类型: ${type}
演职人员: ${performers}
提交时间: ${new Date(createdTime).toLocaleString('zh-CN')}

重要提醒：
• 节目编号是您在中春晚一站式工作平台查询作品状态的唯一标识，请妥善保存本邮件。
• 26版中学生春晚交流群群号为：1013231003（仅此群）
• 节目系非盈利性质，不收取任何费用。更多信息，请访问：youthgala.quantumlight.cc

查询地址: ${config.clientUrl}/query

此邮件由系统自动发送，请勿回复。
如有疑问，请联系管理员。

© QuantumLight量子光隅团队 2024-2025 All Rights Reserved.
AstraCore量子星辰 提供技术支持
`
  }

  // 生成状态更新邮件HTML
  generateStatusUpdateEmailHTML(registration, newStatus, adminNote) {
    const { registrationId, name, programName } = registration
    
    const statusColors = {
      '一审通过': '#10B981',
      '二审通过': '#059669',
      '终审通过': '#047857',
      '初审驳回': '#EF4444',
      '二审驳回': '#DC2626',
      '终审驳回': '#B91C1C'
    }
    
    const statusColor = statusColors[newStatus] || '#6B7280'
    const currentTime = new Date().toLocaleString('zh-CN')
    
    return `

        .email-container {
            width: 100%;
            max-width: 768px;
            background: linear-gradient(rgba(0, 0, 0, 0.001), var(--color-white));
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-card);
            overflow: hidden;
        }

        /* 邮件头部 */
        .email-header {
            padding: var(--spacing-lg);
            border-bottom: 1px dashed var(--color-border);
            background: var(--color-white);
        }

        .header-content {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            margin-bottom: var(--spacing-lg);
        }

        .email-icon {
            width: 40px;
            height: 40px;
            background: var(--color-primary);
            border-radius: var(--border-radius);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            
        }

        .email-icon svg {
            width: 20px;
            height: 20px;
            fill: var(--color-white);
            transform: rotate(180deg);
        }

        .header-text h1 {
            font-size: var(--font-size-h1);
            line-height: var(--line-height-h1);
            color: var(--color-black);
            margin-bottom: 4px;
            font-weight: normal;
        }

        .header-text .timestamp {
            font-size: var(--font-size-small);
            line-height: var(--line-height-small);
            color: var(--color-text-secondary);
        }

        .recipient-info {
            background: var(--color-background);
            padding: var(--spacing-sm);
            border-radius: var(--border-radius);
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
        }

        .recipient-info .label {
            font-size: var(--font-size-body);
            line-height: var(--line-height-body);
            color: var(--color-text-dark);
        }

        .recipient-info .value {
            font-size: var(--font-size-body);
            line-height: var(--line-height-body);
            color: var(--color-black);
        }

        /* 邮件正文 */
        .email-body {
            padding: var(--spacing-lg);
            background: var(--color-white);
        }

        .greeting {
            font-size: var(--font-size-body);
            line-height: var(--line-height-body);
            color: var(--color-text-primary);
            margin-bottom: var(--spacing-lg);
            font-family: var(--font-serif);
        }

        .program-number {
            background: var(--color-blue-light-transparent);
            border: 2px dashed var(--color-primary-dark);
            border-radius: var(--border-radius);
            padding: var(--spacing-md);
            margin-bottom: var(--spacing-lg);
            display: inline-block;
        }

        .program-number .label {
            font-size: var(--font-size-body);
            line-height: var(--line-height-body);
            color: var(--color-text-dark);
            margin-bottom: var(--spacing-xs);
        }

        .program-number .number {
            font-size: var(--font-size-large);
            line-height: var(--line-height-large);
            color: var(--color-primary-dark);
            font-family: var(--font-serif);
            font-weight: bold;
        }

        /* 节目详情 */
        .program-details {
            margin-bottom: var(--spacing-lg);
        }

        .detail-row {
            display: flex;
            margin-bottom: var(--spacing-lg);
        }

        .detail-row .label {
            width: 245px;
            font-size: var(--font-size-body);
            line-height: var(--line-height-body);
            color: var(--color-text-dark);
            flex-shrink: 0;
        }

        .detail-row .value {
            font-size: var(--font-size-body);
            line-height: var(--line-height-body);
            color: var(--color-black);
            font-family: var(--font-serif);
            flex: 1;
        }

        /* 须知事项 */
        .notice-section {
            background: var(--color-blue-light);
            border-radius: var(--border-radius);
            padding: var(--spacing-md);
            margin-bottom: var(--spacing-lg);
        }

        .notice-title {
            font-size: var(--font-size-body);
            line-height: var(--line-height-body);
            color: var(--color-primary-dark);
            margin-bottom: var(--spacing-sm);
        }

        .notice-list {
            list-style: none;
        }

        .notice-item {
            display: flex;
            align-items: flex-start;
            gap: var(--spacing-xs);
            margin-bottom: var(--spacing-xs);
        }

        .notice-item:last-child {
            margin-bottom: 0;
        }

        .check-icon {
            width: 16px;
            height: 16px;
            margin-top: 4px;
            flex-shrink: 0;
        }

        .check-icon svg {
            width: 16px;
            height: 16px;
            fill: var(--color-primary-dark);
            transform: rotate(180deg);
        }

        .notice-text {
            font-size: var(--font-size-body);
            line-height: var(--line-height-body);
            color: var(--color-text-body);
            font-family: var(--font-serif);
        }

        /* 版权信息 */
        .email-footer {
            background: var(--color-background);
            padding: var(--spacing-lg) 0;
            text-align: center;
            border-radius: 0 0 var(--border-radius) var(--border-radius);
        }

        .copyright {
            font-size: var(--font-size-body);
            line-height: var(--line-height-body);
            color: var(--color-text-dark);
            margin-bottom: var(--spacing-xs);
        }

        .tech-support {
            font-size: var(--font-size-body);
            line-height: var(--line-height-body);
            color: var(--color-text-dark);
        }

        /* 响应式设计 */
        @media (max-width: 768px) {
            body {
                padding: var(--spacing-md) var(--spacing-xs);
            }
            
            .email-container {
                max-width: 100%;
            }
            
            .detail-row {
                flex-direction: column;
                gap: 4px;
            }
            
            .detail-row .label {
                width: auto;
                font-weight: 500;
            }
            
            .program-number {
                width: 100%;
            }
            
            .header-content {
                gap: var(--spacing-xs);
            }
            
            .header-text h1 {
                font-size: 18px;
                line-height: 24px;
            }
        }

        @media (max-width: 480px) {
            .email-header,
            .email-body,
            .email-footer {
                padding: var(--spacing-md);
            }
            
            .notice-section {
                padding: var(--spacing-sm);
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- 邮件头部 -->
        <div class="email-header">
            <div class="header-content">
                <div class="email-icon">
                    <svg viewBox="0 0 20 20">
                        <path d="M1.875 15Q1.09375 14.9609 0.546875 14.4531Q0.0390625 13.9062 0 13.125Q0.0390625 12.1875 0.742188 11.6406L9.25781 5.23438Q10 4.76562 10.7422 5.23438L19.2578 11.6406Q19.9609 12.1875 20 13.125Q19.9609 13.9062 19.4531 14.4531Q18.9062 14.9609 18.125 15L1.875 15ZM0 10.625L0 2.5L0 10.625L0 2.5Q0.0390625 1.44531 0.742188 0.742188Q1.44531 0.0390625 2.5 0L17.5 0Q18.5547 0.0390625 19.2578 0.742188Q19.9609 1.44531 20 2.5L20 10.625L11.4844 4.25781Q10.8203 3.75 10 3.75Q9.17969 3.75 8.51562 4.25781L0 10.625Z"/>
                    </svg>
                </div>
                <div class="header-text">
                    <h1>【${registrationId}】恭喜，初选报名成功！</h1>
                    <div class="timestamp">时间戳：${currentTime}</div>
                </div>
            </div>
            
            <div class="recipient-info">
                <span class="label">收件人：</span>
                <span class="value">${name}&lt;${recipientEmail}&gt;</span>
            </div>
        </div>

        <!-- 邮件正文 -->
        <div class="email-body">
            <div class="greeting">
                To ${recipientEmail}： 
            </div>
            
            <div class="greeting">
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;你好！感谢报名《2026年中学生春节联欢晚会》！节目组已收到您的报名信息！ 
            </div>

            <!-- 节目编号 -->
            <div class="program-number">
                <div class="label">节目编号</div>
                <div class="number">${registrationId}</div>
            </div>

            <!-- 节目详情 -->
            <div class="program-details">
                <div class="detail-row">
                    <div class="label">参演单位：</div>
                    <div class="value">${name}</div>
                </div>
                <div class="detail-row">
                    <div class="label">节目名称：</div>
                    <div class="value">${programName}</div>
                </div>
                <div class="detail-row">
                    <div class="label">节目类型：</div>
                    <div class="value">${type}</div>
                </div>
                <div class="detail-row">
                    <div class="label">演职人员：</div>
                    <div class="value">${performers}</div>
                </div>
                <div class="detail-row">
                    <div class="label">提交时间：</div>
                    <div class="value">${new Date(createdTime).toLocaleString('zh-CN')}</div>
                </div>
            </div>

            <!-- 须知事项 -->
            <div class="notice-section">
                <div class="notice-title">你需要知道的一些事情：</div>
                <ul class="notice-list">
                    <li class="notice-item">
                        <div class="check-icon">
                            <svg viewBox="0 0 16 16">
                                <path d="M8 0Q10.1875 0.03125 12 1.0625Q13.8125 2.125 14.9375 4Q16 5.90625 16 8Q16 10.0938 14.9375 12Q13.8125 13.875 12 14.9375Q10.1875 15.9688 8 16Q5.8125 15.9688 4 14.9375Q2.1875 13.875 1.0625 12Q0 10.0938 0 8Q0 5.90625 1.0625 4Q2.1875 2.125 4 1.0625Q5.8125 0.03125 8 0ZM11.5312 9.46875L7.53125 5.46875L11.5312 9.46875L7.53125 5.46875Q7 5.03125 6.46875 5.46875L4.46875 7.46875Q4.03125 8 4.46875 8.53125Q5 8.96875 5.53125 8.53125L7 7.0625L10.4688 10.5312Q11 10.9688 11.5312 10.5312Q11.9688 10 11.5312 9.46875Z"/>
                            </svg>
                        </div>
                        <div class="notice-text">我们的人员会尽快与您取得联系，请及时查看好友申请</div>
                    </li>
                    <li class="notice-item">
                        <div class="check-icon">
                            <svg viewBox="0 0 16 16">
                                <path d="M8 0Q10.1875 0.03125 12 1.0625Q13.8125 2.125 14.9375 4Q16 5.90625 16 8Q16 10.0938 14.9375 12Q13.8125 13.875 12 14.9375Q10.1875 15.9688 8 16Q5.8125 15.9688 4 14.9375Q2.1875 13.875 1.0625 12Q0 10.0938 0 8Q0 5.90625 1.0625 4Q2.1875 2.125 4 1.0625Q5.8125 0.03125 8 0ZM11.5312 9.46875L7.53125 5.46875L11.5312 9.46875L7.53125 5.46875Q7 5.03125 6.46875 5.46875L4.46875 7.46875Q4.03125 8 4.46875 8.53125Q5 8.96875 5.53125 8.53125L7 7.0625L10.4688 10.5312Q11 10.9688 11.5312 10.5312Q11.9688 10 11.5312 9.46875Z"/>
                            </svg>
                        </div>
                        <div class="notice-text">26版中学生春晚交流群群号为：1013231003（仅此群）</div>
                    </li>
                    <li class="notice-item">
                        <div class="check-icon">
                            <svg viewBox="0 0 16 16">
                                <path d="M8 0Q10.1875 0.03125 12 1.0625Q13.8125 2.125 14.9375 4Q16 5.90625 16 8Q16 10.0938 14.9375 12Q13.8125 13.875 12 14.9375Q10.1875 15.9688 8 16Q5.8125 15.9688 4 14.9375Q2.1875 13.875 1.0625 12Q0 10.0938 0 8Q0 5.90625 1.0625 4Q2.1875 2.125 4 1.0625Q5.8125 0.03125 8 0ZM11.5312 9.46875L7.53125 5.46875L11.5312 9.46875L7.53125 5.46875Q7 5.03125 6.46875 5.46875L4.46875 7.46875Q4.03125 8 4.46875 8.53125Q5 8.96875 5.53125 8.53125L7 7.0625L10.4688 10.5312Q11 10.9688 11.5312 10.5312Q11.9688 10 11.5312 9.46875Z"/>
                            </svg>
                        </div>
                        <div class="notice-text">节目系非盈利性质，不收取任何费用。更多信息，请访问：youthgala.quantumlight.cc</div>
                    </li>
                </ul>
            </div>
        </div>

        <!-- 版权信息 -->
        <div class="email-footer">
            <div class="copyright">© QuantumLight量子光隅团队 2024-2025 All Rights Reserved.</div>
            <div class="tech-support">AstraCore量子星辰 提供技术支持</div>
        </div>
    </div>
</body>
</html>`
  }

  // 生成报名确认邮件纯文本版本
  generateRegistrationEmailText(registration) {
    const { registrationId, name, programName, type, performers, createdTime, contact } = registration
    const recipientEmail = `${contact}@qq.com`
    const currentTime = new Date().toLocaleString('zh-CN')
    
    return `
【${registrationId}】恭喜，初选报名成功！
时间戳：${currentTime}

收件人：${name}<${recipientEmail}>

To ${recipientEmail}：

      你好！感谢报名《2026年中学生春节联欢晚会》！节目组已收到您的报名信息！

节目编号：${registrationId}

节目详情：
参演单位：${name}
节目名称：${programName}
节目类型：${type}
演职人员：${performers}
提交时间：${new Date(createdTime).toLocaleString('zh-CN')}

你需要知道的一些事情：
✓ 我们的人员会尽快与您取得联系，请及时查看好友申请
✓ 26版中学生春晚交流群群号为：1013231003（仅此群）
✓ 节目系非盈利性质，不收取任何费用。更多信息，请访问：youthgala.quantumlight.cc

© QuantumLight量子光隅团队 2024-2025 All Rights Reserved.
AstraCore量子星辰 提供技术支持
`
  }

  // 生成状态更新邮件HTML
  generateStatusUpdateEmailHTML(registration, newStatus, adminNote) {
    const { registrationId, name, programName } = registration
    
    const statusColors = {
      '一审通过': '#10B981',
      '二审通过': '#059669',
      '终审通过': '#047857',
      '初审驳回': '#EF4444',
      '拒绝联系': '#DC2626',
      '无法联系': '#991B1B',
      '有待斟酌': '#F59E0B'
    }
    
    const statusColor = statusColors[newStatus] || '#FF6B35'
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>报名状态更新</title>
    <style>
        body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 0; padding: 20px; background: #0A0A0A; color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(26, 26, 26, 0.8) 0%, rgba(42, 42, 42, 0.8) 100%); border-radius: 12px; overflow: hidden; box-shadow: 0 0 20px rgba(255, 107, 53, 0.1); }
        .header { background: linear-gradient(135deg, #FF6B35 0%, #E55A2B 100%); padding: 20px; text-align: center; }
        .header h1 { margin: 0; color: white; font-size: 24px; }
        .content { padding: 30px; }
        .status-update { background: rgba(255, 107, 53, 0.1); border: 1px solid ${statusColor}; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .status-text { color: ${statusColor}; font-size: 20px; font-weight: bold; margin: 10px 0; }
        .info-item { margin: 15px 0; padding: 10px; background: rgba(42, 42, 42, 0.5); border-radius: 6px; }
        .label { color: #FF6B35; font-weight: bold; display: inline-block; width: 100px; }
        .admin-note { background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; }
        .footer { background: #1A1A1A; padding: 20px; text-align: center; border-top: 1px solid #444; }
        .footer p { margin: 5px 0; color: #888; font-size: 14px; }
        .link { color: #FF6B35; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎭 中春晚 United Portal</h1>
            <p style="margin: 5px 0; opacity: 0.9;">报名状态更新</p>
        </div>
        
        <div class="content">
            <p>亲爱的 <strong>${name}</strong>，</p>
            <p>您的节目报名状态已更新：</p>
            
            <div class="status-update">
                <h3>报名编号: ${registrationId}</h3>
                <div class="status-text">${newStatus}</div>
            </div>
            
            <div class="info-item">
                <span class="label">节目名称:</span> ${programName}
            </div>
            <div class="info-item">
                <span class="label">更新时间:</span> ${new Date().toLocaleString('zh-CN')}
            </div>
            
            ${adminNote ? `
            <div class="admin-note">
                <h4 style="margin: 0 0 10px 0; color: #3B82F6;">📝 管理员备注</h4>
                <p style="margin: 0;">${adminNote}</p>
            </div>
            ` : ''}
            
            <p style="text-align: center; margin-top: 30px;">
                <a href="${config.clientUrl}/query" class="link" style="background: #FF6B35; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">查看详细信息</a>
            </p>
        </div>
        
        <div class="footer">
            <p>此邮件由系统自动发送，请勿回复</p>
            <p>如有疑问，请联系管理员</p>
            <p>© 2024 中春晚团队. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`
  }

    // 生成状态更新邮件纯文本版本
generateStatusUpdateEmailText(registration, newStatus, adminNote) {
    const { registrationId, name, programName } = registration
    
    return `
🎭 中春晚 United Portal - 报名状态更新

亲爱的 ${name}，

您的节目报名状态已更新：

报名编号: ${registrationId}
节目名称: ${programName}
新状态: ${newStatus}
更新时间: ${new Date().toLocaleString('zh-CN')}

${adminNote ? `管理员备注: ${adminNote}` : ''}

查询地址: ${config.clientUrl}/query

此邮件由系统自动发送，请勿回复。
如有疑问，请联系管理员。

© 2024 中春晚团队. All rights reserved.
`
  }

  // 批量发送邮件
  async sendBulkEmails(registrations, emailType, customContent = {}, bccEmail = '') {
    if (!Array.isArray(registrations) || registrations.length === 0) {
      return {
        success: false,
        error: '没有要发送的报名记录'
      }
    }

    console.log(`📧 开始批量发送邮件: ${emailType}，共 ${registrations.length} 份`)

    const results = {
      success: 0,
      failed: 0,
      total: registrations.length,
      details: []
    }

    // 限制并发数，避免邮件服务器过载
    const batchSize = 5
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

    for (let i = 0; i < registrations.length; i += batchSize) {
      const batch = registrations.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (registration) => {
        try {
          let result
          
          switch (emailType) {
            case 'status_update':
              result = await this.sendStatusUpdate(
                registration, 
                customContent.newStatus, 
                customContent.adminNote,
                bccEmail
              )
              break
            case 'custom':
              result = await this.sendCustomEmail(registration, customContent, bccEmail)
              break
            case 'reminder':
              result = await this.sendReminderEmail(registration, customContent, bccEmail)
              break
            case 'resend':
              result = await this.sendRegistrationConfirmation(registration, bccEmail)
              break
            default:
              throw new Error(`不支持的邮件类型: ${emailType}`)
          }

          if (result.success) {
            results.success++
            results.details.push({
              registrationId: registration.registrationId,
              email: `${registration.contact}@qq.com`,
              status: 'success',
              messageId: result.messageId
            })
          } else {
            results.failed++
            results.details.push({
              registrationId: registration.registrationId,
              email: `${registration.contact}@qq.com`,
              status: 'failed',
              error: result.error
            })
          }
        } catch (error) {
          results.failed++
          results.details.push({
            registrationId: registration.registrationId,
            email: `${registration.contact}@qq.com`,
            status: 'failed',
            error: error.message
          })
        }
      })

      await Promise.all(batchPromises)
      
      // 批次之间延迟，避免过快发送
      if (i + batchSize < registrations.length) {
        await delay(1000) // 1秒延迟
      }
    }

    console.log(`📧 批量邮件发送完成: 成功 ${results.success}，失败 ${results.failed}`)
    
    return {
      success: true,
      data: results
    }
  }

  // 发送自定义邮件
  async sendCustomEmail(registration, content, bccEmail = '') {
    const { contact, name, registrationId } = registration
    const recipientEmail = `${contact}@qq.com`

    const subject = content.subject || `🎭 中春晚 United Portal - 重要通知 [${registrationId}]`
    
    const htmlContent = this.generateCustomEmailHTML(registration, content)

    const mailOptions = {
      from: {
        name: '中春晚 United Portal',
        address: config.email.user
      },
      to: recipientEmail,
      subject,
      html: htmlContent,
      priority: content.priority || 'normal',
      headers: {
        'MIME-Version': '1.0',
        'Content-Type': 'text/html; charset=UTF-8'
      }
    }

    // 添加BCC邮箱
    if (bccEmail && bccEmail.trim()) {
      mailOptions.bcc = bccEmail.trim()
    }

    try {
      const result = await this.sendEmailWithPool(mailOptions)
      console.log(`📧 自定义邮件已发送: ${recipientEmail} (使用: ${result.emailUsed})`)
      return {
        success: true,
        messageId: result.messageId,
        recipient: recipientEmail,
        emailUsed: result.emailUsed,
        attempt: result.attempt
      }
    } catch (error) {
      console.error('📧 发送自定义邮件失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 发送提醒邮件
  async sendReminderEmail(registration, content, bccEmail = '') {
    const { contact, name, registrationId } = registration
    const recipientEmail = `${contact}@qq.com`

    const subject = content.subject || `🎭 中春晚 United Portal - 重要提醒 [${registrationId}]`
    
    const htmlContent = this.generateReminderEmailHTML(registration, content)

    const mailOptions = {
      from: {
        name: '中春晚 United Portal',
        address: config.email.user
      },
      to: recipientEmail,
      subject,
      html: htmlContent,
      priority: 'high',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'MIME-Version': '1.0',
        'Content-Type': 'text/html; charset=UTF-8'
      }
    }

    // 添加BCC邮箱
    if (bccEmail && bccEmail.trim()) {
      mailOptions.bcc = bccEmail.trim()
    }

    try {
      const result = await this.sendEmailWithPool(mailOptions)
      console.log(`📧 提醒邮件已发送: ${recipientEmail} (使用: ${result.emailUsed})`)
      return {
        success: true,
        messageId: result.messageId,
        recipient: recipientEmail,
        emailUsed: result.emailUsed,
        attempt: result.attempt
      }
    } catch (error) {
      console.error('📧 发送提醒邮件失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 生成自定义邮件HTML
  generateCustomEmailHTML(registration, content) {
    const { registrationId, name, programName } = registration
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>中春晚 United Portal - 通知</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .message-box { background: #e3f2fd; border: 1px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #e9ecef; }
        .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .highlight { color: #667eea; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎭 中春晚 United Portal</h1>
            <p>重要通知</p>
        </div>
        
        <div class="content">
            <h2>亲爱的 ${name}，</h2>
            
            <div class="info-box">
                <p><strong>报名编号:</strong> ${registrationId}</p>
                <p><strong>节目名称:</strong> ${programName}</p>
                <p><strong>通知时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
            </div>

            <div class="message-box">
                <h3>${content.title || '重要通知'}</h3>
                <div>${content.message || '请查看相关信息'}</div>
            </div>

            ${content.actionRequired ? `
            <div style="text-align: center; margin: 30px 0;">
                <a href="${config.clientUrl}/query" class="btn">查看详情</a>
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>如有疑问，请联系管理员。</p>
            <p>© 2024 中春晚团队. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`
  }

  // 生成提醒邮件HTML
  generateReminderEmailHTML(registration, content) {
    const { registrationId, name, programName } = registration
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>中春晚 United Portal - 重要提醒</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #f8f9fa; border-left: 4px solid #ff6b6b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .reminder-box { background: #fff3e0; border: 2px solid #ff9800; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .urgent { background: #ffebee; border: 2px solid #f44336; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #e9ecef; }
        .btn { display: inline-block; padding: 12px 24px; background: #ff6b6b; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .highlight { color: #ff6b6b; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎭 中春晚 United Portal</h1>
            <p>⚠️ 重要提醒</p>
        </div>
        
        <div class="content">
            <h2>亲爱的 ${name}，</h2>
            
            <div class="info-box">
                <p><strong>报名编号:</strong> ${registrationId}</p>
                <p><strong>节目名称:</strong> ${programName}</p>
                <p><strong>提醒时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
            </div>

            <div class="reminder-box ${content.urgent ? 'urgent' : ''}">
                <h3>${content.urgent ? '🚨 ' : '⚠️ '}${content.title || '重要提醒'}</h3>
                <div>${content.message || '请及时处理相关事项'}</div>
                ${content.deadline ? `<p><strong>截止时间:</strong> <span class="highlight">${content.deadline}</span></p>` : ''}
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${config.clientUrl}/query" class="btn">立即查看</a>
            </div>
        </div>
        
        <div class="footer">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>如有疑问，请联系管理员。</p>
            <p>© 2024 中春晚团队. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`
  }
}

module.exports = new EmailService()
