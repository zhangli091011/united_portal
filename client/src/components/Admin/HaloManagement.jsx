import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { haloAPI, newsAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { 
  Globe, 
  Settings, 
  TestTube2, 
  RefreshCw, 
  Plus, 
  Tag, 
  FolderOpen,
  FileText,
  Send,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Loader2,
  RotateCcw,
  Edit,
  Trash2,
  Eye,
  BookOpen,
  PlusCircle,
  Save,
  X
} from 'lucide-react'
import LoadingSpinner from '../UI/LoadingSpinner'
import { toast } from 'react-hot-toast'

const HaloManagement = () => {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  
  // 配置状态
  const [showConfig, setShowConfig] = useState(false)
  const [configForm, setConfigForm] = useState({
    baseUrl: '',
    token: ''
  })
  
  // 同步状态
  const [selectedNews, setSelectedNews] = useState([])
  const [syncOptions, setSyncOptions] = useState({
    categoryName: 'RSS新闻',
    tags: ['RSS', '新闻'],
    autoPublish: true,
    limit: 5
  })
  
  // 创建分类/标签状态
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [showCreateTag, setShowCreateTag] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', description: '' })
  const [newTag, setNewTag] = useState({ name: '', slug: '', color: '#2563eb' })
  
  // 文章管理状态
  const [showPostManager, setShowPostManager] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    excerpt: '',
    slug: '',
    categories: [],
    tags: [],
    published: false
  })
  
  // 分类管理状态
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  
  // 标签管理状态  
  const [showTagManager, setShowTagManager] = useState(false)
  const [editingTag, setEditingTag] = useState(null)

  // 获取Halo状态
  const { data: haloStatus, isLoading: statusLoading, error: statusError, refetch: refetchStatus } = useQuery({
    queryKey: ['halo-status'],
    queryFn: haloAPI.getStatus,
    enabled: hasPermission('halo.view'),
    refetchInterval: 30000, // 30秒自动刷新
    retry: 1,
    onError: (error) => {
      console.error('❌ Halo状态查询失败:', error)
    },
    onSuccess: (data) => {
      console.log('✅ Halo状态查询成功:', data)
    }
  })

  // 获取Halo分类
  const { data: haloCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['halo-categories'],
    queryFn: haloAPI.getCategories,
    enabled: hasPermission('halo.view') && haloStatus?.data?.isConfigured
  })

  // 获取Halo标签
  const { data: haloTags, isLoading: tagsLoading } = useQuery({
    queryKey: ['halo-tags'],
    queryFn: haloAPI.getTags,
    enabled: hasPermission('halo.view') && haloStatus?.data?.isConfigured
  })

  // 获取Halo文章
  const { data: haloPosts, isLoading: postsLoading } = useQuery({
    queryKey: ['halo-posts'],
    queryFn: () => haloAPI.getPosts({ page: 0, size: 10 }),
    enabled: hasPermission('halo.view') && haloStatus?.data?.isConfigured
  })

  // 获取新闻列表
  const { data: newsData, refetch: refetchNews } = useQuery({
    queryKey: ['news'],
    queryFn: () => newsAPI.getAll({ limit: 20 }),
    enabled: hasPermission('halo.sync')
  })

  // 刷新RSS新闻
  const refreshNewsMutation = useMutation({
    mutationFn: newsAPI.refresh,
    onSuccess: () => {
      toast.success('RSS新闻刷新成功!')
      refetchNews()
    },
    onError: (error) => {
      toast.error(`刷新RSS新闻失败: ${error.response?.data?.message || error.message}`)
    }
  })

  // 配置Halo
  const configMutation = useMutation({
    mutationFn: ({ baseUrl, token }) => haloAPI.config(baseUrl, token),
    onSuccess: () => {
      toast.success('Halo博客配置成功!')
      setShowConfig(false)
      setConfigForm({ baseUrl: '', token: '' })
      refetchStatus()
      queryClient.invalidateQueries(['halo-categories'])
      queryClient.invalidateQueries(['halo-tags'])
      queryClient.invalidateQueries(['halo-posts'])
    },
    onError: (error) => {
      toast.error(`配置失败: ${error.response?.data?.message || error.message}`)
    }
  })

  // 测试连接
  const testMutation = useMutation({
    mutationFn: haloAPI.test,
    onSuccess: () => {
      toast.success('Halo博客连接测试成功!')
    },
    onError: (error) => {
      toast.error(`连接测试失败: ${error.response?.data?.message || error.message}`)
    }
  })

  // 同步新闻
  const syncMutation = useMutation({
    mutationFn: (options) => haloAPI.batchSyncNews(options),
    onSuccess: (data) => {
      const result = data.data
      toast.success(`同步完成: 成功 ${result.success} 条, 失败 ${result.failed} 条`)
      setSelectedNews([])
      queryClient.invalidateQueries(['halo-posts'])
    },
    onError: (error) => {
      toast.error(`同步失败: ${error.response?.data?.message || error.message}`)
    }
  })

  // 创建分类
  const createCategoryMutation = useMutation({
    mutationFn: haloAPI.createCategory,
    onSuccess: () => {
      toast.success('分类创建成功!')
      setShowCreateCategory(false)
      setNewCategory({ name: '', slug: '', description: '' })
      queryClient.invalidateQueries(['halo-categories'])
    },
    onError: (error) => {
      toast.error(`创建分类失败: ${error.response?.data?.message || error.message}`)
    }
  })

  // 创建标签
  const createTagMutation = useMutation({
    mutationFn: haloAPI.createTag,
    onSuccess: () => {
      toast.success('标签创建成功!')
      setShowCreateTag(false)
      setNewTag({ name: '', slug: '', color: '#2563eb' })
      queryClient.invalidateQueries(['halo-tags'])
    },
    onError: (error) => {
      toast.error(`创建标签失败: ${error.response?.data?.message || error.message}`)
    }
  })

  // 文章管理 mutations
  const createPostMutation = useMutation({
    mutationFn: haloAPI.createPost,
    onSuccess: () => {
      toast.success('文章创建成功!')
      setShowCreatePost(false)
      setNewPost({
        title: '',
        content: '',
        excerpt: '',
        slug: '',
        categories: [],
        tags: [],
        published: false
      })
      queryClient.invalidateQueries(['halo-posts'])
    },
    onError: (error) => {
      toast.error(`创建文章失败: ${error.response?.data?.message || error.message}`)
    }
  })

  const updatePostMutation = useMutation({
    mutationFn: ({ postId, data }) => haloAPI.updatePost(postId, data),
    onSuccess: () => {
      toast.success('文章更新成功!')
      setEditingPost(null)
      queryClient.invalidateQueries(['halo-posts'])
    },
    onError: (error) => {
      toast.error(`更新文章失败: ${error.response?.data?.message || error.message}`)
    }
  })

  const deletePostMutation = useMutation({
    mutationFn: haloAPI.deletePost,
    onSuccess: () => {
      toast.success('文章删除成功!')
      queryClient.invalidateQueries(['halo-posts'])
    },
    onError: (error) => {
      toast.error(`删除文章失败: ${error.response?.data?.message || error.message}`)
    }
  })

  const publishPostMutation = useMutation({
    mutationFn: haloAPI.publishPost,
    onSuccess: () => {
      toast.success('文章发布成功!')
      queryClient.invalidateQueries(['halo-posts'])
    },
    onError: (error) => {
      toast.error(`发布文章失败: ${error.response?.data?.message || error.message}`)
    }
  })

  // 分类管理 mutations
  const updateCategoryMutation = useMutation({
    mutationFn: ({ categoryId, data }) => haloAPI.updateCategory(categoryId, data),
    onSuccess: () => {
      toast.success('分类更新成功!')
      setEditingCategory(null)
      queryClient.invalidateQueries(['halo-categories'])
    },
    onError: (error) => {
      toast.error(`更新分类失败: ${error.response?.data?.message || error.message}`)
    }
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: haloAPI.deleteCategory,
    onSuccess: () => {
      toast.success('分类删除成功!')
      queryClient.invalidateQueries(['halo-categories'])
    },
    onError: (error) => {
      toast.error(`删除分类失败: ${error.response?.data?.message || error.message}`)
    }
  })

  // 标签管理 mutations
  const updateTagMutation = useMutation({
    mutationFn: ({ tagId, data }) => haloAPI.updateTag(tagId, data),
    onSuccess: () => {
      toast.success('标签更新成功!')
      setEditingTag(null)
      queryClient.invalidateQueries(['halo-tags'])
    },
    onError: (error) => {
      toast.error(`更新标签失败: ${error.response?.data?.message || error.message}`)
    }
  })

  const deleteTagMutation = useMutation({
    mutationFn: haloAPI.deleteTag,
    onSuccess: () => {
      toast.success('标签删除成功!')
      queryClient.invalidateQueries(['halo-tags'])
    },
    onError: (error) => {
      toast.error(`删除标签失败: ${error.response?.data?.message || error.message}`)
    }
  })

  // 处理配置提交
  const handleConfigSubmit = (e) => {
    e.preventDefault()
    if (!configForm.baseUrl || !configForm.token) {
      toast.error('请填写完整的博客地址和访问令牌')
      return
    }
    configMutation.mutate(configForm)
  }

  // 处理新闻选择
  const handleNewsSelect = (newsId) => {
    setSelectedNews(prev => 
      prev.includes(newsId) 
        ? prev.filter(id => id !== newsId)
        : [...prev, newsId]
    )
  }

  // 处理同步提交
  const handleSync = () => {
    const options = {
      ...syncOptions,
      newsIds: selectedNews.length > 0 ? selectedNews : undefined
    }
    syncMutation.mutate(options)
  }

  // 权限检查
  if (!hasPermission('halo.view')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">权限不足</h3>
          <p className="text-gray-600">您没有访问Halo博客管理的权限</p>
        </div>
      </div>
    )
  }

  const status = haloStatus?.data?.data
  const categories = haloCategories?.data?.items || []
  const tags = haloTags?.data?.items || []
  const posts = haloPosts?.data?.items || []
  const news = newsData?.data?.data?.items || []

  // 调试信息
  console.log('Halo数据调试:', {
    haloCategories: haloCategories?.data,
    categories,
    haloTags: haloTags?.data,
    tags,
    haloPosts: haloPosts?.data,
    posts
  })

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Globe className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Halo博客集成</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => refetchStatus()}
            disabled={statusLoading}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
            <span>刷新状态</span>
          </button>
        </div>
      </div>

      {/* 配置状态卡片 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            配置状态
          </h2>
          {hasPermission('halo.config') && (
            <button
              onClick={() => setShowConfig(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>配置</span>
            </button>
          )}
        </div>

        {statusLoading ? (
          <LoadingSpinner />
        ) : statusError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700 font-medium">状态获取失败</span>
            </div>
            <p className="text-red-600 text-sm mt-1">
              {statusError?.response?.data?.message || statusError?.message || '未知错误'}
            </p>
            <button
              onClick={() => refetchStatus()}
              className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
            >
              重试
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${status?.isConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {status?.isConfigured ? '已配置' : '未配置'}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${status?.connectionTest ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {status?.connectionTest ? '连接正常' : '连接失败'}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {status?.baseUrl || '未设置博客地址'}
              </span>
            </div>
          </div>
        )}

        {status?.isConfigured && hasPermission('halo.view') && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {testMutation.isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TestTube2 className="w-4 h-4" />
              )}
              <span>测试连接</span>
            </button>
          </div>
        )}
      </div>

      {/* 内容管理功能区域 */}
      {status?.isConfigured && status?.connectionTest && (
        <div className="space-y-6">
          {/* 管理功能快捷按钮 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
              <BookOpen className="w-5 h-5 mr-2" />
              内容管理
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 文章管理 */}
              {hasPermission('halo.view') && (
                <button
                  onClick={() => setShowPostManager(true)}
                  className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <FileText className="w-6 h-6 text-blue-600" />
                  <span className="text-blue-600 font-medium">文章管理</span>
                </button>
              )}
              
              {/* 分类管理 */}
              {hasPermission('halo.view') && (
                <button
                  onClick={() => setShowCategoryManager(true)}
                  className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                >
                  <FolderOpen className="w-6 h-6 text-green-600" />
                  <span className="text-green-600 font-medium">分类管理</span>
                </button>
              )}
              
              {/* 标签管理 */}
              {hasPermission('halo.view') && (
                <button
                  onClick={() => setShowTagManager(true)}
                  className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
                >
                  <Tag className="w-6 h-6 text-purple-600" />
                  <span className="text-purple-600 font-medium">标签管理</span>
                </button>
              )}
              
              {/* 创建文章 */}
              {hasPermission('halo.manage') && (
                <button
                  onClick={() => setShowCreatePost(true)}
                  className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-orange-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
                >
                  <PlusCircle className="w-6 h-6 text-orange-600" />
                  <span className="text-orange-600 font-medium">创建文章</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 功能区域 */}
      {status?.isConfigured && status?.connectionTest && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 新闻同步 */}
          {hasPermission('halo.sync') && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <RefreshCw className="w-5 h-5 mr-2" />
                  新闻同步
                </h2>
                <button
                  onClick={() => refreshNewsMutation.mutate()}
                  disabled={refreshNewsMutation.isPending}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {refreshNewsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>刷新RSS</span>
                </button>
              </div>

              {/* 同步选项 */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    目标分类
                  </label>
                  <input
                    type="text"
                    value={syncOptions.categoryName}
                    onChange={(e) => setSyncOptions(prev => ({ ...prev, categoryName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="分类名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    标签 (用逗号分隔)
                  </label>
                  <input
                    type="text"
                    value={syncOptions.tags.join(', ')}
                    onChange={(e) => setSyncOptions(prev => ({ 
                      ...prev, 
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="标签1, 标签2"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoPublish"
                    checked={syncOptions.autoPublish}
                    onChange={(e) => setSyncOptions(prev => ({ ...prev, autoPublish: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="autoPublish" className="text-sm text-gray-700">
                    自动发布
                  </label>
                </div>
              </div>

              {/* RSS状态信息 */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">RSS源状态:</span>
                    {newsData?.data ? (
                      <span className="text-green-600 ml-2">
                        ✓ 已连接 - {newsData.data.items?.length || 0} 篇文章
                      </span>
                    ) : (
                      <span className="text-red-600 ml-2">✗ 未连接</span>
                    )}
                  </div>
                  {newsData?.data?.lastBuildDate && (
                    <div className="text-xs text-gray-500">
                      最后更新: {new Date(newsData.data.lastBuildDate).toLocaleString('zh-CN')}
                    </div>
                  )}
                </div>
                {newsData?.data?.title && (
                  <div className="text-xs text-gray-500 mt-1">
                    源标题: {newsData.data.title}
                  </div>
                )}
              </div>

              {/* 新闻列表 */}
              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  选择要同步的新闻 ({selectedNews.length} 已选择)
                </div>
                {news.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedNews.includes(item.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleNewsSelect(item.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedNews.includes(item.id)}
                        onChange={() => handleNewsSelect(item.id)}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {item.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {item.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {new Date(item.pubDate).toLocaleDateString('zh-CN')}
                          </span>
                          {item.categories?.length > 0 && (
                            <span className="text-xs text-blue-600">
                              {item.categories[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {selectedNews.length === 0 && '将同步最新 5 条新闻'}
                </div>
                <button
                  onClick={handleSync}
                  disabled={syncMutation.isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {syncMutation.isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>开始同步</span>
                </button>
              </div>
            </div>
          )}

          {/* 内容管理 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
              <FileText className="w-5 h-5 mr-2" />
              内容管理
            </h2>

            {/* 分类管理 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 flex items-center">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  分类 ({categories.length})
                </h3>
                {hasPermission('halo.manage') && (
                  <button
                    onClick={() => setShowCreateCategory(true)}
                    className="flex items-center space-x-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                  >
                    <Plus className="w-3 h-3" />
                    <span>新建</span>
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {categoriesLoading ? (
                  <div className="text-sm text-gray-500">加载中...</div>
                ) : categories.length > 0 ? (
                  categories.map((category) => (
                    <div key={category.id} className="text-sm text-gray-700 px-2 py-1 bg-gray-50 rounded">
                      {category.name}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">暂无分类</div>
                )}
              </div>
            </div>

            {/* 标签管理 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 flex items-center">
                  <Tag className="w-4 h-4 mr-2" />
                  标签 ({tags.length})
                </h3>
                {hasPermission('halo.manage') && (
                  <button
                    onClick={() => setShowCreateTag(true)}
                    className="flex items-center space-x-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                  >
                    <Plus className="w-3 h-3" />
                    <span>新建</span>
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {tagsLoading ? (
                  <div className="text-sm text-gray-500">加载中...</div>
                ) : tags.length > 0 ? (
                  tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-1 text-xs rounded"
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">暂无标签</div>
                )}
              </div>
            </div>

            {/* 最新文章 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  最新文章 ({posts.length})
                </h3>
                {status?.baseUrl && (
                  <a
                    href={status.baseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>访问博客</span>
                  </a>
                )}
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {postsLoading ? (
                  <div className="text-sm text-gray-500">加载中...</div>
                ) : posts.length > 0 ? (
                  posts.map((post) => (
                    <div key={post.id} className="text-sm text-gray-700 px-2 py-1 bg-gray-50 rounded flex items-center justify-between">
                      <span className="truncate">{post.title}</span>
                      <div className="flex items-center space-x-1">
                        {post.published ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">暂无文章</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 配置对话框 */}
      {showConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">配置Halo博客</h3>
            <form onSubmit={handleConfigSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  博客地址
                </label>
                <input
                  type="url"
                  value={configForm.baseUrl}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, baseUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://blog.example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  访问令牌 (PAT)
                </label>
                <input
                  type="password"
                  value={configForm.token}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, token: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="pat_xxxxxxxxxx"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={configMutation.isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {configMutation.isLoading ? '配置中...' : '保存配置'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 创建分类对话框 */}
      {showCreateCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">创建分类</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类名称
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="分类名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类别名
                </label>
                <input
                  type="text"
                  value={newCategory.slug}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="category-slug (可选)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类描述
                </label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="分类描述 (可选)"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateCategory(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => createCategoryMutation.mutate(newCategory)}
                  disabled={createCategoryMutation.isLoading || !newCategory.name}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createCategoryMutation.isLoading ? '创建中...' : '创建分类'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 创建标签对话框 */}
      {showCreateTag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">创建标签</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标签名称
                </label>
                <input
                  type="text"
                  value={newTag.name}
                  onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="标签名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标签别名
                </label>
                <input
                  type="text"
                  value={newTag.slug}
                  onChange={(e) => setNewTag(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="tag-slug (可选)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标签颜色
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={newTag.color}
                    onChange={(e) => setNewTag(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newTag.color}
                    onChange={(e) => setNewTag(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="#2563eb"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateTag(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => createTagMutation.mutate(newTag)}
                  disabled={createTagMutation.isLoading || !newTag.name}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createTagMutation.isLoading ? '创建中...' : '创建标签'}
                </button>
              </div>
            </div>
          </div>
        </div>
              )}

      {/* 文章管理模态框 */}
      {showPostManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">文章管理</h2>
              <button
                onClick={() => setShowPostManager(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <button
                onClick={() => setShowCreatePost(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>创建文章</span>
              </button>
            </div>
            
            {/* 文章列表将在这里显示 */}
            <div className="space-y-4">
              {posts?.map((post) => {
                const postData = post.post || post;
                const spec = postData.spec || {};
                const metadata = postData.metadata || {};
                return (
                <div key={metadata.name} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{spec.title}</h3>
                      <p className="text-sm text-gray-500">{spec.excerpt?.raw || spec.excerpt}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingPost(post)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => publishPostMutation.mutate(metadata.name)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletePostMutation.mutate(metadata.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              }) || <p className="text-gray-500 text-center">暂无文章</p>}
            </div>
          </div>
        </div>
      )}

      {/* 创建文章模态框 */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">创建文章</h2>
              <button
                onClick={() => setShowCreatePost(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              createPostMutation.mutate(newPost)
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文章标题
                </label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入文章标题"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文章摘要
                </label>
                <textarea
                  value={newPost.excerpt}
                  onChange={(e) => setNewPost(prev => ({ ...prev, excerpt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="请输入文章摘要"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文章内容
                </label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="10"
                  placeholder="请输入文章内容（支持 Markdown）"
                  required
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="published"
                  checked={newPost.published}
                  onChange={(e) => setNewPost(prev => ({ ...prev, published: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="published" className="text-sm text-gray-700">
                  立即发布
                </label>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreatePost(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={createPostMutation.isPending}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createPostMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>创建文章</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 分类管理模态框 */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">分类管理</h2>
              <button
                onClick={() => setShowCategoryManager(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <button
                onClick={() => setShowCreateCategory(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                <span>创建分类</span>
              </button>
            </div>
            
            {/* 分类列表 */}
            <div className="space-y-4">
              {categories?.map((category) => {
                const spec = category.spec || {};
                const metadata = category.metadata || {};
                return (
                <div key={metadata.name} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{spec.displayName}</h3>
                      <p className="text-sm text-gray-500">{spec.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteCategoryMutation.mutate(metadata.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              }) || <p className="text-gray-500 text-center">暂无分类</p>}
            </div>
          </div>
        </div>
      )}

      {/* 标签管理模态框 */}
      {showTagManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">标签管理</h2>
              <button
                onClick={() => setShowTagManager(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <button
                onClick={() => setShowCreateTag(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
                <span>创建标签</span>
              </button>
            </div>
            
            {/* 标签列表 */}
            <div className="space-y-4">
              {tags?.map((tag) => {
                const spec = tag.spec || {};
                const metadata = tag.metadata || {};
                return (
                <div key={metadata.name} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: spec.color || '#ccc' }}
                      />
                      <div>
                        <h3 className="font-medium">{spec.displayName}</h3>
                        <p className="text-sm text-gray-500">#{spec.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingTag(tag)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTagMutation.mutate(metadata.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              }) || <p className="text-gray-500 text-center">暂无标签</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HaloManagement

