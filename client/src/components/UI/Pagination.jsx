import { useState } from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  hasMore = false,
  total = 0,
  pageSize = 1000,
  onPageChange,
  onPageSizeChange,
  loading = false,
  showSizeChanger = false,
  showQuickJumper = false,
  showTotal = false,
}) => {
  const [jumpPage, setJumpPage] = useState('')

  // 处理快速跳转
  const handleQuickJump = (e) => {
    if (e.key === 'Enter') {
      const page = parseInt(jumpPage)
      if (page >= 1 && page <= totalPages) {
        onPageChange?.(page)
        setJumpPage('')
      }
    }
  }

  // 生成页码数组
  const generatePageNumbers = () => {
    const pages = []
    const maxVisible = 7 // 最多显示7个页码
    
    if (totalPages <= maxVisible) {
      // 如果总页数少于最大显示数，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // 复杂的分页逻辑
      const start = Math.max(1, currentPage - 2)
      const end = Math.min(totalPages, currentPage + 2)
      
      if (start > 1) {
        pages.push(1)
        if (start > 2) {
          pages.push('...')
        }
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push('...')
        }
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  const pageNumbers = generatePageNumbers()

  // 页面大小选项
  const pageSizeOptions = [100, 500, 1000]

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
      {/* 左侧：统计信息 */}
      <div className="flex items-center space-x-6">
        {showTotal && (
          <span className="text-sm text-gray-700">
            共 <span className="font-medium">{total}</span> 条记录
          </span>
        )}
        
        {showSizeChanger && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">每页</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(parseInt(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size} className="text-slate-600">{size}</option>
              ))}
            </select>
            <span className="text-sm text-gray-700">条</span>
          </div>
        )}
      </div>

      {/* 右侧：分页控件 */}
      <div className="flex items-center space-x-4">
        {showQuickJumper && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">跳至</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyPress={handleQuickJump}
              className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={currentPage.toString()}
              disabled={loading}
            />
            <span className="text-sm text-gray-700">页</span>
          </div>
        )}

        {/* 分页按钮组 */}
        <div className="flex items-center space-x-1">
          {/* 上一页 */}
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-slate-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
            <span className="ml-1">上一页</span>
          </button>

          {/* 页码按钮 */}
          <div className="flex">
            {pageNumbers.map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === 'number' ? onPageChange?.(page) : null}
                disabled={loading || page === '...'}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium border-t border-b transition-colors ${
                  page === currentPage
                    ? 'bg-blue-50 border-blue-500 text-blue-600 z-10'
                    : page === '...'
                    ? 'bg-white border-slate-300 text-gray-400 cursor-default'
                    : 'bg-white border-slate-300 text-gray-500 hover:bg-gray-50'
                } ${
                  typeof page === 'number' && !loading ? 'hover:border-gray-400' : ''
                }`}
                style={{ 
                  borderLeftWidth: index === 0 ? '1px' : '0',
                  borderRightWidth: '1px'
                }}
              >
                {page === '...' ? <MoreHorizontal size={16} /> : page}
              </button>
            ))}
          </div>

          {/* 下一页 */}
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={!hasMore || loading}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-slate-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="mr-1">下一页</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>加载中...</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default Pagination
