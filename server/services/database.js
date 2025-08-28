const mysql = require('mysql2/promise')

class Database {
  constructor() {
    this.connection = null
    this.isAvailable = false
    this.init()
  }

  async init() {
    try {
      this.connection = await mysql.createConnection({
        host: '103.216.175.227',
        user: 'users',
        password: 'dcLt2XSHNHaXepC7',
        database: 'users',
        charset: 'utf8mb4'
      })

      console.log('✅ MySQL数据库连接成功')
      this.isAvailable = true
      await this.createTables()
    } catch (error) {
      console.error('MySQL数据库连接失败:', error.message)
      this.isAvailable = false
    }
  }

  async createTables() {
    try {
      // 创建用户表
      await this.connection.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'admin',
          permissions TEXT,
          created_by INT,
          is_active BOOLEAN DEFAULT 1,
          last_login DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `)

      // 创建权限表
      await this.connection.execute(`
        CREATE TABLE IF NOT EXISTS permissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(50) UNIQUE NOT NULL,
          description TEXT,
          category VARCHAR(50),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `)

      // 创建用户会话表
      await this.connection.execute(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          token_hash VARCHAR(255) NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `)

      console.log('✅ 数据库表创建成功')
      await this.insertDefaultPermissions()
    } catch (error) {
      console.error('创建数据库表失败:', error.message)
    }
  }

  async insertDefaultPermissions() {
    const defaultPermissions = [
      { name: 'user.view', description: '查看用户', category: '用户管理' },
      { name: 'user.create', description: '创建用户', category: '用户管理' },
      { name: 'user.edit', description: '编辑用户', category: '用户管理' },
      { name: 'user.delete', description: '删除用户', category: '用户管理' },
      { name: 'user.manage_permissions', description: '管理用户权限', category: '用户管理' },
      { name: 'registration.view', description: '查看报名数据', category: '报名管理' },
      { name: 'registration.edit', description: '编辑报名数据', category: '报名管理' },
      { name: 'registration.delete', description: '删除报名数据', category: '报名管理' },
      { name: 'registration.export', description: '导出报名数据', category: '报名管理' },
      { name: 'email.manage', description: '管理邮箱池', category: '邮件管理' },
      { name: 'news.manage', description: '管理新闻', category: '内容管理' },
      { name: 'theme.manage', description: '管理主题', category: '系统设置' },
      { name: 'settings.manage', description: '管理系统设置', category: '系统设置' },
      { name: 'stats.view', description: '查看统计数据', category: '数据分析' },
      { name: 'logs.view', description: '查看系统日志', category: '安全管理' },
      { name: 'logs.export', description: '导出系统日志', category: '安全管理' },
      { name: 'logs.cleanup', description: '清理系统日志', category: '安全管理' },
      { name: 'halo.view', description: '查看Halo博客配置', category: 'Halo集成' },
      { name: 'halo.config', description: '配置Halo博客', category: 'Halo集成' },
      { name: 'halo.sync', description: '同步内容到Halo', category: 'Halo集成' },
      { name: 'halo.manage', description: '管理Halo博客', category: 'Halo集成' }
    ]

    for (const permission of defaultPermissions) {
      try {
        await this.connection.execute(
          'INSERT IGNORE INTO permissions (name, description, category) VALUES (?, ?, ?)',
          [permission.name, permission.description, permission.category]
        )
      } catch (error) {
        console.error('插入默认权限失败:', error.message)
      }
    }
  }

  // 用户管理方法
  async createUser(userData) {
    if (!this.isAvailable) {
      throw new Error('数据库不可用')
    }

    const { username, email, passwordHash, role, permissions, createdBy } = userData
    
    try {
      const [result] = await this.connection.execute(
        'INSERT INTO users (username, email, password_hash, role, permissions, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [username, email, passwordHash, role, JSON.stringify(permissions || []), createdBy]
      )

      return {
        id: result.insertId,
        username,
        email,
        role,
        permissions
      }
    } catch (error) {
      throw error
    }
  }

  async getUserById(id) {
    if (!this.isAvailable) {
      throw new Error('数据库不可用')
    }

    try {
      const [rows] = await this.connection.execute(
        'SELECT * FROM users WHERE id = ? AND is_active = 1',
        [id]
      )

      if (rows.length === 0) {
        return null
      }

      const user = rows[0]
      user.permissions = JSON.parse(user.permissions || '[]')
      return user
    } catch (error) {
      throw error
    }
  }

  async getUserByUsername(username) {
    if (!this.isAvailable) {
      throw new Error('数据库不可用')
    }

    try {
      const [rows] = await this.connection.execute(
        'SELECT * FROM users WHERE username = ? AND is_active = 1',
        [username]
      )

      if (rows.length === 0) {
        return null
      }

      const user = rows[0]
      user.permissions = JSON.parse(user.permissions || '[]')
      return user
    } catch (error) {
      throw error
    }
  }

  async getAllUsers() {
    if (!this.isAvailable) {
      throw new Error('数据库不可用')
    }

    try {
      const [rows] = await this.connection.execute(
        'SELECT * FROM users WHERE is_active = 1 ORDER BY created_at DESC'
      )

      return rows.map(user => ({
        ...user,
        permissions: JSON.parse(user.permissions || '[]')
      }))
    } catch (error) {
      throw error
    }
  }

  async updateUser(id, userData) {
    if (!this.isAvailable) {
      throw new Error('数据库不可用')
    }

    const { username, email, role, permissions, isActive } = userData
    
    try {
      const [result] = await this.connection.execute(
        'UPDATE users SET username = ?, email = ?, role = ?, permissions = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [username, email, role, JSON.stringify(permissions), isActive, id]
      )

      return { changes: result.affectedRows }
    } catch (error) {
      throw error
    }
  }

  async updateUserPassword(id, passwordHash) {
    if (!this.isAvailable) {
      throw new Error('数据库不可用')
    }

    try {
      const [result] = await this.connection.execute(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [passwordHash, id]
      )

      return { changes: result.affectedRows }
    } catch (error) {
      throw error
    }
  }

  async updateLastLogin(id) {
    if (!this.isAvailable) {
      throw new Error('数据库不可用')
    }

    try {
      const [result] = await this.connection.execute(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      )

      return { changes: result.affectedRows }
    } catch (error) {
      throw error
    }
  }

  async deleteUser(id) {
    if (!this.isAvailable) {
      throw new Error('数据库不可用')
    }

    try {
      const [result] = await this.connection.execute(
        'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      )

      return { changes: result.affectedRows }
    } catch (error) {
      throw error
    }
  }

  // 权限管理方法
  async getAllPermissions() {
    if (!this.isAvailable) {
      throw new Error('数据库不可用')
    }

    try {
      const [rows] = await this.connection.execute(
        'SELECT * FROM permissions ORDER BY category, name'
      )

      return rows
    } catch (error) {
      throw error
    }
  }

  // 会话管理方法
  async createSession(userId, tokenHash, expiresAt) {
    if (!this.isAvailable) {
      throw new Error('数据库不可用')
    }

    try {
      const [result] = await this.connection.execute(
        'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
        [userId, tokenHash, expiresAt]
      )

      return { id: result.insertId }
    } catch (error) {
      throw error
    }
  }

  async deleteSession(tokenHash) {
    if (!this.isAvailable) {
      throw new Error('数据库不可用')
    }

    try {
      const [result] = await this.connection.execute(
        'DELETE FROM user_sessions WHERE token_hash = ?',
        [tokenHash]
      )

      return { changes: result.affectedRows }
    } catch (error) {
      throw error
    }
  }

  async cleanExpiredSessions() {
    if (!this.isAvailable) {
      throw new Error('数据库不可用')
    }

    try {
      const [result] = await this.connection.execute(
        'DELETE FROM user_sessions WHERE expires_at < NOW()'
      )

      return { changes: result.affectedRows }
    } catch (error) {
      throw error
    }
  }

  async close() {
    if (this.connection) {
      await this.connection.end()
      console.log('MySQL数据库连接已关闭')
    }
  }
}

module.exports = new Database()