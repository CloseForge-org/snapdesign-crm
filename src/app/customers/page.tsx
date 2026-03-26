'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { getStageLabel, STAGES, STAGE_GROUPS, DISTRICTS, BUDGET_RANGES } from '@/lib/stages'
import type { Customer } from '@/lib/types'

type SortOption = 'newest' | 'followup' | 'updated'

const SORT_OPTIONS = [
  { value: 'newest', label: '最新建立' },
  { value: 'updated', label: '最近更新' },
  { value: 'followup', label: '追蹤日期' },
]

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')
  const [budgetFilter, setBudgetFilter] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    checkAuth()
    loadCustomers()
  }, [sortBy])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/login')
  }

  const loadCustomers = async () => {
    setLoading(true)
    let query = supabase.from('customers').select('*')

    if (sortBy === 'newest') query = query.order('created_at', { ascending: false })
    else if (sortBy === 'updated') query = query.order('updated_at', { ascending: false })
    else if (sortBy === 'followup') query = query.order('next_followup', { ascending: true, nullsFirst: false })

    const { data } = await query
    setCustomers(data || [])
    setLoading(false)
  }

  const filteredCustomers = customers.filter(c => {
    if (search) {
      const q = search.toLowerCase()
      if (
        !c.name.toLowerCase().includes(q) &&
        !c.phone.includes(q) &&
        !c.line_id.toLowerCase().includes(q) &&
        !(c.district || '').toLowerCase().includes(q) &&
        !c.address.toLowerCase().includes(q)
      ) return false
    }
    if (stageFilter && c.current_stage !== stageFilter) return false
    if (districtFilter && c.district !== districtFilter) return false
    if (budgetFilter && c.budget_range !== budgetFilter) return false
    return true
  })

  const activeFilterCount = [stageFilter, districtFilter, budgetFilter].filter(Boolean).length

  const getStageColor = (code: string) => STAGES.find(s => s.code === code)?.color || '#9ca3af'

  const formatFollowup = (date?: string) => {
    if (!date) return null
    const d = new Date(date)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diff = d.getTime() - now.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days < 0) return { label: `逾期 ${Math.abs(days)} 天`, urgent: true }
    if (days === 0) return { label: '今天', urgent: true }
    if (days === 1) return { label: '明天', urgent: false }
    return { label: `${days} 天後`, urgent: false }
  }

  return (
    <div className="min-h-screen bg-[#faf7f4]">
      {/* Header */}
      <div className="page-header px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">客戶列表</h1>
          <span className="text-sm text-gray-500">{filteredCustomers.length} / {customers.length}</span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="absolute left-3.5 top-1/2 -translate-y-1/2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 pr-4"
            placeholder="搜尋姓名、電話、LINE ID..."
          />
        </div>

        {/* Filter + Sort Row */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium min-h-[40px] transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-[#e8734a] text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            篩選
            {activeFilterCount > 0 && (
              <span className="bg-white text-[#e8734a] text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 min-h-[40px]"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Filters Expanded */}
        {showFilters && (
          <div className="mt-3 space-y-2.5 pb-2">
            <div>
              <label className="label text-xs">階段</label>
              <select
                value={stageFilter}
                onChange={e => setStageFilter(e.target.value)}
                className="input-field py-2 text-sm"
              >
                <option value="">全部階段</option>
                {STAGE_GROUPS.map(group => (
                  <optgroup key={group.key} label={group.label}>
                    {STAGES.filter(s => s.group === group.key).map(stage => (
                      <option key={stage.code} value={stage.code}>{stage.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label text-xs">行政區</label>
                <select
                  value={districtFilter}
                  onChange={e => setDistrictFilter(e.target.value)}
                  className="input-field py-2 text-sm"
                >
                  <option value="">全部地區</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-xs">預算</label>
                <select
                  value={budgetFilter}
                  onChange={e => setBudgetFilter(e.target.value)}
                  className="input-field py-2 text-sm"
                >
                  <option value="">全部預算</option>
                  {BUDGET_RANGES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setStageFilter(''); setDistrictFilter(''); setBudgetFilter('') }}
                className="text-sm text-[#e8734a] font-medium"
              >
                清除篩選
              </button>
            )}
          </div>
        )}
      </div>

      {/* Customer List */}
      <div className="page-container pt-2">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="card">
                <div className="skeleton h-4 w-24 mb-2 rounded" />
                <div className="skeleton h-3 w-40 mb-1 rounded" />
                <div className="skeleton h-3 w-32 rounded" />
              </div>
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-500 mb-2">
              {search || activeFilterCount > 0 ? '找不到符合的客戶' : '尚無客戶資料'}
            </p>
            <Link href="/customers/new" className="btn-primary mt-4 inline-flex">新增客戶</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCustomers.map(customer => {
              const followup = formatFollowup(customer.next_followup)
              const stageColor = getStageColor(customer.current_stage)
              return (
                <Link
                  key={customer.id}
                  href={`/customers/${customer.id}`}
                  className="card flex items-center gap-3 active:bg-gray-50 transition-colors"
                >
                  {/* Stage Color Indicator */}
                  <div
                    className="w-1 h-14 rounded-full flex-shrink-0 self-stretch"
                    style={{ backgroundColor: stageColor }}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-gray-900 truncate">{customer.name}</span>
                        {customer.preferred_title && (
                          <span className="text-gray-400 text-sm flex-shrink-0">{customer.preferred_title}</span>
                        )}
                      </div>
                      {followup && (
                        <span className={`text-xs font-medium flex-shrink-0 ${followup.urgent ? 'text-red-500' : 'text-gray-400'}`}>
                          📅 {followup.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: stageColor + '15', color: stageColor }}
                      >
                        {getStageLabel(customer.current_stage)}
                      </span>
                      {customer.district && (
                        <span className="text-xs text-gray-400">📍 {customer.district}</span>
                      )}
                      <span className="text-xs text-gray-400">{customer.phone}</span>
                    </div>
                  </div>

                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
