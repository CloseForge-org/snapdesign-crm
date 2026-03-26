'use client'

import { useState } from 'react'
import { STAGES, STAGE_GROUPS, getStageLabel } from '@/lib/stages'

interface StageSelectorProps {
  currentStage: string
  onSelect: (stageCode: string, notes: string) => void
  disabled?: boolean
}

export default function StageSelector({ currentStage, onSelect, disabled }: StageSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selectedStage, setSelectedStage] = useState('')
  const [notes, setNotes] = useState('')

  const currentStageObj = STAGES.find(s => s.code === currentStage)

  const handleSelect = (code: string) => {
    setSelectedStage(code)
  }

  const handleConfirm = () => {
    if (!selectedStage) return
    onSelect(selectedStage, notes)
    setOpen(false)
    setSelectedStage('')
    setNotes('')
  }

  const handleCancel = () => {
    setOpen(false)
    setSelectedStage('')
    setNotes('')
  }

  return (
    <>
      <button
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-[#e8734a] text-[#e8734a] font-medium text-sm min-h-[44px] active:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: currentStageObj?.color || '#999' }}
        />
        <span>{currentStageObj?.label || currentStage}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleCancel}
          />

          {/* Sheet */}
          <div className="relative w-full bg-white rounded-t-3xl max-h-[85vh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-5 pb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">更改階段</h3>
              <button onClick={handleCancel} className="p-2 text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4">
              {STAGE_GROUPS.map(group => {
                const groupStages = STAGES.filter(s => s.group === group.key)
                return (
                  <div key={group.key} className="mb-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      {group.label}
                    </div>
                    <div className="space-y-1.5">
                      {groupStages.map(stage => (
                        <button
                          key={stage.code}
                          onClick={() => handleSelect(stage.code)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors min-h-[44px] ${
                            selectedStage === stage.code
                              ? 'bg-[#e8734a] text-white'
                              : stage.code === currentStage
                              ? 'bg-orange-50 text-[#e8734a] border border-[#e8734a]'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: selectedStage === stage.code ? 'white' : stage.color }}
                          />
                          <span className="font-medium">{stage.label}</span>
                          {stage.code === currentStage && (
                            <span className="ml-auto text-xs opacity-70">目前</span>
                          )}
                          {selectedStage === stage.code && (
                            <span className="ml-auto">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Notes */}
              {selectedStage && selectedStage !== currentStage && (
                <div className="mt-4">
                  <label className="label">備註（選填）</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="input-field resize-none"
                    rows={3}
                    placeholder="說明更改原因..."
                  />
                </div>
              )}
            </div>

            {/* Confirm */}
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={handleConfirm}
                disabled={!selectedStage || selectedStage === currentStage}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                確認更改
                {selectedStage && selectedStage !== currentStage && (
                  <span className="opacity-75"> → {getStageLabel(selectedStage)}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
