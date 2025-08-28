import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { newsAPI } from '../services/api'
import { 
  Newspaper, 
  Calendar, 
  ExternalLink, 
  Search, 
  RefreshCw,
  Clock,
  Tag
} from 'lucide-react'
import LoadingSpinner from '../components/UI/LoadingSpinner'
import { useDebug } from '../contexts/DebugContext'

const NewsPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const { showDataPanels } = useDebug()

  // 获取新闻列表
  const { data: newsData, isLoading, refetch, error: newsError } = useQuery({
    queryKey: ['news', { search: searchTerm, category: selectedCategory }],
    queryFn: () => newsAPI.getAll({ 
      search: searchTerm || undefined, 
      category: selectedCategory || undefined 
    }),
    placeholderData: (previousData) => previousData, // keepPreviousData replaced with placeholderData in v5
    staleTime: 0, // 强制每次都获取最新数据
    gcTime: 0, // cacheTime renamed to gcTime in v5
    refetchOnMount: true,
    onError: (error) => {
      console.error('获取新闻数据失败:', error)
    },
    onSuccess: (data) => {
      console.log('新闻数据获取成功:', data)
    }
  })

  // 获取分类列表
  const { data: categoriesData, error: categoriesError } = useQuery({
    queryKey: ['news-categories'],
    queryFn: newsAPI.getCategories,
    staleTime: 0,
    gcTime: 0, // cacheTime renamed to gcTime in v5
    refetchOnMount: true,
    onError: (error) => {
      console.error('获取新闻分类失败:', error)
    },
    onSuccess: (data) => {
      console.log('新闻分类获取成功:', data)
    }
  })

  const news = newsData?.data?.data || {}
  const categories = Array.isArray(categoriesData?.data?.data) ? categoriesData.data.data : (Array.isArray(categoriesData?.data) ? categoriesData.data : [])
  
  // 新闻数据调试

  const handleSearch = (e) => {
    e.preventDefault()
    refetch()
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getExcerpt = (content, maxLength = 150) => {
    if (!content) return ''
    const text = content.replace(/<[^>]*>/g, '')
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold neon-text mb-4">
            新闻中心
          </h1>
          <p className="text-gray-400 text-lg">
            获取最新的团队动态和技术分享
          </p>
        </div>

        {/* 搜索和过滤 */}
        <div className="card-neon p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="搜索新闻..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-neon w-full pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-neon"
              >
                <option value="">所有分类</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <button type="submit" className="btn-primary flex items-center space-x-2">
                <Search size={16} />
                <span>搜索</span>
              </button>
              
              <button 
                type="button" 
                onClick={() => refetch()} 
                className="btn-secondary flex items-center space-x-2"
              >
                <RefreshCw size={16} />
                <span>刷新</span>
              </button>
            </div>
          </form>

          {/* 搜索结果信息 */}
          {news.items && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-sm">
                {searchTerm && `搜索 "${searchTerm}" `}
                {selectedCategory && `在分类 "${selectedCategory}" 中 `}
                共找到 {news.items.length} 篇文章
              </p>
              {news.title && (
                <p className="text-gray-400 text-sm">
                  来源: {news.title}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 调试信息 */}
        

        {/* 新闻列表 */}
        {isLoading ? (
          <div className="card-neon p-12 text-center">
            <LoadingSpinner size="large" />
            <p className="text-gray-400 mt-4">加载新闻中...</p>
          </div>
        ) : news.items && news.items.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {news.items.map((article) => (
              <article key={article.id} className="card-neon p-6 group">
                <div className="space-y-4">
                  {/* 文章头部 */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h2 className="text-xl font-bold text-black group-hover:text-primary-orange transition-colors line-clamp-2">
                        {article.title}
                      </h2>
                      <div className="flex items-center space-x-2 text-black text-sm flex-shrink-0 ml-4">
                        <Calendar size={14} />
                        <span>{formatDate(article.pubDate)}</span>
                      </div>
                    </div>

                    {/* 分类标签 */}
                    {article.categories && article.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {article.categories.slice(0, 3).map((category, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center space-x-1 bg-primary-orange/20 text-primary-orange px-2 py-1 rounded-full text-xs"
                          >
                            <Tag size={10} />
                            <span>{category}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 缩略图 */}
                  {article.thumbnail && (
                    <div className="relative overflow-hidden rounded-lg">
                      <img
                        src={article.thumbnail}
                        alt={article.title}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                  )}

                  {/* 文章摘要 */}
                  <div className="space-y-3">
                    <p className="text-black text-sm leading-relaxed">
                      {article.excerpt || getExcerpt(article.description)}
                    </p>

                    {/* 作者和时间 */}
                    <div className="flex items-center justify-between text-sm text-black">
                      <div className="flex items-center space-x-2">
                        {article.author && (
                          <>
                            <span>作者: {article.author}</span>
                            <span>•</span>
                          </>
                        )}
                        <div className="flex items-center space-x-1">
                          <Clock size={12} />
                          <span>{formatDate(article.isoDate || article.pubDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center justify-between pt-4 border-t border-black">
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary flex items-center space-x-2 group-hover:shadow-neon-orange"
                    >
                      <span>阅读全文</span>
                      <ExternalLink size={16} />
                    </a>

                    <div className="flex items-center space-x-3 text-black">
                      <button className="hover:text-primary-orange transition-colors">
                        <Newspaper size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="card-neon p-12 text-center">
            <Newspaper className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-xl font-semibold text-white mb-2">暂无新闻</h3>
            <p className="text-gray-400 mb-6">
              {searchTerm || selectedCategory ? '没有找到匹配的新闻' : '当前没有可用的新闻内容'}
            </p>
            <div className="space-x-4">
              <button 
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('')
                  refetch()
                }}
                className="btn-secondary"
              >
                清除筛选
              </button>
              <button onClick={() => refetch()} className="btn-primary">
                重新加载
              </button>
            </div>
          </div>
        )}

        {/* 底部信息 */}
        {news.items && news.items.length > 0 && (
          <div className="mt-12 text-center">
            <div className="card-neon p-6">
              <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                <div className="text-gray-400">
                  <p className="text-sm">
                    数据来源: <span className="text-primary-orange">{news.title || 'AdventureX Blog'}</span>
                  </p>
                  {news.lastBuildDate && (
                    <p className="text-xs mt-1">
                      最后更新: {formatDate(news.lastBuildDate)}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  <a
                    href={news.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <span>访问博客</span>
                    <ExternalLink size={16} />
                  </a>
                  <button onClick={() => refetch()} className="btn-primary">
                    刷新内容
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NewsPage
