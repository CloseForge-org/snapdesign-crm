'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Customer } from '@/lib/types'

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

interface Props {
  customer: Customer
  onClose: () => void
}

export default function NewProjectForm({ customer, onClose }: Props) {
  const router = useRouter()
  const [projectName, setProjectName] = useState(`${customer.name} - ${customer.address}`)
  const [startDate, setStartDate] = useState('')
  const [targetEndDate, setTargetEndDate] = useState('')
  const [totalBudget, setTotalBudget] = useState(customer.contract_amount?.toString() || '')
  const [contractorName, setContractorName] = useState('')
  const [contractorPhone, setContractorPhone] = useState('')
  const [contractorNotes, setContractorNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!projectName.trim()) {
      setError('請輸入專案名稱')
      return
    }
    setSaving(true)
    setError('')

    try {
      // Create project
      const { data: project, error: projError } = await supabase
        .from('projects')
        .insert({
          customer_id: customer.id,
          project_name: projectName.trim(),
          status: 'planning',
          start_date: startDate || null,
          target_end_date: targetEndDate || null,
          total_budget: totalBudget ? parseFloat(totalBudget) : null,
          spent_so_far: 0,
          contractor_name: contractorName || null,
          contractor_phone: contractorPhone || null,
          contractor_notes: contractorNotes || null,
        })
        .select()
        .single()

      if (projError || !project) {
        setError('建立失敗，請再試一次')
        setSaving(false)
        return
      }

      // Create default tasks
      const tasksToInsert = DEFAULT_TASKS.map((name, i) => ({
        project_id: project.id,
        task_name: name,
        status: 'pending',
        sort_order: i,
      }))

      await supabase.from('project_tasks').insert(tasksToInsert)

      // Navigate to the new project
      router.push(`/projects/${project.id}`)
    } catch (e) {
      setError('建立失敗，請再試一次')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="w-full bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">建立新專案</h2>
            <button onClick={onClose} className="p-2 text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Customer info banner */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-6">
            <p className="text-xs text-[#e8734a] font-medium mb-0.5">客戶</p>
            <p className="text-sm font-semibold text-gray-900">{customer.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{customer.address}</p>
          </div>

          <div className="space-y-4">
            {/* Project name */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">專案名稱 *</label>
              <input
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                className="input-field"
                placeholder="專案名稱"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">開工日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">預計完工</label>
                <input
                  type="date"
                  value={targetEndDate}
                  onChange={e => setTargetEndDate(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">總預算 (NT$)</label>
              <input
                type="number"
                value={totalBudget}
                onChange={e => setTotalBudget(e.target.value)}
                className="input-field"
                placeholder="例：800000"
              />
              {customer.contract_amount && !totalBudget && (
                <p className="text-xs text-gray-400 mt-1">合約金額：NT$ {customer.contract_amount.toLocaleString('zh-TW')}</p>
              )}
            </div>

            {/* Contractor */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">承包商資訊（選填）</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">承包商姓名</label>
                  <input
                    value={contractorName}
                    onChange={e => setContractorName(e.target.value)}
                    className="input-field"
                    placeholder="承包商姓名"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">聯絡電話</label>
                  <input
                    type="tel"
                    value={contractorPhone}
                    onChange={e => setContractorPhone(e.target.value)}
                    className="input-field"
                    placeholder="0912-345-678"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">備註</label>
                  <textarea
                    value={contractorNotes}
                    onChange={e => setContractorNotes(e.target.value)}
                    className="input-field resize-none"
                    rows={2}
                    placeholder="承包商備註..."
                  />
                </div>
              </div>
            </div>

            {/* Default tasks notice */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">✅ 自動建立以下工程項目：</p>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_TASKS.map(t => (
                  <span key={t} className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleCreate}
              disabled={saving || !projectName.trim()}
              className="w-full btn-primary py-4 text-base font-semibold min-h-[44px] disabled:opacity-50"
            >
              {saving ? '建立中...' : '🏗️ 建立專案'}
            </button>

            <div className="pb-8" />
          </div>
        </div>
      </div>
    </div>
  )
}
