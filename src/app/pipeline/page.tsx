'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { STAGE_GROUPS, STAGES, getStageLabel } from '@/lib/stages'
import type { Customer } from '@/lib/types'

const BUDGET_LABELS: Record<string, string> = {
  under_30: '30萬↓',
  '30_50': '30-50萬',
  '50_80': '50-80萬',
  '80_120': '80-120萬',
  over_120: '120萬+',
  undecided: '未定',
}

const getDaysInStage = (updatedAt: string) => {
  const diff = Date.now() - new Date(updatedAt).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default function PipelinePage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
    loadCustomers()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/login')
  }

  const loadCustomers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('customers')
      .select('*')
      .not('current_stage', 'in', '("on_hold","lost")')
      .order('updated_at', { ascending: false })
    setCustomers(data || [])
    setLoading(false)
  }

  // Group by stage group
  const groupedCustomers = STAGE_GROUPS.filter(g => g.key !== 'dead').map(group => {
    const groupStages = STAGES.filter(s => s.group === group.key).map(s => s.code)
    const groupCustomers = customers.filter(c => groupStages.includes(c.current_stage))

    const stageColumns = STAGES.filter(s => s.group === group.key).map(stage => ({
      stage,
      customers: customers.filter(c => c.current_stage === stage.code),
    })).filter(col => col.customers.length > 0 || true)

    return { group, groupCustomers, stageColumns }
  })

  const filteredGroups = selectedGroup
    ? groupedCustomers.filter(g => g.group.key === selectedGroup)
    : groupedCustomers

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f4] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[#e8734a] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf7f4]">
      {/* Header */}
      <div className="page-header px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">銷售流程</h1>
          <span className="text-sm text-gray-500">{customers.length} 筆</span>
        </div>

        {/* Group Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          <button
            onClick={() => setSelectedGroup(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] ${
              !selectedGroup ? 'bg-[#e8734a] text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            全部
          </button>
          {STAGE_GROUPS.filter(g => g.key !== 'dead').map(group => {
            const count = customers.filter(c =>
              STAGES.filter(s => s.group === group.key).map(s => s.code).includes(c.current_stage)
            ).length
            return (
              <button
                key={group.key}
                onClick={() => setSelectedGroup(selectedGroup === group.key ? null : group.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] flex items-center gap-1 ${
                  selectedGroup === group.key ? 'bg-[#e8734a] text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {group.label}
                {count > 0 && (
                  <span className={`text-xs font-bold ${selectedGroup === group.key ? 'text-white/80' : 'text-[#e8734a]'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="pb-24">
        {filteredGroups.map(({ group, stageColumns }) => (
          <div key={group.key} className="mb-6">
            {/* Group Header */}
            <div className="px-4 mb-3 flex items-center gap-2">
              <h2 className="font-semibold text-gray-800">{group.label}</h2>
              <span className="text-xs text-gray-400">
                {stageColumns.reduce((sum, col) => sum + col.customers.length, 0)} 筆
              </span>
            </div>

            {/* Stage Columns - horizontal scroll */}
            <div className="kanban-board">
              {stageColumns.map(({ stage, customers: stageCustomers }) => (
                <div key={stage.code} className="kanban-column">
                  {/* Column Header */}
                  <div
                    className="flex items-center gap-2 mb-2 px-1"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="text-sm font-medium text-gray-700">{stage.label}</span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full ml-auto"
                      style={{ backgroundColor: stage.color + '20', color: stage.color }}
                    >
                      {stageCustomers.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2.5">
                    {stageCustomers.length === 0 ? (
                      <div className="bg-white/60 rounded-xl border-2 border-dashed border-gray-200 h-20 flex items-center justify-center">
                        <span className="text-xs text-gray-300">無案件</span>
                      </div>
                    ) : (
                      stageCustomers.map(customer => (
                        <Link
                          key={customer.id}
                          href={`/customers/${customer.id}`}
                          className="block card p-3 active:scale-98 transition-transform"
                        >
                          {/* Name + days */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <span className="font-semibold text-gray-900 text-sm">{customer.name}</span>
                              {customer.preferred_title && (
                                <span className="text-gray-400 text-xs ml-1">{customer.preferred_title}</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                              {getDaysInStage(customer.updated_at)}天
                            </span>
                          </div>

                          {/* District + Budget */}
                          <div className="flex flex-wrap gap-1.5">
                            {customer.district && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                📍 {customer.district}
                              </span>
                            )}
                            <span className="text-xs bg-orange-50 text-[#e8734a] px-2 py-0.5 rounded-full">
                              {BUDGET_LABELS[customer.budget_range] || customer.budget_range}
                            </span>
                          </div>

                          {/* Follow-up indicator */}
                          {customer.next_followup && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-blue-500">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              {new Date(customer.next_followup).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {customers.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-500 mb-4">尚無進行中的案件</p>
            <Link href="/customers/new" className="btn-primary inline-flex">新增第一個客戶</Link>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
