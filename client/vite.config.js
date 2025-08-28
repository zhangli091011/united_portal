import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // 允许访问的主机列表
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'united.quantumlight.cc',
      '.quantumlight.cc' // 允许所有quantumlight.cc的子域名
    ],
    proxy: {
      '/api': {
        // 无论开发环境还是生产环境都使用统一的API服务器
        target: 'https://united.quantumlight.cc',
        changeOrigin: true,
        secure: true,
        // 重写路径，移除/api前缀
        rewrite: (path) => path
      }
    }
  },
  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: false,
    // 分包优化
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'react-hot-toast'],
          query: ['react-query', 'axios']
        }
      }
    }
  }
})
