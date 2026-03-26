'use client'

import { useState } from 'react'
import type { Payment } from '@/lib/types'
import { PAYMENT_TYPES } from '@/lib/stages'
import { supabase } from '@/lib/supabase'

const formatNTD = (amount: number) =>
  `NT$ ${amount.toLocaleString('zh-TW')}`

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('zh-TW', { year: 'numeric', month: 'short', day: 'numeric' })

interface PaymentLogProps {
  payments: Payment[]
  customerId: string
  onRefresh: () => void
}

export default function PaymentLog({ payments, customerId, onRefresh }: PaymentLogProps) {
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [paymentType, setPaymentType] = useState('deposit')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount.replace(/,/g, ''))
    if (!numAmount || numAmount <= 0) return
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('payments').insert({
        customer_id: customerId,
        amount: numAmount,
        payment_type: paymentType,
        payment_date: paymentDate,
        notes: notes.trim() || null,
        created_by: user?.id,
      })
      if (!error) {
        setAmount('')
        setPaymentType('deposit')
        setPaymentDate(new Date().toISOString().slice(0, 10))
        setNotes('')
        setShowForm(false)
        onRefresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const getPaymentTypeLabel = (type: string) =>
    PAYMENT_TYPES.find(t => t.value === type)?.label || type

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'deposit': return '#3b82f6'
      case 'installment': return '#f97316'
      case 'final': return '#22c55e'
      default: return '#9ca3af'
    }
  }

  return (
    <div>
      {/* Total Summary */}
      {payments.length > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-4">
          <div className="text-sm text-green-600 font-medium">已收款合計</div>
          <div className="text-2xl font-bold text-green-700 mt-0.5">{formatNTD(totalPaid)}</div>
          <div className="text-xs text-green-500 mt-1">{payments.length} 筆付款</div>
        </div>
      )}

      {/* Add Payment Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 border-2 border-dashed border-green-400 rounded-xl text-green-700 font-medium mb-4 min-h-[44px] active:bg-green-100 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新增付款記錄
        </button>
      )}

      {/* Add Form */}
      {showForm && (
        <div className="card mb-4 border border-green-100">
          <h4 className="font-semibold text-gray-900 mb-3">新增付款</h4>

          <div className="mb-3">
            <label className="label">付款類型</label>
            <div className="flex gap-2 flex-wrap">
              {PAYMENT_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setPaymentType(t.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium min-h-[40px] transition-colors ${
                    paymentType === t.value
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
            <label className="label">金額（NT$）</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="input-field"
              placeholder="例：50000"
              inputMode="numeric"
            />
          </div>

          <div className="mb-3">
            <label className="label">付款日期</label>
            <input
              type="date"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="mb-4">
            <label className="label">備註（選填）</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input-field"
              placeholder="付款方式、票號等..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!amount || submitting}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {submitting ? '儲存中...' : '儲存'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="btn-ghost px-4"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Payment List */}
      {payments.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 opacity-40">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          <p className="text-sm">尚無付款記錄</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <div key={payment.id} className="card flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: getPaymentTypeColor(payment.payment_type) + '20' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={getPaymentTypeColor(payment.payment_type)} strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      color: getPaymentTypeColor(payment.payment_type),
                      backgroundColor: getPaymentTypeColor(payment.payment_type) + '15'
                    }}
                  >
                    {getPaymentTypeLabel(payment.payment_type)}
                  </span>
                  <span className="font-bold text-gray-900">{formatNTD(payment.amount)}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1 flex items-center justify-between">
                  <span>{formatDate(payment.payment_date)}</span>
                  {payment.notes && <span className="text-gray-500 truncate ml-2">{payment.notes}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
