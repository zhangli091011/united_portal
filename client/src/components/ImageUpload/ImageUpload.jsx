import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

const ImageUpload = ({ label, currentImage, onImageUpload, onRemoveImage, accept = "image/*", className = "" }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragIn = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragOut = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = (e) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFileUpload(files[0])
    }
  }

  const handleFileUpload = async (file) => {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('图片文件不能超过5MB')
      return
    }

    setIsUploading(true)
    try {
      await onImageUpload(file)
    } catch (error) {
      console.error('上传失败:', error)
      alert('图片上传失败，请重试')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      {currentImage ? (
        <div className="relative">
          <img 
            src={currentImage} 
            alt="Current" 
            className="w-full h-32 object-cover rounded-lg border border-gray-300"
          />
          <button
            type="button"
            onClick={onRemoveImage}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging 
              ? 'border-primary-orange bg-orange-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="space-y-2">
              <div className="animate-spin mx-auto w-8 h-8 border-2 border-primary-orange border-t-transparent rounded-full"></div>
              <p className="text-sm text-gray-500">上传中...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <ImageIcon className="mx-auto text-gray-400" size={32} />
              <p className="text-sm text-gray-500">
                拖拽图片到此处或{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary-orange hover:text-orange-600 underline"
                >
                  点击选择
                </button>
              </p>
              <p className="text-xs text-gray-400">
                支持 JPG、PNG、GIF 格式，最大 5MB
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {currentImage && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <Upload size={16} />
          <span>更换图片</span>
        </button>
      )}
    </div>
  )
}

export default ImageUpload
