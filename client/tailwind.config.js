/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'dingtalk': ['"DingTalk JinBuTi"', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        'body': ['SimHei', 'Microsoft YaHei', 'PingFang SC', 'sans-serif'],
        'title': ['"DingTalk JinBuTi"', 'PingFang SC', 'Microsoft YaHei', 'sans-serif']
      },
      colors: {
        primary: {
          orange: '#3B82F6', // 改为蓝色
          'orange-hover': '#2563EB', // 改为深蓝色
          'orange-light': '#60A5FA', // 改为浅蓝色
          dark: '#0A0A0A',
          'dark-secondary': '#1A1A1A',
          'dark-tertiary': '#2A2A2A',
          light: '#FFFFFF',
          'light-secondary': '#F8F9FA',
          'light-tertiary': '#E9ECEF'
        },
        neon: {
          orange: '#3B82F6', // 改为蓝色
          blue: '#00BFFF',
          green: '#00FF7F',
          purple: '#8A2BE2'
        }
      },
      boxShadow: {
        'neon-orange': '0 0 20px rgba(59, 130, 246, 0.5)', // 改为蓝色
        'neon-blue': '0 0 20px rgba(0, 191, 255, 0.5)',
        'card-hover': '0 10px 30px rgba(59, 130, 246, 0.3)', // 改为蓝色
      },
      backgroundImage: {
        'gradient-neon': 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(0, 191, 255, 0.1) 100%)', // 改为蓝色
        'card-gradient': 'linear-gradient(135deg, rgba(26, 26, 26, 0.8) 0%, rgba(42, 42, 42, 0.8) 100%)',
        'card-gradient-light': 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 249, 250, 0.95) 100%)',
        'card-gradient-contrast': 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(243, 244, 246, 1) 100%)',
        'card-gradient-blue': 'linear-gradient(135deg, rgba(196, 215, 252, 1) 0%, rgba(147, 197, 253, 1) 100%)',
        'card-gradient-blue-dark': 'linear-gradient(135deg, rgba(165, 180, 252, 1) 0%, rgba(129, 140, 248, 1) 100%)',
        'gradient-neon-light': 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(0, 191, 255, 0.05) 100%)', // 改为蓝色
      },
      animation: {
        'pulse-neon': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
