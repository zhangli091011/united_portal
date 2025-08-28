import { useMemo } from 'react'

const Chart = ({ type, data, xField, yField, labelField, valueField }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    if (type === 'pie') {
      return data.map(item => ({
        label: item[labelField],
        value: item[valueField],
        percentage: Math.round((item[valueField] / data.reduce((sum, d) => sum + d[valueField], 0)) * 100)
      }))
    }
    
    return data
  }, [data, type, labelField, valueField])

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400">
        暂无数据
      </div>
    )
  }

  if (type === 'line') {
    const maxValue = Math.max(...chartData.map(d => d[yField]))
    const minValue = Math.min(...chartData.map(d => d[yField]))
    const range = maxValue - minValue || 1

    return (
      <div className="h-48 flex flex-col">
        <div className="flex-1 relative">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Line chart */}
            <polyline
              fill="none"
              stroke="#FF6B35"
              strokeWidth="2"
              points={chartData.map((d, i) => {
                const x = (i / (chartData.length - 1)) * 100
                const y = 100 - ((d[yField] - minValue) / range) * 100
                return `${x},${y}`
              }).join(' ')}
              vectorEffect="non-scaling-stroke"
            />
            
            {/* Data points */}
            {chartData.map((d, i) => {
              const x = (i / (chartData.length - 1)) * 100
              const y = 100 - ((d[yField] - minValue) / range) * 100
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="#FF6B35"
                  className="hover:r-4 transition-all"
                />
              )
            })}
          </svg>
        </div>
        
        {/* X-axis labels */}
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          {chartData.map((d, i) => (
            <span key={i} className="text-center">
              {new Date(d[xField]).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'bar') {
    const maxValue = Math.max(...chartData.map(d => d[yField]))

    return (
      <div className="h-48 flex items-end space-x-2">
        {chartData.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-gradient-to-t from-primary-orange to-primary-orange-light rounded-t transition-all hover:from-primary-orange-hover"
              style={{
                height: `${(d[yField] / maxValue) * 100}%`,
                minHeight: '4px'
              }}
            />
            <div className="text-xs text-gray-400 mt-2 text-center leading-tight">
              <div className="font-medium text-slate-800">{d[yField]}</div>
              <div className="truncate">{d[xField]}</div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'pie') {
    const colors = ['#FF6B35', '#00BFFF', '#00FF7F', '#8A2BE2', '#FFD700', '#FF69B4']
    
    return (
      <div className="space-y-4">
        {/* Pie chart simulation with horizontal bars */}
        <div className="space-y-2">
          {chartData.map((d, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <div className="flex-1 flex items-center justify-between">
                <span className="text-slate-800 text-sm">{d.label}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400 text-sm">{d.value}</span>
                  <span className="text-xs text-gray-500">({d.percentage}%)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Progress bars */}
        <div className="space-y-2">
          {chartData.map((d, i) => (
            <div key={i} className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${d.percentage}%`,
                  backgroundColor: colors[i % colors.length]
                }}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

export default Chart
