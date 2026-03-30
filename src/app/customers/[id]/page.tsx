'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import StageSelector from '@/components/StageSelector'
import ActivityTimeline from '@/components/ActivityTimeline'
import PaymentLog from '@/components/PaymentLog'
import NewProjectForm from '@/components/NewProjectForm'
import ScreenshotExtractor, { type ExtractedData } from '@/components/ScreenshotExtractor'
import {
  getStageLabel, STAGES, LEAD_SOURCES, BUILDING_TYPES, BUDGET_RANGES,
  DISTRICTS, SCOPE_OPTIONS, STYLE_OPTIONS, TIMELINE_OPTIONS,
  CONDITIONS, OWNERSHIP_TYPES, LOST_REASONS, SUBSIDY_STATUS, ELIGIBILITY_REASONS
} from '@/lib/stages'
import type { Customer, Activity, Payment, StageHistory, Project } from '@/lib/types'

type TabType = 'info' | 'activity' | 'payments' | 'history' | 'projects'

// Stages where project management is relevant
const PROJECT_ELIGIBLE_STAGES = [
  'contract_signed', 'collecting_consent', 'structural_assessment',
  'subsidy_submitted', 'subsidy_approved', 'pre_construction',
  'under_construction', 'inspection', 'completed',
  'subsidy_reimbursement', 'followup', 'referral_generated',
]

const PROJECT_STATUS_LABELS: Record<string, string> = {
  planning: '規劃中',
  in_progress: '施工中',
  paused: '暫停',
  completed: '已完工',
  cancelled: '已取消',
}

const PROJECT_STATUS_COLORS: Record<string, string> = {
  planning: '#3b82f6',
  in_progress: '#e8734a',
  paused: '#f0a848',
  completed: '#22c55e',
  cancelled: '#6b7280',
}

const TABS: { key: TabType; label: string }[] = [
  { key: 'info', label: '資料' },
  { key: 'activity', label: '活動' },
  { key: 'payments', label: '款項' },
  { key: 'history', label: '歷程' },
  { key: 'projects', label: '專案' },
]

const formatNTD = (n?: number | null) =>
  n ? `NT$ ${n.toLocaleString('zh-TW')}` : '—'

const formatDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('zh-TW', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [stageHistory, setStageHistory] = useState<StageHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('info')
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Customer>>({})
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [showNewProject, setShowNewProject] = useState(false)
  const [urlExtractLoading, setUrlExtractLoading] = useState(false)
  const [urlExtractError, setUrlExtractError] = useState('')
  const [urlExtractSuccess, setUrlExtractSuccess] = useState('')
  const [showUrlExtractOffer, setShowUrlExtractOffer] = useState(false)
  const [pendingExtractUrl, setPendingExtractUrl] = useState('')
  const urlExtractDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyExtractedToEdit = useCallback(async (url: string) => {
    if (!url.trim().startsWith('http')) return
    setUrlExtractLoading(true)
    setUrlExtractError('')
    setUrlExtractSuccess('')
    try {
      const res = await fetch('/api/extract-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()

      if (data.error && !data.address && !data.size_ping && !data.monthly_rent) {
        setUrlExtractError(data.error || '無法擷取資料')
        setShowUrlExtractOffer(false)
        return
      }

      const updates: Partial<Customer> = {}
      let filled = 0

      if (data.address) { updates.address = data.address; filled++ }
      if (data.district) { updates.district = data.district; filled++ }
      if (data.size_ping) { updates.size_ping = data.size_ping; filled++ }
      if (data.unit_floor) { updates.unit_floor = data.unit_floor; filled++ }
      if (data.total_floors) { updates.total_floors = data.total_floors; filled++ }
      if (data.room_layout) { updates.room_layout = data.room_layout; filled++ }
      if (data.building_type) { updates.building_type = data.building_type; filled++ }
      if (data.building_age) { updates.building_age = data.building_age; filled++ }

      setEditData(prev => ({ ...prev, ...updates }))
      setShowUrlExtractOffer(false)

      if (filled > 0) {
        setUrlExtractSuccess(`已自動填入 ${filled} 個欄位`)
      } else {
        setUrlExtractError('無法擷取資料，請手動輸入')
      }
    } catch {
      setUrlExtractError('擷取失敗')
      setShowUrlExtractOffer(false)
    } finally {
      setUrlExtractLoading(false)
    }
  }, [])

  const handleListingUrlChange = (val: string) => {
    updateEdit('listing_url', val)
    setUrlExtractError('')
    setUrlExtractSuccess('')
    setShowUrlExtractOffer(false)
    if (urlExtractDebounceRef.current) clearTimeout(urlExtractDebounceRef.current)
    if (val.trim().startsWith('http')) {
      setPendingExtractUrl(val.trim())
      urlExtractDebounceRef.current = setTimeout(() => {
        setShowUrlExtractOffer(true)
      }, 600)
    }
  }

  const handleScreenshotExtractedEdit = useCallback((data: ExtractedData) => {
    const updates: Partial<Customer> = {}
    if (data.address) updates.address = data.address
    if (data.district) updates.district = data.district
    if (data.size_ping != null) updates.size_ping = data.size_ping
    if (data.unit_floor != null) updates.unit_floor = data.unit_floor
    if (data.total_floors != null) updates.total_floors = data.total_floors
    if (data.room_layout) updates.room_layout = data.room_layout
    if (data.building_type) updates.building_type = data.building_type
    if (data.building_age != null) updates.building_age = data.building_age
    if (data.current_condition) updates.current_condition = data.current_condition
    setEditData(prev => ({ ...prev, ...updates }))
  }, [])

  useEffect(() => {
    checkAuth()
    loadCustomer()
  }, [id])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/login')
  }

  const loadCustomer = async () => {
    setLoading(true)
    const [customerRes, activitiesRes, paymentsRes, historyRes, projectsRes] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('activity_log').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('customer_id', id).order('payment_date', { ascending: false }),
      supabase.from('stage_history').select('*').eq('customer_id', id).order('changed_at', { ascending: false }),
      supabase.from('projects').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
    ])

    if (customerRes.data) {
      setCustomer(customerRes.data)
      setEditData(customerRes.data)
    } else {
      router.push('/customers')
    }
    setActivities(activitiesRes.data || [])
    setPayments(paymentsRes.data || [])
    setStageHistory(historyRes.data || [])
    setProjects(projectsRes.data || [])
    setLoading(false)
  }

  const handleStageChange = async (newStage: string, notes: string) => {
    if (!customer) return
    const { data: { user } } = await supabase.auth.getUser()

    await Promise.all([
      supabase.from('customers').update({ current_stage: newStage }).eq('id', id),
      supabase.from('stage_history').insert({
        customer_id: id,
        from_stage: customer.current_stage,
        to_stage: newStage,
        changed_by: user?.id,
        notes: notes || null,
      }),
    ])

    setCustomer(prev => prev ? { ...prev, current_stage: newStage } : prev)
    loadCustomer()
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('customers')
        .update(editData)
        .eq('id', id)
      if (!error) {
        setCustomer(prev => prev ? { ...prev, ...editData } : prev)
        setEditing(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    await supabase.from('customers').delete().eq('id', id)
    router.push('/customers')
  }

  const updateEdit = (field: keyof Customer, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  const toggleScopeEdit = (value: string) => {
    const current = (editData.scope || []) as string[]
    updateEdit('scope', current.includes(value) ? current.filter(v => v !== value) : [...current, value])
  }

  const toggleEligibilityEdit = (value: string) => {
    const current = (editData.eligibility_reasons || []) as string[]
    updateEdit('eligibility_reasons', current.includes(value) ? current.filter(v => v !== value) : [...current, value])
  }

  const currentStage = STAGES.find(s => s.code === customer?.current_stage)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f4] flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-[#e8734a] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!customer) return null

  return (
    <div className="min-h-screen bg-[#faf7f4]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/customers" className="p-2 -ml-2 text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 truncate">{customer.name}</h1>
              {customer.preferred_title && (
                <span className="text-gray-400 text-sm flex-shrink-0">{customer.preferred_title}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: currentStage?.color || '#999' }}
              />
              <span className="text-xs text-gray-500">{currentStage?.label}</span>
            </div>
          </div>

          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="p-2 text-[#e8734a] min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={() => { setEditing(false); setEditData(customer) }}
                className="p-2 text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-2 bg-[#e8734a] text-white rounded-xl text-sm font-medium min-h-[44px] disabled:opacity-50"
              >
                {saving ? '儲存...' : '儲存'}
              </button>
            </div>
          )}
        </div>

        {/* Stage Selector (always visible) */}
        {!editing && (
          <div className="px-4 pb-3 flex items-center gap-3">
            <StageSelector
              currentStage={customer.current_stage}
              onSelect={handleStageChange}
            />

            {/* Quick Actions */}
            <a
              href={`tel:${customer.phone}`}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 rounded-xl py-2 min-h-[44px] text-sm font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.94-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              打電話
            </a>

            <a
              href={`https://line.me/ti/p/~${customer.line_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-600 rounded-xl py-2 min-h-[44px] text-sm font-medium"
            >
              <span className="text-base">💬</span>
              LINE
            </a>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-t border-gray-100">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors min-h-[44px] ${
                activeTab === tab.key
                  ? 'text-[#e8734a] border-b-2 border-[#e8734a]'
                  : 'text-gray-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="page-container pt-4">

        {/* INFO TAB */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">基本資料</h3>
              <dl className="space-y-3">
                <InfoRow label="姓名">
                  {editing ? (
                    <input value={editData.name || ''} onChange={e => updateEdit('name', e.target.value)} className="input-field py-2" />
                  ) : customer.name}
                </InfoRow>
                <InfoRow label="稱謂">
                  {editing ? (
                    <select value={editData.preferred_title || ''} onChange={e => updateEdit('preferred_title', e.target.value)} className="input-field py-2">
                      <option value="">無</option>
                      {['先生','小姐','女士','老師','醫師','律師'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : customer.preferred_title || '—'}
                </InfoRow>
                <InfoRow label="電話">
                  {editing ? (
                    <input value={editData.phone || ''} onChange={e => updateEdit('phone', e.target.value)} className="input-field py-2" type="tel" />
                  ) : (
                    <a href={`tel:${customer.phone}`} className="text-blue-500 font-medium">{customer.phone}</a>
                  )}
                </InfoRow>
                <InfoRow label="LINE ID">
                  {editing ? (
                    <input value={editData.line_id || ''} onChange={e => updateEdit('line_id', e.target.value)} className="input-field py-2" />
                  ) : customer.line_id}
                </InfoRow>
                <InfoRow label="Email">
                  {editing ? (
                    <input value={editData.email || ''} onChange={e => updateEdit('email', e.target.value)} className="input-field py-2" type="email" />
                  ) : customer.email || '—'}
                </InfoRow>
                <InfoRow label="來源">
                  {editing ? (
                    <select value={editData.lead_source || ''} onChange={e => updateEdit('lead_source', e.target.value)} className="input-field py-2">
                      {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  ) : LEAD_SOURCES.find(s => s.value === customer.lead_source)?.label || customer.lead_source}
                </InfoRow>
                {(customer.referral_from || editing) && (
                  <InfoRow label="推薦人">
                    {editing ? (
                      <input value={editData.referral_from || ''} onChange={e => updateEdit('referral_from', e.target.value)} className="input-field py-2" placeholder="推薦人姓名" />
                    ) : customer.referral_from || '—'}
                  </InfoRow>
                )}
                <InfoRow label="房屋連結">
                  {editing ? (
                    <div>
                      <input
                        value={editData.listing_url || ''}
                        onChange={e => handleListingUrlChange(e.target.value)}
                        onPaste={e => {
                          const pasted = e.clipboardData.getData('text')
                          if (pasted.trim().startsWith('http')) {
                            setTimeout(() => {
                              updateEdit('listing_url', pasted.trim())
                              setPendingExtractUrl(pasted.trim())
                              setShowUrlExtractOffer(true)
                            }, 100)
                          }
                        }}
                        className="input-field py-2"
                        placeholder="貼上 591 或其他房屋連結..."
                        type="url"
                        autoCapitalize="none"
                      />
                      {showUrlExtractOffer && !urlExtractLoading && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => applyExtractedToEdit(pendingExtractUrl)}
                            className="text-sm px-3 py-1.5 bg-[#e8734a] text-white rounded-lg font-medium"
                          >
                            自動擷取房屋資料
                          </button>
                          <button
                            onClick={() => setShowUrlExtractOffer(false)}
                            className="text-sm text-gray-400"
                          >
                            略過
                          </button>
                        </div>
                      )}
                      {urlExtractLoading && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                          <div className="w-3.5 h-3.5 border-2 border-[#e8734a] border-t-transparent rounded-full animate-spin" />
                          擷取中...
                        </div>
                      )}
                      {urlExtractSuccess && (
                        <div className="mt-1 text-sm text-green-600 font-medium">✓ {urlExtractSuccess}</div>
                      )}
                      {urlExtractError && (
                        <div className="mt-1 text-sm text-red-500">{urlExtractError}</div>
                      )}
                    </div>
                  ) : customer.listing_url ? (
                    <a href={customer.listing_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm underline break-all">{customer.listing_url}</a>
                  ) : '—'}
                </InfoRow>
              </dl>
            </div>

            {/* Screenshot extraction — only in edit mode */}
            {editing && (
              <ScreenshotExtractor
                onExtracted={handleScreenshotExtractedEdit}
              />
            )}

            {/* Property Info */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">房屋資料</h3>
              <dl className="space-y-3">
                <InfoRow label="地址">
                  {editing ? (
                    <input value={editData.address || ''} onChange={e => updateEdit('address', e.target.value)} className="input-field py-2" />
                  ) : customer.address}
                </InfoRow>
                <InfoRow label="行政區">
                  {editing ? (
                    <select value={editData.district || ''} onChange={e => updateEdit('district', e.target.value)} className="input-field py-2">
                      <option value="">請選擇</option>
                      {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  ) : customer.district || '—'}
                </InfoRow>
                <InfoRow label="建物類型">
                  {editing ? (
                    <select value={editData.building_type || ''} onChange={e => updateEdit('building_type', e.target.value)} className="input-field py-2">
                      {BUILDING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  ) : BUILDING_TYPES.find(t => t.value === customer.building_type)?.label || customer.building_type}
                </InfoRow>
                <InfoRow label="樓層">
                  {editing ? (
                    <div className="flex gap-2">
                      <input type="number" value={editData.unit_floor || ''} onChange={e => updateEdit('unit_floor', e.target.value ? parseInt(e.target.value) : null)} className="input-field py-2 flex-1" placeholder="所在" />
                      <span className="text-gray-400 self-center">/ </span>
                      <input type="number" value={editData.total_floors || ''} onChange={e => updateEdit('total_floors', e.target.value ? parseInt(e.target.value) : null)} className="input-field py-2 flex-1" placeholder="總層" />
                    </div>
                  ) : customer.unit_floor ? `${customer.unit_floor}F / ${customer.total_floors || '?'}F` : '—'}
                </InfoRow>
                <InfoRow label="屋齡">
                  {editing ? (
                    <input type="number" value={editData.building_age || ''} onChange={e => updateEdit('building_age', parseInt(e.target.value) || 0)} className="input-field py-2" />
                  ) : `${customer.building_age} 年`}
                </InfoRow>
                <InfoRow label="坪數">
                  {editing ? (
                    <input type="number" value={editData.size_ping || ''} onChange={e => updateEdit('size_ping', e.target.value ? parseFloat(e.target.value) : null)} className="input-field py-2" />
                  ) : customer.size_ping ? `${customer.size_ping} 坪` : '—'}
                </InfoRow>
                <InfoRow label="格局">
                  {editing ? (
                    <input value={editData.room_layout || ''} onChange={e => updateEdit('room_layout', e.target.value)} className="input-field py-2" placeholder="例：3房2廳1衛" />
                  ) : customer.room_layout || '—'}
                </InfoRow>
                <InfoRow label="現況">
                  {editing ? (
                    <select value={editData.current_condition || ''} onChange={e => updateEdit('current_condition', e.target.value)} className="input-field py-2">
                      <option value="">請選擇</option>
                      {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  ) : CONDITIONS.find(c => c.value === customer.current_condition)?.label || '—'}
                </InfoRow>
              </dl>
            </div>

            {/* Project Info */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">裝修需求</h3>
              <dl className="space-y-3">
                <InfoRow label="預算">
                  {editing ? (
                    <select value={editData.budget_range || ''} onChange={e => updateEdit('budget_range', e.target.value)} className="input-field py-2">
                      {BUDGET_RANGES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                  ) : BUDGET_RANGES.find(b => b.value === customer.budget_range)?.label || customer.budget_range}
                </InfoRow>
                <InfoRow label="範圍">
                  {editing ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {SCOPE_OPTIONS.map(s => (
                        <button
                          key={s.value}
                          onClick={() => toggleScopeEdit(s.value)}
                          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                            (editData.scope || []).includes(s.value)
                              ? 'bg-[#e8734a] text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {(customer.scope || []).map(s => (
                        <span key={s} className="text-xs bg-orange-50 text-[#e8734a] px-2 py-0.5 rounded-full">
                          {SCOPE_OPTIONS.find(o => o.value === s)?.label || s}
                        </span>
                      ))}
                      {(!customer.scope || customer.scope.length === 0) && '—'}
                    </div>
                  )}
                </InfoRow>
                <InfoRow label="風格">
                  {editing ? (
                    <select value={editData.style_preference || ''} onChange={e => updateEdit('style_preference', e.target.value)} className="input-field py-2">
                      <option value="">請選擇</option>
                      {STYLE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  ) : STYLE_OPTIONS.find(s => s.value === customer.style_preference)?.label || '—'}
                </InfoRow>
                <InfoRow label="時程">
                  {editing ? (
                    <select value={editData.timeline || ''} onChange={e => updateEdit('timeline', e.target.value)} className="input-field py-2">
                      <option value="">請選擇</option>
                      {TIMELINE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  ) : TIMELINE_OPTIONS.find(t => t.value === customer.timeline)?.label || '—'}
                </InfoRow>
                {(customer.special_needs || editing) && (
                  <InfoRow label="特殊需求">
                    {editing ? (
                      <textarea value={editData.special_needs || ''} onChange={e => updateEdit('special_needs', e.target.value)} className="input-field py-2 resize-none" rows={2} />
                    ) : customer.special_needs || '—'}
                  </InfoRow>
                )}
              </dl>
            </div>

            {/* Contract Info */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">合約資訊</h3>
              <dl className="space-y-3">
                <InfoRow label="報價金額">
                  {editing ? (
                    <input type="number" value={editData.quote_amount || ''} onChange={e => updateEdit('quote_amount', e.target.value ? parseFloat(e.target.value) : null)} className="input-field py-2" placeholder="NT$" />
                  ) : formatNTD(customer.quote_amount)}
                </InfoRow>
                <InfoRow label="簽約金額">
                  {editing ? (
                    <input type="number" value={editData.contract_amount || ''} onChange={e => updateEdit('contract_amount', e.target.value ? parseFloat(e.target.value) : null)} className="input-field py-2" placeholder="NT$" />
                  ) : formatNTD(customer.contract_amount)}
                </InfoRow>
                <InfoRow label="下次追蹤">
                  {editing ? (
                    <input type="date" value={editData.next_followup || ''} onChange={e => updateEdit('next_followup', e.target.value || null)} className="input-field py-2" />
                  ) : formatDate(customer.next_followup)}
                </InfoRow>
                {(customer.google_drive_url || editing) && (
                  <InfoRow label="Google Drive">
                    {editing ? (
                      <input value={editData.google_drive_url || ''} onChange={e => updateEdit('google_drive_url', e.target.value)} className="input-field py-2" placeholder="https://drive.google.com/..." type="url" />
                    ) : (
                      customer.google_drive_url ? (
                        <a href={customer.google_drive_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline text-sm">開啟資料夾</a>
                      ) : '—'
                    )}
                  </InfoRow>
                )}
              </dl>
            </div>

            {/* Subsidy Info */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">補助資訊</h3>
              <dl className="space-y-3">
                <InfoRow label="補助資格">
                  {editing ? (
                    <select value={editData.subsidy_eligible || ''} onChange={e => updateEdit('subsidy_eligible', e.target.value)} className="input-field py-2">
                      <option value="">未評估</option>
                      {SUBSIDY_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  ) : SUBSIDY_STATUS.find(s => s.value === customer.subsidy_eligible)?.label || '未評估'}
                </InfoRow>
                {(editData.subsidy_eligible === 'eligible' || customer.subsidy_eligible === 'eligible') && (
                  <InfoRow label="符合原因">
                    {editing ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {ELIGIBILITY_REASONS.map(r => (
                          <button
                            key={r.value}
                            onClick={() => toggleEligibilityEdit(r.value)}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                              (editData.eligibility_reasons || []).includes(r.value)
                                ? 'bg-[#e8734a] text-white'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(customer.eligibility_reasons || []).map(r => (
                          <span key={r} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                            {ELIGIBILITY_REASONS.find(e => e.value === r)?.label || r}
                          </span>
                        ))}
                      </div>
                    )}
                  </InfoRow>
                )}
                <InfoRow label="修繕貸款補貼">
                  {editing ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => updateEdit('loan_subsidy_eligible', !editData.loan_subsidy_eligible)}
                        className={`w-10 h-6 rounded-full relative transition-colors ${editData.loan_subsidy_eligible ? 'bg-[#e8734a]' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editData.loan_subsidy_eligible ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                      <span className="text-sm">{editData.loan_subsidy_eligible ? '是' : '否'}</span>
                    </label>
                  ) : customer.loan_subsidy_eligible ? '✅ 是' : '否'}
                </InfoRow>
                {(customer.subsidy_notes || editing) && (
                  <InfoRow label="補助備註">
                    {editing ? (
                      <textarea value={editData.subsidy_notes || ''} onChange={e => updateEdit('subsidy_notes', e.target.value)} className="input-field py-2 resize-none" rows={2} />
                    ) : customer.subsidy_notes || '—'}
                  </InfoRow>
                )}
              </dl>
            </div>

            {/* Lost Reason (if applicable) */}
            {(customer.current_stage === 'lost' || customer.current_stage === 'on_hold') && (
              <div className="card border border-red-100">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {customer.current_stage === 'lost' ? '未成交原因' : '暫緩原因'}
                </h3>
                <dl className="space-y-3">
                  <InfoRow label="原因">
                    {editing ? (
                      <select value={editData.lost_reason || ''} onChange={e => updateEdit('lost_reason', e.target.value)} className="input-field py-2">
                        <option value="">請選擇</option>
                        {LOST_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    ) : LOST_REASONS.find(r => r.value === customer.lost_reason)?.label || '—'}
                  </InfoRow>
                  {(customer.lost_reason === 'other' || editing) && (
                    <InfoRow label="詳情">
                      {editing ? (
                        <textarea value={editData.lost_reason_other || ''} onChange={e => updateEdit('lost_reason_other', e.target.value)} className="input-field py-2 resize-none" rows={2} />
                      ) : customer.lost_reason_other || '—'}
                    </InfoRow>
                  )}
                </dl>
              </div>
            )}

            {/* Timestamps */}
            <div className="text-xs text-gray-400 text-center space-y-1 py-2">
              <p>建立：{formatDate(customer.created_at)}</p>
              <p>更新：{formatDate(customer.updated_at)}</p>
            </div>

            {/* Delete */}
            {!editing && (
              <div className="pt-2 pb-4">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-3 text-red-400 text-sm font-medium border border-red-100 rounded-xl"
                  >
                    刪除此客戶
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-red-600 text-sm font-medium mb-3 text-center">確定刪除？此操作無法復原。</p>
                    <div className="flex gap-2">
                      <button onClick={handleDelete} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium">
                        確定刪除
                      </button>
                      <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-medium">
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <ActivityTimeline
            activities={activities}
            customerId={id}
            onRefresh={loadCustomer}
          />
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <PaymentLog
            payments={payments}
            customerId={id}
            onRefresh={loadCustomer}
          />
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div>
            {stageHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 opacity-40">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <p className="text-sm">尚無階段歷程</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stageHistory.map(h => (
                  <div key={h.id} className="card">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e8734a" strokeWidth="2">
                          <polyline points="9 11 12 14 22 4" />
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-gray-500">{getStageLabel(h.from_stage)}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e8734a" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                          <span className="text-sm font-semibold text-[#e8734a]">{getStageLabel(h.to_stage)}</span>
                        </div>
                        {h.notes && (
                          <p className="text-xs text-gray-500 mt-1">{h.notes}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(h.changed_at).toLocaleDateString('zh-TW', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROJECTS TAB */}
        {activeTab === 'projects' && (
          <div>
            {/* Create project button for eligible stages */}
            {customer && PROJECT_ELIGIBLE_STAGES.includes(customer.current_stage) && (
              <button
                onClick={() => setShowNewProject(true)}
                className="w-full mb-4 py-3.5 bg-[#e8734a] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 min-h-[44px]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                建立專案
              </button>
            )}

            {projects.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm">尚無專案</p>
                {customer && !PROJECT_ELIGIBLE_STAGES.includes(customer.current_stage) && (
                  <p className="text-xs mt-2">簽約後即可建立專案</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map(project => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="card active:opacity-80 transition-opacity">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium text-gray-900 text-sm">{project.project_name}</h3>
                        <span
                          className="flex-shrink-0 px-2 py-0.5 rounded-lg text-xs font-medium"
                          style={{
                            color: PROJECT_STATUS_COLORS[project.status],
                            backgroundColor: PROJECT_STATUS_COLORS[project.status] + '20',
                          }}
                        >
                          {PROJECT_STATUS_LABELS[project.status]}
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-400">
                        {project.start_date && (
                          <span>開始 {new Date(project.start_date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}</span>
                        )}
                        {project.total_budget && (
                          <span>NT$ {Number(project.total_budget).toLocaleString('zh-TW')}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Project Form Modal */}
      {showNewProject && customer && (
        <NewProjectForm
          customer={customer}
          onClose={() => setShowNewProject(false)}
        />
      )}

      <BottomNav />
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-900">{children}</dd>
    </div>
  )
}
