'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export interface ExtractedData {
  address?: string
  district?: string
  monthly_rent?: number
  size_ping?: number
  unit_floor?: number
  total_floors?: number
  room_layout?: string
  building_type?: string
  building_age?: number
  contact_name?: string
  contact_phone?: string
  current_condition?: string
  notes?: string
  fieldCount?: number
  error?: string
}

interface ScreenshotExtractorProps {
  onExtracted: (data: ExtractedData) => void
  onFieldsFilled?: (count: number) => void
}

export default function ScreenshotExtractor({ onExtracted, onFieldsFilled }: ScreenshotExtractorProps) {
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('只接受圖片檔案（jpg, png, webp）')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('圖片大小不能超過 10MB')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const fd = new FormData()
      fd.append('image', file)

      const res = await fetch('/api/extract-screenshot', {
        method: 'POST',
        body: fd,
      })
      const data: ExtractedData = await res.json()

      if (data.error && !data.fieldCount) {
        setError(data.error)
        return
      }

      onExtracted(data)
      const count = data.fieldCount || 0
      if (count > 0) {
        setSuccess(`已從截圖自動填入 ${count} 個欄位`)
        onFieldsFilled?.(count)
      } else {
        setError('無法辨識截圖內容，請手動輸入')
      }
    } catch {
      setError('無法辨識截圖內容，請手動輸入')
    } finally {
      setLoading(false)
    }
  }, [onExtracted, onFieldsFilled])

  // Clipboard paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Only trigger if not in a text input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) processFile(file)
          break
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [processFile])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset so same file can be re-selected
    e.target.value = ''
  }

  const handleClear = () => {
    setPreview(null)
    setSuccess('')
    setError('')
  }

  return (
    <div className="card border-2 border-[#f0a848]/30 bg-amber-50/30">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        {/* Camera icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f0a848" strokeWidth="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        📸 從截圖擷取（選填）
      </h3>

      {/* Drop zone */}
      <div
        ref={dropZoneRef}
        onClick={() => !preview && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
          ${dragging
            ? 'border-[#f0a848] bg-amber-50 scale-[1.01]'
            : 'border-[#f0a848]/40 hover:border-[#f0a848]/80 hover:bg-amber-50/50'
          }
          ${preview ? 'p-0 overflow-hidden' : 'p-6'}
        `}
      >
        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="截圖預覽"
              className="w-full max-h-48 object-contain rounded-xl bg-gray-50"
            />
            {/* Overlay while loading */}
            {loading && (
              <div className="absolute inset-0 bg-black/40 rounded-xl flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-white text-sm font-medium">AI 分析中...</span>
              </div>
            )}
            {/* Clear button */}
            {!loading && (
              <button
                onClick={e => { e.stopPropagation(); handleClear() }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/70"
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center select-none">
            {loading ? (
              <>
                <div className="w-10 h-10 border-3 border-[#f0a848] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-500 font-medium">AI 分析中...</span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f0a848" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">點擊上傳、拖放圖片、或直接貼上截圖</p>
                  <p className="text-xs text-gray-400 mt-0.5">支援 JPG、PNG、WebP，最大 10MB</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Status messages */}
      {success && (
        <div className="mt-2.5 text-sm text-green-600 font-medium flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {success}
        </div>
      )}
      {error && (
        <div className="mt-2.5 text-sm text-red-500 flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {!preview && !loading && (
        <p className="text-xs text-gray-400 mt-2">
          上傳 Facebook Marketplace、LINE 對話、或任何房屋截圖，AI 自動辨識填入欄位
        </p>
      )}
    </div>
  )
}
