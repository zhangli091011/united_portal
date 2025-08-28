#!/usr/bin/env node

const bcrypt = require('bcryptjs')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

async function generatePasswordHash() {
  console.log('🔐 密码哈希生成工具')
  console.log('===================\n')

  const password = await askQuestion('请输入要加密的密码: ')
  
  if (!password) {
    console.log('❌ 密码不能为空')
    rl.close()
    return
  }

  const hash = bcrypt.hashSync(password, 10)
  
  console.log('\n✅ 密码哈希生成成功:')
  console.log(`原密码: ${password}`)
  console.log(`哈希值: ${hash}`)
  console.log('\n📋 请将哈希值复制到 config.js 中的 admin.passwordHash 字段')
  
  rl.close()
}

generatePasswordHash().catch(console.error)
