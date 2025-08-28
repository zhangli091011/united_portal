import { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import ColorPicker from '../components/ColorPicker/ColorPicker'
import ImageUpload from '../components/ImageUpload/ImageUpload'
import { Save, RotateCcw, Palette, Type, Image as ImageIcon, Settings } from 'lucide-react'

const ThemeManagement = () => {
  const { theme, updateTheme, resetTheme, uploadImage } = useTheme()
  const [activeTab, setActiveTab] = useState('colors')
  const [localChanges, setLocalChanges] = useState({})

  const tabs = [
    { id: 'colors', label: '颜色设置', icon: Palette },
    { id: 'text', label: '文本设置', icon: Type },
    { id: 'images', label: '图片设置', icon: ImageIcon },
    { id: 'site', label: '站点设置', icon: Settings }
  ]

  const handleLocalChange = (key, value) => {
    setLocalChanges(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    updateTheme(localChanges)
    setLocalChanges({})
    alert('主题设置已保存！')
  }

  const handleReset = () => {
    if (confirm('确定要重置为默认主题吗？')) {
      resetTheme()
      setLocalChanges({})
      alert('主题已重置为默认设置！')
    }
  }

  const handleImageUpload = async (file, type) => {
    try {
      await uploadImage(file, type)
      alert('图片上传成功！')
    } catch (error) {
      throw error
    }
  }

  const handleImageRemove = (type) => {
    if (type === 'background') {
      updateTheme({ backgroundImage: null })
    } else if (type === 'logo') {
      updateTheme({ logoUrl: null })
    }
  }

  const getCurrentValue = (key) => {
    return localChanges[key] !== undefined ? localChanges[key] : theme[key]
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-orange to-orange-500 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">主题管理</h1>
            <p className="text-orange-100 mt-1">自定义网站外观和品牌设置</p>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <div className="flex space-x-0">
              {tabs.map((tab) => {
                const IconComponent = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'border-b-2 border-primary-orange text-primary-orange bg-orange-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent size={18} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'colors' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">背景颜色</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ColorPicker
                      label="主背景色"
                      value={getCurrentValue('backgroundColor')}
                      onChange={(color) => handleLocalChange('backgroundColor', color)}
                    />
                    <ColorPicker
                      label="页脚背景色"
                      value={getCurrentValue('footerBackgroundColor')}
                      onChange={(color) => handleLocalChange('footerBackgroundColor', color)}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">卡片颜色</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ColorPicker
                      label="卡片背景色"
                      value={getCurrentValue('cardBackgroundColor')}
                      onChange={(color) => handleLocalChange('cardBackgroundColor', color)}
                    />
                    <ColorPicker
                      label="卡片边框色"
                      value={getCurrentValue('cardBorderColor')}
                      onChange={(color) => handleLocalChange('cardBorderColor', color)}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">文本颜色</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ColorPicker
                      label="主要文本色"
                      value={getCurrentValue('primaryTextColor')}
                      onChange={(color) => handleLocalChange('primaryTextColor', color)}
                    />
                    <ColorPicker
                      label="次要文本色"
                      value={getCurrentValue('secondaryTextColor')}
                      onChange={(color) => handleLocalChange('secondaryTextColor', color)}
                    />
                    <ColorPicker
                      label="标题文本色"
                      value={getCurrentValue('titleTextColor')}
                      onChange={(color) => handleLocalChange('titleTextColor', color)}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'text' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">品牌文本</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        网站名称
                      </label>
                      <input
                        type="text"
                        value={getCurrentValue('siteName')}
                        onChange={(e) => handleLocalChange('siteName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-primary-orange focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        网站副标题
                      </label>
                      <input
                        type="text"
                        value={getCurrentValue('siteSubtitle')}
                        onChange={(e) => handleLocalChange('siteSubtitle', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-primary-orange focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      网站描述
                    </label>
                    <textarea
                      value={getCurrentValue('siteDescription')}
                      onChange={(e) => handleLocalChange('siteDescription', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-primary-orange focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">页脚设置</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        版权信息
                      </label>
                      <input
                        type="text"
                        value={getCurrentValue('footerCopyright')}
                        onChange={(e) => handleLocalChange('footerCopyright', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-primary-orange focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          联系邮箱
                        </label>
                        <input
                          type="email"
                          value={getCurrentValue('footerContact')?.email || ''}
                          onChange={(e) => handleLocalChange('footerContact', {
                            ...getCurrentValue('footerContact'),
                            email: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-primary-orange focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          GitHub 链接
                        </label>
                        <input
                          type="url"
                          value={getCurrentValue('footerContact')?.github || ''}
                          onChange={(e) => handleLocalChange('footerContact', {
                            ...getCurrentValue('footerContact'),
                            github: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-primary-orange focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'images' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Logo设置</h3>
                  <ImageUpload
                    label="网站Logo"
                    currentImage={theme.logoUrl}
                    onImageUpload={(file) => handleImageUpload(file, 'logo')}
                    onRemoveImage={() => handleImageRemove('logo')}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">背景图片</h3>
                  <ImageUpload
                    label="背景图片"
                    currentImage={theme.backgroundImage}
                    onImageUpload={(file) => handleImageUpload(file, 'background')}
                    onRemoveImage={() => handleImageRemove('background')}
                  />
                  {theme.backgroundImage && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        背景显示方式
                      </label>
                      <select
                        value={getCurrentValue('backgroundSize') || 'cover'}
                        onChange={(e) => handleLocalChange('backgroundSize', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-primary-orange focus:outline-none"
                      >
                        <option value="cover">覆盖 (Cover)</option>
                        <option value="contain">包含 (Contain)</option>
                        <option value="repeat">重复 (Repeat)</option>
                        <option value="no-repeat">不重复 (No Repeat)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'site' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">预览效果</h3>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div 
                      className="h-32 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: getCurrentValue('backgroundColor'),
                        backgroundImage: theme.backgroundImage ? `url(${theme.backgroundImage})` : 'none',
                        backgroundSize: getCurrentValue('backgroundSize') || 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          {theme.logoUrl && (
                            <img 
                              src={theme.logoUrl} 
                              alt="Logo" 
                              className="w-8 h-8 rounded"
                            />
                          )}
                          <h2 
                            className="text-xl font-bold"
                            style={{ color: getCurrentValue('titleTextColor') }}
                          >
                            {getCurrentValue('siteName')}
                          </h2>
                        </div>
                        <p 
                          className="text-sm"
                          style={{ color: getCurrentValue('primaryTextColor') }}
                        >
                          {getCurrentValue('siteSubtitle')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <RotateCcw size={18} />
              <span>重置为默认</span>
            </button>

            <div className="flex items-center space-x-3">
              {Object.keys(localChanges).length > 0 && (
                <span className="text-sm text-orange-600">
                  有 {Object.keys(localChanges).length} 项未保存的更改
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={Object.keys(localChanges).length === 0}
                className="flex items-center space-x-2 px-6 py-2 bg-primary-orange hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Save size={18} />
                <span>保存设置</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThemeManagement
