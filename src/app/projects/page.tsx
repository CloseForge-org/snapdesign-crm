'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import type { Project, ProjectTask } from '@/lib/types'

type StatusFilter = 'all' | 'planning' | 'in_progress' | 'paused' | 'completed' | 'cancelled'

const STATUS_LABELS: Record<string, string> = {
  planning: '規劃中',
  in_progress: '施工中',
  paused: '暫停',
  completed: '已完工',
  cancelled: '已取消',
}

const STATUS_COLORS: Record<string, string> = {
  planning: '#3b82f6',
  in_progress: '#e8734a',
  paused: '#f0a848',
  completed: '#22c55e',
  cancelled: '#6b7280',
}

const STATUS_BG: Record<string, string> = {
  planning: '#eff6ff',
  in_progress: '#fff4f0',
  paused: '#fffbeb',
  completed: '#f0fdf4',
  cancelled: '#f9fafb',
}

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'planning', label: '規劃中' },
  { key: 'in_progress', label: '施工中' },
  { key: 'paused', label: '暫停' },
  { key: 'completed', label: '已完工' },
]

interface ProjectWithTasks extends Project {
  tasks: ProjectTask[]
  customer_name: string
}

const formatDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }) : '—'

const calcDaysRemaining = (target?: string | null) => {
  if (!target) return null
  const diff = Math.ceil((new Date(target).getTime() - Date.now()) / 86400000)
  return diff
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectWithTasks[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    checkAuth()
    loadProjects()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/login')
  }

  const loadProjects = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select(`
        *,
        customers (name),
        project_tasks (*)
      `)
      .order('created_at', { ascending: false })

    if (data) {
      setProjects(data.map((p: any) => ({
        ...p,
        customer_name: p.customers?.name || '未知客戶',
        tasks: p.project_tasks || [],
      })))
    }
    setLoading(false)
  }

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

  return (
    <div className="min-h-screen bg-[#faf7f4]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900">專案管理</h1>
          <p className="text-xs text-gray-400 mt-0.5">共 {projects.length} 個專案</p>
        </div>

        {/* Filter tabs */}
        <div className="flex overflow-x-auto border-t border-gray-100 px-2 pb-0 hide-scrollbar">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-shrink-0 px-3 py-3 text-sm font-medium transition-colors min-h-[44px] ${
                filter === tab.key
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
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-[#e8734a] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-sm">
              {filter === 'all' ? '尚無專案' : '此狀態無專案'}
            </p>
            <p className="text-xs mt-2">在客戶頁面簽約後可建立專案</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(project => {
              const total = project.tasks.length
              const completed = project.tasks.filter(t => t.status === 'completed').length
              const progress = total > 0 ? Math.round((completed / total) * 100) : 0
              const budgetPct = project.total_budget && project.total_budget > 0
                ? Math.round((project.spent_so_far / project.total_budget) * 100)
                : 0
              const daysLeft = calcDaysRemaining(project.target_end_date)
              const isOverBudget = budgetPct > 100

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="card active:opacity-80 transition-opacity">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{project.project_name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{project.customer_name}</p>
                      </div>
                      <span
                        className="flex-shrink-0 px-2 py-1 rounded-lg text-xs font-medium"
                        style={{
                          color: STATUS_COLORS[project.status],
                          backgroundColor: STATUS_BG[project.status],
                        }}
                      >
                        {STATUS_LABELS[project.status]}
                      </span>
                    </div>

                    {/* Task progress */}
                    {total > 0 && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>工程進度</span>
                          <span>{completed}/{total} 項完成</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: progress === 100 ? '#22c55e' : '#e8734a',
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Bottom row */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      {project.total_budget && (
                        <span className={isOverBudget ? 'text-red-500 font-medium' : ''}>
                          💰 {isOverBudget ? '⚠️ ' : ''}{budgetPct}% 已用
                        </span>
                      )}
                      {daysLeft !== null && project.status !== 'completed' && project.status !== 'cancelled' && (
                        <span className={daysLeft < 0 ? 'text-red-500 font-medium' : daysLeft < 7 ? 'text-[#f0a848] font-medium' : ''}>
                          {daysLeft < 0 ? `⚠️ 已逾期 ${Math.abs(daysLeft)} 天` : `📅 剩 ${daysLeft} 天`}
                        </span>
                      )}
                      {project.start_date && (
                        <span>開始 {formatDate(project.start_date)}</span>
                      )}
                    </div>
                  </div>
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
