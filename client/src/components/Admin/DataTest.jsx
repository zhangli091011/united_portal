import { useQuery } from '@tanstack/react-query'
import { statsAPI } from '../../services/api'

const DataTest = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['test-dashboard-data'],
    queryFn: statsAPI.getDashboard,
    staleTime: 0,
    gcTime: 0, // cacheTime renamed to gcTime in v5
    refetchOnMount: true,
    onSuccess: (data) => {
      console.log('💯 DataTest - 数据获取成功:', data)
    }
  })

  if (isLoading) return <div className="text-white">Loading...</div>
  if (error) return <div className="text-red-500">Error: {error.message}</div>

  const overview = data?.data?.data?.overview

  return (
    <div className="bg-gray-800 p-4 rounded-lg text-white">
      <h3 className="text-lg font-bold mb-4">🧪 原始数据测试</h3>
      
      <div className="space-y-2 text-sm">
        <p><strong>总报名数:</strong> <span className="text-yellow-400">{overview?.totalRegistrations}</span></p>
        <p><strong>今日报名:</strong> <span className="text-green-400">{overview?.todayRegistrations}</span></p>
        <p><strong>待审核:</strong> <span className="text-blue-400">{overview?.pendingReview}</span></p>
        <p><strong>已通过:</strong> <span className="text-purple-400">{overview?.approved}</span></p>
      </div>
      
      <div className="mt-4 text-xs">
        <p><strong>数据类型检查:</strong></p>
        <p>totalRegistrations: {typeof overview?.totalRegistrations} = {JSON.stringify(overview?.totalRegistrations)}</p>
        <p>todayRegistrations: {typeof overview?.todayRegistrations} = {JSON.stringify(overview?.todayRegistrations)}</p>
        <p>pendingReview: {typeof overview?.pendingReview} = {JSON.stringify(overview?.pendingReview)}</p>
      </div>
      
      <details className="mt-4">
        <summary className="cursor-pointer text-gray-400">查看完整数据</summary>
        <pre className="text-xs bg-gray-900 p-2 mt-2 rounded overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  )
}

export default DataTest
