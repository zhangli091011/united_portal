import { TrendingUp, TrendingDown } from 'lucide-react'

const StatCard = ({ title, value, icon: Icon, color = 'blue', trend }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    yellow: 'from-yellow-500 to-orange-500',
    red: 'from-red-500 to-pink-500',
    purple: 'from-purple-500 to-indigo-500'
  }

  const bgClass = colorClasses[color] || colorClasses.blue

  return (
    <div className="card-neon p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-slate-600 text-sm font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{Number(value || 0).toLocaleString()}</p>
          
          {trend && (
            <div className="flex items-center mt-2">
              <div className="flex items-center space-x-1">
                {trend.isIncrease !== false ? (
                  <TrendingUp size={14} className="text-green-400" />
                ) : (
                  <TrendingDown size={14} className="text-red-400" />
                )}
                <span className={`text-xs font-medium ${
                  trend.isIncrease !== false ? 'text-green-400' : 'text-red-400'
                }`}>
                  {trend.value}
                </span>
              </div>
              <span className="text-gray-400 text-xs ml-2">{trend.label}</span>
            </div>
          )}
        </div>
        
        <div className={`w-12 h-12 bg-gradient-to-br ${bgClass} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
    </div>
  )
}

export default StatCard
