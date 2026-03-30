'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import type { Project, ProjectTask, ProjectPhoto, ProjectUpdate } from '@/lib/types'

type TabType = 'tasks' | 'budget' | 'updates' | 'photos' | 'info'

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

const TASK_STATUS_NEXT: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'pending',
  skipped: 'pending',
}

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: '待開始',
  in_progress: '進行中',
  completed: '完成',
  skipped: '略過',
}

const TASK_STATUS_COLORS: Record<string, string> = {
  pending: '#9ca3af',
  in_progress: '#e8734a',
  completed: '#22c55e',
  skipped: '#d1d5db',
}

const UPDATE_TYPE_LABELS: Record<string, string> = {
  progress: '進度更新',
  issue: '問題回報',
  milestone: '里程碑',
  note: '備註',
}

const UPDATE_TYPE_ICONS: Record<string, string> = {
  progress: '📊',
  issue: '⚠️',
  milestone: '🏆',
  note: '📝',
}

const PHASE_LABELS: Record<string, string> = {
  before: '施工前',
  during: '施工中',
  after: '完工後',
}

const PROJECT_STATUSES = ['planning', 'in_progress', 'paused', 'completed', 'cancelled']

const formatNTD = (n?: number | null) =>
  n != null ? `NT$ ${Number(n).toLocaleString('zh-TW')}` : '—'

const formatDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('zh-TW', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const DEFAULT_TASKS = [
  '拆除工程',
  '水電管線',
  '泥作工程',
  '木作工程',
  '油漆工程',
  '地板工程',
  '廚房',
  '衛浴',
  '系統櫃',
  '燈具照明',
  '清潔驗收',
]

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [photos, setPhotos] = useState<ProjectPhoto[]>([])
  const [updates, setUpdates] = useState<ProjectUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('tasks')

  // Task form
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskAssigned, setNewTaskAssigned] = useState('')
  const [newTaskEstCost, setNewTaskEstCost] = useState('')
  const [addingTask, setAddingTask] = useState(false)

  // Update form
  const [showAddUpdate, setShowAddUpdate] = useState(false)
  const [newUpdateContent, setNewUpdateContent] = useState('')
  const [newUpdateType, setNewUpdateType] = useState<'progress' | 'issue' | 'milestone' | 'note'>('progress')
  const [addingUpdate, setAddingUpdate] = useState(false)

  // Photo form
  const [showAddPhoto, setShowAddPhoto] = useState(false)
  const [newPhotoUrl, setNewPhotoUrl] = useState('')
  const [newPhotoCaption, setNewPhotoCaption] = useState('')
  const [newPhotoPhase, setNewPhotoPhase] = useState<'before' | 'during' | 'after'>('during')
  const [addingPhoto, setAddingPhoto] = useState(false)

  // Status change
  const [showStatusChange, setShowStatusChange] = useState(false)

  // Edit project info
  const [editingInfo, setEditingInfo] = useState(false)
  const [editData, setEditData] = useState<Partial<Project>>({})
  const [savingInfo, setSavingInfo] = useState(false)

  useEffect(() => {
    checkAuth()
    loadProject()
  }, [id])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/login')
  }

  const loadProject = async () => {
    setLoading(true)
    const [projRes, tasksRes, photosRes, updatesRes] = await Promise.all([
      supabase.from('projects').select('*, customers(name)').eq('id', id).single(),
      supabase.from('project_tasks').select('*').eq('project_id', id).order('sort_order'),
      supabase.from('project_photos').select('*').eq('project_id', id).order('created_at'),
      supabase.from('project_updates').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    ])

    if (projRes.data) {
      const p = projRes.data
      setProject(p)
      setCustomerName((p as any).customers?.name || '')
      setEditData(p)
    } else {
      router.push('/projects')
    }

    setTasks(tasksRes.data || [])
    setPhotos(photosRes.data || [])
    setUpdates(updatesRes.data || [])
    setLoading(false)
  }

  const cycleTaskStatus = async (task: ProjectTask) => {
    const next = TASK_STATUS_NEXT[task.status] as ProjectTask['status']
    const updated = tasks.map(t => t.id === task.id ? { ...t, status: next } : t)
    setTasks(updated)

    const { data } = await supabase
      .from('project_tasks')
      .update({ status: next })
      .eq('id', task.id)
      .select()
      .single()

    // Update spent_so_far on project
    if (next === 'completed' && task.actual_cost) {
      const newSpent = (project?.spent_so_far || 0) + task.actual_cost
      await supabase.from('projects').update({ spent_so_far: newSpent }).eq('id', id)
      setProject(prev => prev ? { ...prev, spent_so_far: newSpent } : prev)
    }
  }

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return
    setAddingTask(true)
    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.sort_order)) + 1 : 0
    const { data } = await supabase.from('project_tasks').insert({
      project_id: id,
      task_name: newTaskName.trim(),
      assigned_to: newTaskAssigned || null,
      estimated_cost: newTaskEstCost ? parseFloat(newTaskEstCost) : null,
      status: 'pending',
      sort_order: maxOrder,
    }).select().single()

    if (data) {
      setTasks(prev => [...prev, data])
      setNewTaskName('')
      setNewTaskAssigned('')
      setNewTaskEstCost('')
      setShowAddTask(false)
    }
    setAddingTask(false)
  }

  const handleAddUpdate = async () => {
    if (!newUpdateContent.trim()) return
    setAddingUpdate(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('project_updates').insert({
      project_id: id,
      content: newUpdateContent.trim(),
      update_type: newUpdateType,
      created_by: user?.id,
    }).select().single()

    if (data) {
      setUpdates(prev => [data, ...prev])
      setNewUpdateContent('')
      setNewUpdateType('progress')
      setShowAddUpdate(false)
    }
    setAddingUpdate(false)
  }

  const handleAddPhoto = async () => {
    if (!newPhotoUrl.trim()) return
    setAddingPhoto(true)
    const { data } = await supabase.from('project_photos').insert({
      project_id: id,
      photo_url: newPhotoUrl.trim(),
      caption: newPhotoCaption || null,
      phase: newPhotoPhase,
    }).select().single()

    if (data) {
      setPhotos(prev => [...prev, data])
      setNewPhotoUrl('')
      setNewPhotoCaption('')
      setNewPhotoPhase('during')
      setShowAddPhoto(false)
    }
    setAddingPhoto(false)
  }

  const handleStatusChange = async (newStatus: string) => {
    await supabase.from('projects').update({ status: newStatus }).eq('id', id)
    setProject(prev => prev ? { ...prev, status: newStatus as Project['status'] } : prev)
    setShowStatusChange(false)
  }

  const handleSaveInfo = async () => {
    setSavingInfo(true)
    await supabase.from('projects').update({
      project_name: editData.project_name,
      start_date: editData.start_date || null,
      target_end_date: editData.target_end_date || null,
      total_budget: editData.total_budget || null,
      contractor_name: editData.contractor_name || null,
      contractor_phone: editData.contractor_phone || null,
      contractor_notes: editData.contractor_notes || null,
      google_drive_url: editData.google_drive_url || null,
      notes: editData.notes || null,
    }).eq('id', id)
    setProject(prev => prev ? { ...prev, ...editData } : prev)
    setEditingInfo(false)
    setSavingInfo(false)
  }

  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const totalTasks = tasks.length
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const budgetPct = project?.total_budget && project.total_budget > 0
    ? Math.round((project.spent_so_far / project.total_budget) * 100)
    : 0
  const isOverBudget = budgetPct > 100

  // Group photos by phase
  const photosByPhase = {
    before: photos.filter(p => p.phase === 'before'),
    during: photos.filter(p => p.phase === 'during'),
    after: photos.filter(p => p.phase === 'after'),
  }

  const daysLeft = project?.target_end_date
    ? Math.ceil((new Date(project.target_end_date).getTime() - Date.now()) / 86400000)
    : null

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f4] flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-[#e8734a] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="min-h-screen bg-[#faf7f4]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/projects" className="p-2 -ml-2 text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">{project.project_name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Link href={`/customers/${project.customer_id}`} className="text-xs text-[#e8734a] underline">
                {customerName}
              </Link>
              <button
                onClick={() => setShowStatusChange(true)}
                className="flex items-center gap-1"
              >
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{
                    color: STATUS_COLORS[project.status],
                    backgroundColor: STATUS_COLORS[project.status] + '20',
                  }}
                >
                  {STATUS_LABELS[project.status]}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Status change modal */}
        {showStatusChange && (
          <div className="absolute inset-x-0 top-full z-50 bg-white shadow-lg border-t border-gray-100 p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">變更狀態</p>
            <div className="grid grid-cols-2 gap-2">
              {PROJECT_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className="py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors min-h-[44px]"
                  style={{
                    color: project.status === s ? 'white' : STATUS_COLORS[s],
                    backgroundColor: project.status === s ? STATUS_COLORS[s] : STATUS_COLORS[s] + '15',
                    borderColor: STATUS_COLORS[s] + '40',
                  }}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowStatusChange(false)}
              className="w-full mt-3 py-2.5 text-gray-500 text-sm rounded-xl bg-gray-50 min-h-[44px]"
            >
              取消
            </button>
          </div>
        )}

        {/* Overview strip */}
        <div className="px-4 pb-3 flex gap-3 text-xs">
          {project.start_date && (
            <div className="flex items-center gap-1 text-gray-500">
              <span>📅</span>
              <span>{formatDate(project.start_date)}</span>
            </div>
          )}
          {daysLeft !== null && project.status !== 'completed' && (
            <div className={`flex items-center gap-1 ${daysLeft < 0 ? 'text-red-500' : daysLeft < 7 ? 'text-[#f0a848]' : 'text-gray-500'}`}>
              <span>{daysLeft < 0 ? '⚠️' : '⏳'}</span>
              <span>{daysLeft < 0 ? `逾期 ${Math.abs(daysLeft)} 天` : `剩 ${daysLeft} 天`}</span>
            </div>
          )}
          {project.total_budget && (
            <div className={`flex items-center gap-1 ${isOverBudget ? 'text-red-500' : 'text-gray-500'}`}>
              <span>💰</span>
              <span>{isOverBudget ? '⚠️ ' : ''}{budgetPct}% 已用</span>
            </div>
          )}
          {totalTasks > 0 && (
            <div className="flex items-center gap-1 text-gray-500">
              <span>✅</span>
              <span>{completedTasks}/{totalTasks}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-t border-gray-100 overflow-x-auto hide-scrollbar">
          {([
            { key: 'tasks', label: '工程' },
            { key: 'budget', label: '費用' },
            { key: 'updates', label: '動態' },
            { key: 'photos', label: '相片' },
            { key: 'info', label: '資訊' },
          ] as { key: TabType; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex-shrink-0 py-3 text-sm font-medium transition-colors min-h-[44px] ${
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

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div>
            {/* Progress bar */}
            {totalTasks > 0 && (
              <div className="card mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-900">整體進度</span>
                  <span className="text-[#e8734a] font-bold">{progress}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: progress === 100 ? '#22c55e' : '#e8734a',
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">{completedTasks} / {totalTasks} 項已完成</p>
              </div>
            )}

            {/* Task list */}
            <div className="space-y-2 mb-4">
              {tasks.map(task => (
                <div key={task.id} className="card">
                  <div className="flex items-center gap-3">
                    {/* Status toggle button */}
                    <button
                      onClick={() => cycleTaskStatus(task)}
                      className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
                      style={{ backgroundColor: TASK_STATUS_COLORS[task.status] + '20' }}
                    >
                      {task.status === 'completed' ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : task.status === 'in_progress' ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8734a" strokeWidth="2">
                          <circle cx="12" cy="12" r="9" />
                          <polyline points="12 8 12 12 14 14" />
                        </svg>
                      ) : task.status === 'skipped' ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                    </button>

                    {/* Task details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {task.task_name}
                        </p>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            color: TASK_STATUS_COLORS[task.status],
                            backgroundColor: TASK_STATUS_COLORS[task.status] + '20',
                          }}
                        >
                          {TASK_STATUS_LABELS[task.status]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-400">
                        {task.assigned_to && <span>👷 {task.assigned_to}</span>}
                        {task.start_date && <span>{formatDate(task.start_date)}</span>}
                        {task.end_date && <span>→ {formatDate(task.end_date)}</span>}
                        {task.estimated_cost && (
                          <span>預算 {formatNTD(task.estimated_cost)}</span>
                        )}
                        {task.actual_cost && (
                          <span className={task.actual_cost > (task.estimated_cost || Infinity) ? 'text-red-400' : 'text-green-500'}>
                            實際 {formatNTD(task.actual_cost)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add task */}
            {showAddTask ? (
              <div className="card border border-[#e8734a]/30">
                <h4 className="font-medium text-gray-900 mb-3">新增工程項目</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">工程名稱 *</label>
                    <input
                      value={newTaskName}
                      onChange={e => setNewTaskName(e.target.value)}
                      className="input-field"
                      placeholder="例：拆除工程"
                    />
                    {/* Quick select default tasks */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {DEFAULT_TASKS.filter(t => !tasks.find(task => task.task_name === t)).map(t => (
                        <button
                          key={t}
                          onClick={() => setNewTaskName(t)}
                          className="px-2 py-1 bg-orange-50 text-[#e8734a] text-xs rounded-lg"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">負責人</label>
                    <input
                      value={newTaskAssigned}
                      onChange={e => setNewTaskAssigned(e.target.value)}
                      className="input-field"
                      placeholder="承包商姓名"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">預算金額</label>
                    <input
                      type="number"
                      value={newTaskEstCost}
                      onChange={e => setNewTaskEstCost(e.target.value)}
                      className="input-field"
                      placeholder="NT$"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddTask}
                      disabled={addingTask || !newTaskName.trim()}
                      className="flex-1 btn-primary py-3 min-h-[44px]"
                    >
                      {addingTask ? '新增中...' : '新增'}
                    </button>
                    <button
                      onClick={() => setShowAddTask(false)}
                      className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium min-h-[44px]"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddTask(true)}
                className="w-full py-3.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 flex items-center justify-center gap-2 min-h-[44px]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                新增工程項目
              </button>
            )}
          </div>
        )}

        {/* BUDGET TAB */}
        {activeTab === 'budget' && (
          <div className="space-y-4">
            {/* Budget overview */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">費用概覽</h3>
              {project.total_budget ? (
                <>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">總預算</span>
                    <span className="font-semibold">{formatNTD(project.total_budget)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-gray-500">已使用</span>
                    <span className={`font-semibold ${isOverBudget ? 'text-red-500' : 'text-[#22c55e]'}`}>
                      {formatNTD(project.spent_so_far)}
                    </span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(budgetPct, 100)}%`,
                        backgroundColor: isOverBudget ? '#ef4444' : budgetPct > 80 ? '#f0a848' : '#22c55e',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{budgetPct}% 已用</span>
                    <span>
                      {isOverBudget
                        ? `⚠️ 超支 ${formatNTD(project.spent_so_far - project.total_budget)}`
                        : `剩餘 ${formatNTD(project.total_budget - project.spent_so_far)}`
                      }
                    </span>
                  </div>
                  {isOverBudget && (
                    <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3">
                      <p className="text-red-600 text-sm font-medium">⚠️ 費用已超出預算！</p>
                      <p className="text-red-400 text-xs mt-1">超支金額：{formatNTD(project.spent_so_far - project.total_budget!)}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">尚未設定總預算</p>
              )}
            </div>

            {/* Per-task breakdown */}
            {tasks.some(t => t.estimated_cost || t.actual_cost) && (
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">各項費用明細</h3>
                <div className="space-y-3">
                  {tasks.filter(t => t.estimated_cost || t.actual_cost).map(task => (
                    <div key={task.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{task.task_name}</p>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{
                            color: TASK_STATUS_COLORS[task.status],
                            backgroundColor: TASK_STATUS_COLORS[task.status] + '20',
                          }}
                        >
                          {TASK_STATUS_LABELS[task.status]}
                        </span>
                      </div>
                      <div className="text-right">
                        {task.estimated_cost && (
                          <p className="text-xs text-gray-400">預算 {formatNTD(task.estimated_cost)}</p>
                        )}
                        {task.actual_cost && (
                          <p className={`text-sm font-medium ${
                            task.actual_cost > (task.estimated_cost || Infinity) ? 'text-red-500' : 'text-gray-900'
                          }`}>
                            {formatNTD(task.actual_cost)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Task cost summary */}
            {tasks.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-3">統計</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">預算合計</dt>
                    <dd className="font-medium">{formatNTD(tasks.reduce((s, t) => s + (t.estimated_cost || 0), 0) || undefined)}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">實際合計</dt>
                    <dd className="font-medium">{formatNTD(tasks.reduce((s, t) => s + (t.actual_cost || 0), 0) || undefined)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        )}

        {/* UPDATES TAB */}
        {activeTab === 'updates' && (
          <div>
            {/* Add update form */}
            {showAddUpdate ? (
              <div className="card border border-[#e8734a]/30 mb-4">
                <h4 className="font-medium text-gray-900 mb-3">新增動態</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">類型</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['progress', 'milestone', 'issue', 'note'] as const).map(type => (
                        <button
                          key={type}
                          onClick={() => setNewUpdateType(type)}
                          className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors min-h-[44px] ${
                            newUpdateType === type
                              ? 'bg-[#e8734a] text-white border-[#e8734a]'
                              : 'text-gray-600 border-gray-200'
                          }`}
                        >
                          {UPDATE_TYPE_ICONS[type]} {UPDATE_TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">內容 *</label>
                    <textarea
                      value={newUpdateContent}
                      onChange={e => setNewUpdateContent(e.target.value)}
                      className="input-field resize-none"
                      rows={3}
                      placeholder="輸入動態內容..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddUpdate}
                      disabled={addingUpdate || !newUpdateContent.trim()}
                      className="flex-1 btn-primary py-3 min-h-[44px]"
                    >
                      {addingUpdate ? '新增中...' : '新增'}
                    </button>
                    <button
                      onClick={() => setShowAddUpdate(false)}
                      className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium min-h-[44px]"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddUpdate(true)}
                className="w-full py-3.5 mb-4 bg-[#e8734a] text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 min-h-[44px]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                新增動態
              </button>
            )}

            {/* Updates timeline */}
            {updates.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm">尚無動態紀錄</p>
              </div>
            ) : (
              <div className="space-y-3">
                {updates.map(update => (
                  <div key={update.id} className="card">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">{UPDATE_TYPE_ICONS[update.update_type]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-500">
                            {UPDATE_TYPE_LABELS[update.update_type]}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">{update.content}</p>
                        <p className="text-xs text-gray-400 mt-1.5">
                          {new Date(update.created_at).toLocaleDateString('zh-TW', {
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

        {/* PHOTOS TAB */}
        {activeTab === 'photos' && (
          <div>
            {/* Add photo */}
            {showAddPhoto ? (
              <div className="card border border-[#e8734a]/30 mb-4">
                <h4 className="font-medium text-gray-900 mb-3">新增相片</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">階段</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['before', 'during', 'after'] as const).map(phase => (
                        <button
                          key={phase}
                          onClick={() => setNewPhotoPhase(phase)}
                          className={`py-2.5 rounded-xl text-sm font-medium border min-h-[44px] ${
                            newPhotoPhase === phase
                              ? 'bg-[#e8734a] text-white border-[#e8734a]'
                              : 'text-gray-600 border-gray-200'
                          }`}
                        >
                          {PHASE_LABELS[phase]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">圖片網址 *</label>
                    <input
                      value={newPhotoUrl}
                      onChange={e => setNewPhotoUrl(e.target.value)}
                      className="input-field"
                      placeholder="https://..."
                      type="url"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">說明</label>
                    <input
                      value={newPhotoCaption}
                      onChange={e => setNewPhotoCaption(e.target.value)}
                      className="input-field"
                      placeholder="相片說明（選填）"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddPhoto}
                      disabled={addingPhoto || !newPhotoUrl.trim()}
                      className="flex-1 btn-primary py-3 min-h-[44px]"
                    >
                      {addingPhoto ? '新增中...' : '新增'}
                    </button>
                    <button
                      onClick={() => setShowAddPhoto(false)}
                      className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium min-h-[44px]"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddPhoto(true)}
                className="w-full py-3.5 mb-4 bg-[#e8734a] text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 min-h-[44px]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                新增相片
              </button>
            )}

            {photos.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📷</div>
                <p className="text-sm">尚無相片</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(['before', 'during', 'after'] as const).map(phase => {
                  const phasePhotos = photosByPhase[phase]
                  if (phasePhotos.length === 0) return null
                  return (
                    <div key={phase}>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">{PHASE_LABELS[phase]}</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {phasePhotos.map(photo => (
                          <a key={photo.id} href={photo.photo_url} target="_blank" rel="noopener noreferrer">
                            <div className="rounded-xl overflow-hidden bg-gray-100 aspect-square">
                              <img
                                src={photo.photo_url}
                                alt={photo.caption || phase}
                                className="w-full h-full object-cover"
                                onError={e => {
                                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23f3f4f6'/%3E%3Ctext x='12' y='14' text-anchor='middle' font-size='8' fill='%239ca3af'%3E無法載入%3C/text%3E%3C/svg%3E"
                                }}
                              />
                            </div>
                            {photo.caption && (
                              <p className="text-xs text-gray-500 mt-1 truncate">{photo.caption}</p>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* INFO TAB */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* Project info */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">專案資訊</h3>
                {!editingInfo ? (
                  <button onClick={() => setEditingInfo(true)} className="text-[#e8734a] text-sm">編輯</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingInfo(false); setEditData(project) }} className="text-gray-400 text-sm">取消</button>
                    <button onClick={handleSaveInfo} disabled={savingInfo} className="text-[#e8734a] text-sm font-medium">
                      {savingInfo ? '儲存中...' : '儲存'}
                    </button>
                  </div>
                )}
              </div>
              <dl className="space-y-4">
                <InfoRow label="專案名稱">
                  {editingInfo ? (
                    <input value={editData.project_name || ''} onChange={e => setEditData(p => ({ ...p, project_name: e.target.value }))} className="input-field py-2" />
                  ) : project.project_name}
                </InfoRow>
                <InfoRow label="開始日期">
                  {editingInfo ? (
                    <input type="date" value={editData.start_date || ''} onChange={e => setEditData(p => ({ ...p, start_date: e.target.value || undefined }))} className="input-field py-2" />
                  ) : formatDate(project.start_date)}
                </InfoRow>
                <InfoRow label="預計完工">
                  {editingInfo ? (
                    <input type="date" value={editData.target_end_date || ''} onChange={e => setEditData(p => ({ ...p, target_end_date: e.target.value || undefined }))} className="input-field py-2" />
                  ) : formatDate(project.target_end_date)}
                </InfoRow>
                {(project.actual_end_date || editingInfo) && (
                  <InfoRow label="實際完工">
                    {editingInfo ? (
                      <input type="date" value={editData.actual_end_date || ''} onChange={e => setEditData(p => ({ ...p, actual_end_date: e.target.value || undefined }))} className="input-field py-2" />
                    ) : formatDate(project.actual_end_date)}
                  </InfoRow>
                )}
                <InfoRow label="總預算">
                  {editingInfo ? (
                    <input type="number" value={editData.total_budget || ''} onChange={e => setEditData(p => ({ ...p, total_budget: e.target.value ? parseFloat(e.target.value) : undefined }))} className="input-field py-2" placeholder="NT$" />
                  ) : formatNTD(project.total_budget)}
                </InfoRow>
                {(project.google_drive_url || editingInfo) && (
                  <InfoRow label="Google Drive">
                    {editingInfo ? (
                      <input type="url" value={editData.google_drive_url || ''} onChange={e => setEditData(p => ({ ...p, google_drive_url: e.target.value }))} className="input-field py-2" placeholder="https://drive.google.com/..." />
                    ) : project.google_drive_url ? (
                      <a href={project.google_drive_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline text-sm">開啟資料夾</a>
                    ) : '—'}
                  </InfoRow>
                )}
                {(project.notes || editingInfo) && (
                  <InfoRow label="備註">
                    {editingInfo ? (
                      <textarea value={editData.notes || ''} onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))} className="input-field py-2 resize-none" rows={3} />
                    ) : project.notes || '—'}
                  </InfoRow>
                )}
              </dl>
            </div>

            {/* Contractor info */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">承包商資訊</h3>
                {!editingInfo && <button onClick={() => setEditingInfo(true)} className="text-[#e8734a] text-sm">編輯</button>}
              </div>
              <dl className="space-y-4">
                <InfoRow label="承包商">
                  {editingInfo ? (
                    <input value={editData.contractor_name || ''} onChange={e => setEditData(p => ({ ...p, contractor_name: e.target.value }))} className="input-field py-2" placeholder="承包商姓名" />
                  ) : project.contractor_name || '—'}
                </InfoRow>
                <InfoRow label="聯絡電話">
                  {editingInfo ? (
                    <input type="tel" value={editData.contractor_phone || ''} onChange={e => setEditData(p => ({ ...p, contractor_phone: e.target.value }))} className="input-field py-2" />
                  ) : project.contractor_phone ? (
                    <a href={`tel:${project.contractor_phone}`} className="text-blue-500">{project.contractor_phone}</a>
                  ) : '—'}
                </InfoRow>
                {(project.contractor_notes || editingInfo) && (
                  <InfoRow label="備註">
                    {editingInfo ? (
                      <textarea value={editData.contractor_notes || ''} onChange={e => setEditData(p => ({ ...p, contractor_notes: e.target.value }))} className="input-field py-2 resize-none" rows={2} />
                    ) : project.contractor_notes || '—'}
                  </InfoRow>
                )}
              </dl>
            </div>
          </div>
        )}
      </div>

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
