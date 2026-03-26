'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  LEAD_SOURCES, BUILDING_TYPES, BUDGET_RANGES, DISTRICTS,
  SCOPE_OPTIONS, STYLE_OPTIONS, TIMELINE_OPTIONS, CONDITIONS,
  OWNERSHIP_TYPES, ELIGIBILITY_REASONS, STAGES
} from '@/lib/stages'

interface FormData {
  // Step 1: Basic Info
  name: string
  preferred_title: string
  phone: string
  line_id: string
  email: string
  lead_source: string
  referral_from: string
  listing_url: string
  // Step 2: Property Info
  address: string
  district: string
  building_type: string
  unit_floor: string
  total_floors: string
  building_age: string
  size_ping: string
  room_layout: string
  current_condition: string
  ownership: string
  // Step 3: Project Info
  budget_range: string
  scope: string[]
  style_preference: string
  timeline: string
  special_needs: string
  // Step 4: Subsidy
  subsidy_eligible: string
  eligibility_reasons: string[]
  loan_subsidy_eligible: boolean
  subsidy_notes: string
}

const STEPS = ['基本資料', '房屋資料', '裝修需求', '補助評估']
const TITLE_OPTIONS = ['先生', '小姐', '女士', '老師', '醫師', '律師', '']

const initialForm: FormData = {
  name: '', preferred_title: '', phone: '', line_id: '', email: '',
  lead_source: '', referral_from: '', listing_url: '',
  address: '', district: '', building_type: '', unit_floor: '', total_floors: '',
  building_age: '', size_ping: '', room_layout: '', current_condition: '', ownership: '',
  budget_range: '', scope: [], style_preference: '', timeline: '', special_needs: '',
  subsidy_eligible: '', eligibility_reasons: [], loan_subsidy_eligible: false, subsidy_notes: '',
}

