'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { getStageLabel, STAGES } from '@/lib/stages'
import type { Customer, Activity } from '@/lib/types'

interface DashboardStats {
  totalLeads: number
  activeDeals: number
  thisMonthNew: number
  pipelineValue: number
}

interface FollowUp {
  id: string
  name: string
  phone: string
  current_stage: string
  next_followup: string
  district?: string
}

const formatNTD = (amount: number) => {
  if (amount >= 1000000) return `NT$ ${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `NT$ ${(amount / 1000).toFixed(0)}K`
  return `NT$ ${amount.toLocaleString('zh-TW')}`
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}

const formatFollowupDate = (dateStr: string) => {
  const d = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = d.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '明天'
  return `${days} 天後`
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({ totalLeads: 0, activeDeals: 0, thisMonthNew: 0, pipelineValue: 0 })
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [recentActivities, setRecentActivities] = useState<(Activity & { customer_name?: string })[]>([])
  const [userName, setUserName] = useState('')

  useEffect(() => {
    checkAuth()
    loadDashboard()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUserName(user.email?.split('@')[0] || '使用者')
  }

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const [customersRes, followUpsRes, activitiesRes] = await Promise.all([
        supabase.from('customers').select('id, current_stage, contract_amount, quote_amount, created_at'),
        supabase
          .from('customers')
          .select('id, name, phone, current_stage, next_followup, district')
          .gte('next_followup', new Date().toISOString().slice(0, 10))
          .lte('next_followup', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
          .order('next_followup', { ascending: true })
          .limit(5),
        supabase
          .from('activity_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      const customers: any[] = customersRes.data || []
      const deadStages = ['on_hold', 'lost']
      const activeStages = STAGES.filter(s => !deadStages.includes(s.code)).map(s => s.code)

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const stats: DashboardStats = {
        totalLeads: customers.length,
        activeDeals: customers.filter(c => activeStages.includes(c.current_stage)).length,
        thisMonthNew: customers.filter(c => new Date(c.created_at) >= startOfMonth).length,
        pipelineValue: customers.reduce((sum, c) => sum + (c.contract_amount || c.quote_amount || 0), 0),
      }

      setStats(stats)
      setFollowUps(followUpsRes.data || [])

      // Fetch customer names for activities
      const activities = activitiesRes.data || []
      if (activities.length > 0) {
        const customerIds = Array.from(new Set(activities.map((a: any) => a.customer_id)))
        const { data: actCustomers } = await supabase
          .from('customers')
          .select('id, name')
          .in('id', customerIds)

        const customerMap = new Map((actCustomers || []).map((c: any) => [c.id, c.name]))
        const enriched = activities.map((a: any) => ({
          ...a,
          customer_name: customerMap.get(a.customer_id) || '未知客戶',
        }))
        setRecentActivities(enriched)
      }
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: '總客戶數', value: stats.totalLeads, icon: '👥', color: '#3b82f6' },
    { label: '進行中案件', value: stats.activeDeals, icon: '🔥', color: '#e8734a' },
    { label: '本月新增', value: stats.thisMonthNew, icon: '✨', color: '#22c55e' },
    { label: '管道價值', value: formatNTD(stats.pipelineValue), icon: '💰', color: '#f59e0b' },
  ]

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">SNAP 設計</h1>
            <p className="text-sm text-gray-500">哈囉，{userName} 👋</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            className="p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="page-container pt-2">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {statCards.map((card) => (
            <div key={card.label} className="card">
              <div className="text-2xl mb-1">{card.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link
            href="/customers/new"
            className="btn-primary flex items-center justify-center gap-2 text-center"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新增客戶
          </Link>
          <Link
            href="/pipeline"
            className="btn-secondary flex items-center justify-center gap-2 text-center"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="5" height="18" rx="1" />
              <rect x="10" y="3" width="5" height="12" rx="1" />
              <rect x="17" y="3" width="5" height="7" rx="1" />
            </svg>
            查看流程
          </Link>
        </div>

        {/* Upcoming Follow-ups */}
        {followUps.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">📅 近期追蹤</h2>
            <div className="space-y-2">
              {followUps.map(followUp => (
                <Link
                  key={followUp.id}
                  href={`/customers/${followUp.id}`}
                  className="card flex items-center gap-3 active:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">📞</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{followUp.name}</span>
                      <span className="text-xs text-[#e8734a] font-medium">
                        {formatFollowupDate(followUp.next_followup)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                      <span>{getStageLabel(followUp.current_stage)}</span>
                      {followUp.district && <span>· {followUp.district}</span>}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentActivities.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">🕐 最近活動</h2>
            <div className="space-y-2">
              {recentActivities.slice(0, 5).map(activity => (
                <Link
                  key={activity.id}
                  href={`/customers/${activity.customer_id}`}
                  className="card flex items-start gap-3 active:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm">
                      {activity.activity_type === 'call' ? '📞' :
                       activity.activity_type === 'line_message' ? '💬' :
                       activity.activity_type === 'site_visit' ? '🏠' :
                       activity.activity_type === 'quote' ? '💰' :
                       activity.activity_type === 'contract' ? '📋' : '📝'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-900 text-sm">{(activity as any).customer_name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(activity.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{activity.content}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {followUps.length === 0 && recentActivities.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-gray-500 text-sm">今天沒有待辦事項！</p>
            <Link href="/customers/new" className="btn-primary mt-4 inline-flex">新增第一個客戶</Link>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
