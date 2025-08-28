import { createContext, useContext, useReducer, useEffect } from 'react'
import { authAPI } from '../services/api'
import Cookies from 'js-cookie'

const AuthContext = createContext()

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null }
    case 'LOGIN_SUCCESS':
      return { ...state, loading: false, user: action.payload, error: null }
    case 'LOGIN_FAILURE':
      return { ...state, loading: false, error: action.payload }
    case 'LOGOUT':
      return { ...state, user: null, loading: false, error: null }
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false }
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } }
    default:
      return state
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    // 检查本地存储的认证信息
    const checkAuth = async () => {
      const token = Cookies.get('token')
      if (token) {
        try {
          const response = await authAPI.verifyToken()
          dispatch({ type: 'SET_USER', payload: response.data.data })
        } catch (error) {
          Cookies.remove('token')
          dispatch({ type: 'LOGOUT' })
        }
      } else {
        dispatch({ type: 'LOGOUT' })
      }
    }

    checkAuth()
  }, [])

  const login = async (credentials, type = 'employee') => {
    dispatch({ type: 'LOGIN_START' })
    try {
      const response = await authAPI.login(credentials, type)
      const { user, token } = response.data.data
      
      Cookies.set('token', token, { expires: 7 }) // 7天过期
      dispatch({ type: 'LOGIN_SUCCESS', payload: user })
      
      return response
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: error.response?.data?.message || '登录失败' })
      throw error
    }
  }

  const logout = () => {
    Cookies.remove('token')
    dispatch({ type: 'LOGOUT' })
  }

  // 权限检查函数
  const hasPermission = (permission) => {
    if (!state.user) return false
    
    // 超级管理员拥有所有权限
    if (state.user.role === 'super_admin') return true
    
    // 检查用户权限列表
    return state.user.permissions?.includes(permission) || false
  }

  // 角色检查函数
  const hasRole = (role) => {
    if (!state.user) return false
    
    if (Array.isArray(role)) {
      return role.includes(state.user.role)
    }
    
    return state.user.role === role
  }

  // 是否为超级管理员
  const isSuperAdmin = () => {
    return state.user?.role === 'super_admin'
  }

  // 是否为管理员（包括超级管理员）
  const isAdmin = () => {
    return state.user && ['admin', 'super_admin'].includes(state.user.role)
  }

  // 更新用户信息
  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData })
  }

  const value = {
    ...state,
    login,
    logout,
    hasPermission,
    hasRole,
    isSuperAdmin,
    isAdmin,
    updateUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