export default function NewCustomerPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const updateForm = (field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const toggleArrayValue = (field: 'scope' | 'eligibility_reasons', value: string) => {
    setForm(prev => {
      const arr = prev[field] as string[]
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      }
    })
  }

  // Auto-suggest subsidy eligibility based on building age
  const autoSuggestSubsidy = () => {
    const age = parseInt(form.building_age)
    if (!isNaN(age)) {
      const reasons: string[] = []
      if (age >= 30) {
        reasons.push('age_30plus')
        updateForm('subsidy_eligible', 'eligible')
      }
      updateForm('eligibility_reasons', reasons)
    }
  }

  const canProceed = () => {
    if (step === 0) return form.name && form.phone && form.line_id && form.lead_source
    if (step === 1) return form.address && form.building_type && form.building_age
    if (step === 2) return form.budget_range
    return true
  }

  const handleNext = () => {
    if (step === 2) autoSuggestSubsidy()
    if (step < 3) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const payload = {
        name: form.name,
        preferred_title: form.preferred_title || null,
        phone: form.phone,
        line_id: form.line_id,
        email: form.email || null,
        lead_source: form.lead_source,
        referral_from: form.referral_from || null,
        listing_url: form.listing_url || null,
        address: form.address,
        district: form.district || null,
        building_type: form.building_type,
        unit_floor: form.unit_floor ? parseInt(form.unit_floor) : null,
        total_floors: form.total_floors ? parseInt(form.total_floors) : null,
        building_age: parseInt(form.building_age) || 0,
        size_ping: form.size_ping ? parseFloat(form.size_ping) : null,
        room_layout: form.room_layout || null,
        current_condition: form.current_condition || null,
        ownership: form.ownership || null,
        budget_range: form.budget_range,
        scope: form.scope.length > 0 ? form.scope : null,
        style_preference: form.style_preference || null,
        timeline: form.timeline || null,
        special_needs: form.special_needs || null,
        subsidy_eligible: form.subsidy_eligible || null,
        eligibility_reasons: form.eligibility_reasons.length > 0 ? form.eligibility_reasons : null,
        loan_subsidy_eligible: form.loan_subsidy_eligible,
        subsidy_notes: form.subsidy_notes || null,
        current_stage: 'new_inquiry',
        assigned_to: user?.id || null,
      }

      const { data, error: insertError } = await supabase
        .from('customers')
        .insert(payload)
        .select('id')
        .single()

      if (insertError) throw insertError

      // Log initial stage history
      await supabase.from('stage_history').insert({
        customer_id: data.id,
        from_stage: 'new_inquiry',
        to_stage: 'new_inquiry',
        changed_by: user?.id,
        notes: '新客戶建立',
      })

      router.push(`/customers/${data.id}`)
    } catch (err: any) {
      setError(err.message || '儲存失敗，請再試一次')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf7f4]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#faf7f4] px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">新增客戶</h1>
            <p className="text-sm text-gray-500">步驟 {step + 1} / {STEPS.length}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ backgroundColor: i <= step ? '#e8734a' : '#e5e7eb' }}
              />
              <div className={`text-xs mt-1 text-center font-medium ${i === step ? 'text-[#e8734a]' : 'text-gray-300'}`}>
                {s}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="page-container pt-2 pb-32">
        {/* Step 1: Basic Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">基本資料</h3>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="col-span-2">
                  <label className="label">姓名 <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => updateForm('name', e.target.value)}
                    className="input-field"
                    placeholder="王小明"
                  />
                </div>
                <div>
                  <label className="label">稱謂</label>
                  <select
                    value={form.preferred_title}
                    onChange={e => updateForm('preferred_title', e.target.value)}
                    className="input-field"
                  >
                    <option value="">無</option>
                    {TITLE_OPTIONS.filter(Boolean).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="label">電話 <span className="text-red-400">*</span></label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => updateForm('phone', e.target.value)}
                  className="input-field"
                  placeholder="0912-345-678"
                  inputMode="tel"
                />
              </div>

              <div className="mb-4">
                <label className="label">LINE ID <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.line_id}
                  onChange={e => updateForm('line_id', e.target.value)}
                  className="input-field"
                  placeholder="line_id"
                />
              </div>

              <div className="mb-4">
                <label className="label">電子郵件</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => updateForm('email', e.target.value)}
                  className="input-field"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">來源資訊</h3>

              <div className="mb-4">
                <label className="label">來源管道 <span className="text-red-400">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {LEAD_SOURCES.map(src => (
                    <button
                      key={src.value}
                      onClick={() => updateForm('lead_source', src.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium min-h-[44px] transition-colors ${
                        form.lead_source === src.value
                          ? 'bg-[#e8734a] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.lead_source === 'referral' && (
                <div className="mb-4">
                  <label className="label">推薦人姓名</label>
                  <input
                    type="text"
                    value={form.referral_from}
                    onChange={e => updateForm('referral_from', e.target.value)}
                    className="input-field"
                    placeholder="推薦人姓名"
                  />
                </div>
              )}

              {form.lead_source === '591' && (
                <div className="mb-4">
                  <label className="label">591 頁面連結</label>
                  <input
                    type="url"
                    value={form.listing_url}
                    onChange={e => updateForm('listing_url', e.target.value)}
                    className="input-field"
                    placeholder="https://sale.591.com.tw/..."
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Property Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">地址資訊</h3>

              <div className="mb-4">
                <label className="label">地址 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => updateForm('address', e.target.value)}
                  className="input-field"
                  placeholder="台北市大安區..."
                />
              </div>

              <div className="mb-4">
                <label className="label">行政區</label>
                <select
                  value={form.district}
                  onChange={e => updateForm('district', e.target.value)}
                  className="input-field"
                >
                  <option value="">請選擇</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">建物資訊</h3>

              <div className="mb-4">
                <label className="label">建物類型 <span className="text-red-400">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {BUILDING_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => updateForm('building_type', t.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium min-h-[44px] transition-colors ${
                        form.building_type === t.value ? 'bg-[#e8734a] text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="label">所在樓層</label>
                  <input
                    type="number"
                    value={form.unit_floor}
                    onChange={e => updateForm('unit_floor', e.target.value)}
                    className="input-field"
                    placeholder="例：3"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="label">總樓層</label>
                  <input
                    type="number"
                    value={form.total_floors}
                    onChange={e => updateForm('total_floors', e.target.value)}
                    className="input-field"
                    placeholder="例：6"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="label">屋齡（年）<span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    value={form.building_age}
                    onChange={e => updateForm('building_age', e.target.value)}
                    className="input-field"
                    placeholder="例：35"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="label">坪數</label>
                  <input
                    type="number"
                    value={form.size_ping}
                    onChange={e => updateForm('size_ping', e.target.value)}
                    className="input-field"
                    placeholder="例：28.5"
                    inputMode="decimal"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="label">格局</label>
                <input
                  type="text"
                  value={form.room_layout}
                  onChange={e => updateForm('room_layout', e.target.value)}
                  className="input-field"
                  placeholder="例：3房2廳1衛"
                />
              </div>

              <div className="mb-4">
                <label className="label">現況</label>
                <div className="flex flex-wrap gap-2">
                  {CONDITIONS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => updateForm('current_condition', c.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium min-h-[44px] transition-colors ${
                        form.current_condition === c.value ? 'bg-[#e8734a] text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-2">
                <label className="label">所有權</label>
                <div className="flex flex-wrap gap-2">
                  {OWNERSHIP_TYPES.map(o => (
                    <button
                      key={o.value}
                      onClick={() => updateForm('ownership', o.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium min-h-[44px] transition-colors ${
                        form.ownership === o.value ? 'bg-[#e8734a] text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Project Info */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">裝修預算</h3>

              <div className="mb-2">
                <label className="label">預算範圍 <span className="text-red-400">*</span></label>
                <div className="space-y-2">
                  {BUDGET_RANGES.map(b => (
                    <button
                      key={b.value}
                      onClick={() => updateForm('budget_range', b.value)}
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium min-h-[44px] transition-colors text-left ${
                        form.budget_range === b.value
                          ? 'bg-[#e8734a] text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">裝修範圍</h3>
              <div className="flex flex-wrap gap-2">
                {SCOPE_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => toggleArrayValue('scope', s.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium min-h-[44px] transition-colors ${
                      form.scope.includes(s.value) ? 'bg-[#e8734a] text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">風格偏好</h3>
              <div className="flex flex-wrap gap-2">
                {STYLE_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => updateForm('style_preference', form.style_preference === s.value ? '' : s.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium min-h-[44px] transition-colors ${
                      form.style_preference === s.value ? 'bg-[#e8734a] text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">施工時程</h3>
              <div className="flex flex-wrap gap-2">
                {TIMELINE_OPTIONS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => updateForm('timeline', form.timeline === t.value ? '' : t.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium min-h-[44px] transition-colors ${
                      form.timeline === t.value ? 'bg-[#e8734a] text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <label className="label">特殊需求 / 備註</label>
              <textarea
                value={form.special_needs}
                onChange={e => updateForm('special_needs', e.target.value)}
                className="input-field resize-none"
                rows={3}
                placeholder="無障礙設施、長輩同住、寵物友善等..."
              />
            </div>
          </div>
        )}

        {/* Step 4: Subsidy Check */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Auto-suggest hint */}
            {parseInt(form.building_age) >= 30 && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <div className="font-semibold text-green-700">可能符合補助資格</div>
                    <p className="text-sm text-green-600 mt-1">
                      屋齡 {form.building_age} 年，達30年門檻，可能符合都更危老補助申請條件。
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">補助資格評估</h3>

              <div className="mb-4">
                <label className="label">補助資格狀態</label>
                <div className="space-y-2">
                  {[
                    { value: 'eligible', label: '✅ 符合資格', color: '#22c55e' },
                    { value: 'not_eligible', label: '❌ 不符合', color: '#ef4444' },
                    { value: 'pending', label: '🔍 待確認', color: '#f59e0b' },
                    { value: '', label: '暫不評估', color: '#9ca3af' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateForm('subsidy_eligible', opt.value)}
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium text-left min-h-[44px] transition-colors ${
                        form.subsidy_eligible === opt.value
                          ? 'bg-[#e8734a] text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.subsidy_eligible === 'eligible' && (
                <div className="mb-4">
                  <label className="label">符合原因（可多選）</label>
                  <div className="flex flex-wrap gap-2">
                    {ELIGIBILITY_REASONS.map(r => (
                      <button
                        key={r.value}
                        onClick={() => toggleArrayValue('eligibility_reasons', r.value)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium min-h-[44px] transition-colors ${
                          form.eligibility_reasons.includes(r.value)
                            ? 'bg-[#e8734a] text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                  <div
                    onClick={() => updateForm('loan_subsidy_eligible', !form.loan_subsidy_eligible)}
                    className={`w-12 h-7 rounded-full transition-colors relative ${
                      form.loan_subsidy_eligible ? 'bg-[#e8734a]' : 'bg-gray-200'
                    }`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      form.loan_subsidy_eligible ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </div>
                  <span className="text-sm text-gray-700">修繕住宅貸款利息補貼</span>
                </label>
              </div>

              <div>
                <label className="label">補助備註</label>
                <textarea
                  value={form.subsidy_notes}
                  onChange={e => updateForm('subsidy_notes', e.target.value)}
                  className="input-field resize-none"
                  rows={3}
                  placeholder="補充說明..."
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 pb-safe-bottom">
        <div className="max-w-2xl mx-auto flex gap-3">
          {step > 0 && (
            <button onClick={handleBack} className="btn-ghost flex-1 border border-gray-200">
              上一步
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              下一步
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {submitting ? '儲存中...' : '✅ 建立客戶'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
