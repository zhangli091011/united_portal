import { useState } from 'react'
import { Palette, Check } from 'lucide-react'

const ColorPicker = ({ label, value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [customColor, setCustomColor] = useState(value)

  const presetColors = [
    '#FF6B35', '#EA580C', '#C2410C', '#FB923C', // 橙色系
    '#3B82F6', '#2563EB', '#1D4ED8', '#60A5FA', // 蓝色系
    '#10B981', '#059669', '#047857', '#34D399', // 绿色系
    '#8B5CF6', '#7C3AED', '#6D28D9', '#A78BFA', // 紫色系
    '#EF4444', '#DC2626', '#B91C1C', '#F87171', // 红色系
    '#6B7280', '#4B5563', '#374151', '#9CA3AF', // 灰色系
    '#000000', '#FFFFFF', '#F3F4F6', '#E5E7EB', // 黑白系
  ]

  const handleColorChange = (color) => {
    setCustomColor(color)
    onChange(color)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
          style={{ backgroundColor: value }}
        >
          {!value && <Palette size={20} className="text-gray-400" />}
        </button>
        
        <input
          type="text"
          value={customColor}
          onChange={(e) => setCustomColor(e.target.value)}
          onBlur={() => onChange(customColor)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-primary-orange focus:outline-none"
          placeholder="#000000"
        />
        
        <input
          type="color"
          value={value}
          onChange={(e) => handleColorChange(e.target.value)}
          className="w-10 h-10 border border-gray-300 rounded-lg cursor-pointer"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-64">
          <div className="grid grid-cols-7 gap-2">
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleColorChange(color)}
                className="w-8 h-8 rounded border border-gray-300 hover:scale-110 transition-transform relative"
                style={{ backgroundColor: color }}
              >
                {value === color && (
                  <Check 
                    size={16} 
                    className="absolute inset-0 m-auto text-white drop-shadow-lg" 
                  />
                )}
              </button>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ColorPicker
