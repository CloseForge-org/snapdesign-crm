'use client'

import { useState } from 'react'
import type { Activity } from '@/lib/types'
import { supabase } from '@/lib/supabase'

const ACTIVITY_TYPES = [
  { value: 'note', label: '📝 備註', color: '#6b7280' },
  { value: 'call', label: '📞 通話', color: '#3b82f6' },
  { value: 'line_message', label: '💬 LINE', color: '#22c55e' },
  { value: 'site_visit', label: '🏠 現勘', color: '#f97316' },
  { value: 'email', label: '📧 Email', color: '#8b5cf6' },
  { value: 'design', label: '✏️ 出圖', color: '#e8734a' },
  { value: 'quote', label: '💰 報價', color: '#eab308' },
  { value: 'contract', label: '📋 簽約', color: '#ef4444' },
  { value: 'other', label: '🔹 其他', color: '#9ca3af' },
]

const getActivityType = (type: string) => ACTIVITY_TYPES.find(t => t.value === type) || ACTIVITY_TYPES[0]

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const mins = Math.floor(diff / (1000 * 60))

  if (mins < 1) return '剛才'
  if (mins < 60) return `${mins} 分鐘前`
  if (hours < 24) return `${hours} 小時前`
  if (days < 7) return `${days} 天前`
  return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}

interface ActivityTimelineProps {
  activities: Activity[]
  customerId: string
  onRefresh: () => void
}

export default function ActivityTimeline({ activities, customerId, onRefresh }: ActivityTimelineProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [activityType, setActivityType] = useState('note')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) return
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('activity_log').insert({
        customer_id: customerId,
        activity_type: activityType,
        content: content.trim(),
        created_by: user?.id,
      })
      if (!error) {
        setContent('')
        setActivityType('note')
        setShowAddForm(false)
        onRefresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* Add Activity Button */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-orange-50 border-2 border-dashed border-[#e8734a] rounded-xl text-[#e8734a] font-medium mb-4 min-h-[44px] active:bg-orange-100 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新增記錄
        </button>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="card mb-4 border border-orange-100">
          <div className="mb-3">
            <label className="label">類型</label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setActivityType(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${
                    activityType === t.value
                      ? 'bg-[#e8734a] text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <label className="label">內容</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="記錄通話內容、備註..."
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {submitting ? '儲存中...' : '儲存'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setContent('') }}
              className="btn-ghost px-4"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {activities.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 opacity-40">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p className="text-sm">尚無活動記錄</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100" />
          <div className="space-y-4">
            {activities.map((activity) => {
              const type = getActivityType(activity.activity_type)
              return (
                <div key={activity.id} className="flex gap-4 relative">
                  {/* Dot */}
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-base z-10"
                    style={{ backgroundColor: type.color + '20', border: `2px solid ${type.color}` }}
                  >
                    <span>{type.label.split(' ')[0]}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold" style={{ color: type.color }}>
                        {type.label.split(' ')[1]}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(activity.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{activity.content}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
