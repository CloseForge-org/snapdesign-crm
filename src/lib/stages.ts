export interface Stage {
  code: string
  label: string
  group: string
  groupLabel: string
  color: string
}

export const STAGE_GROUPS = [
  { key: 'lead_generation', label: '🔵 開發', color: '#3b82f6' },
  { key: 'consultation', label: '🟡 諮詢', color: '#eab308' },
  { key: 'site_visit_design', label: '🟠 現勘設計', color: '#f97316' },
  { key: 'closing', label: '🔴 成交', color: '#ef4444' },
  { key: 'subsidy', label: '🟣 補助', color: '#a855f7' },
  { key: 'execution', label: '🟢 施工', color: '#22c55e' },
  { key: 'post_sale', label: '⭐ 售後', color: '#f59e0b' },
  { key: 'dead', label: '❌ 結案', color: '#6b7280' },
]

export const STAGES: Stage[] = [
  { code: 'new_inquiry', label: '新詢問', group: 'lead_generation', groupLabel: '🔵 開發', color: '#3b82f6' },
  { code: 'initial_screening', label: '初步篩選', group: 'lead_generation', groupLabel: '🔵 開發', color: '#3b82f6' },
  { code: 'first_contact', label: '已聯繫', group: 'consultation', groupLabel: '🟡 諮詢', color: '#eab308' },
  { code: 'needs_assessment', label: '需求確認', group: 'consultation', groupLabel: '🟡 諮詢', color: '#eab308' },
  { code: 'subsidy_check', label: '補助資格評估', group: 'consultation', groupLabel: '🟡 諮詢', color: '#eab308' },
  { code: 'site_visit_scheduled', label: '已約現勘', group: 'site_visit_design', groupLabel: '🟠 現勘設計', color: '#f97316' },
  { code: 'site_visit_done', label: '現勘完成', group: 'site_visit_design', groupLabel: '🟠 現勘設計', color: '#f97316' },
  { code: 'designing', label: '出圖中', group: 'site_visit_design', groupLabel: '🟠 現勘設計', color: '#f97316' },
  { code: 'design_presented', label: '已出圖', group: 'site_visit_design', groupLabel: '🟠 現勘設計', color: '#f97316' },
  { code: 'revision', label: '修改中', group: 'closing', groupLabel: '🔴 成交', color: '#ef4444' },
  { code: 'quote_sent', label: '報價中', group: 'closing', groupLabel: '🔴 成交', color: '#ef4444' },
  { code: 'negotiating', label: '議價中', group: 'closing', groupLabel: '🔴 成交', color: '#ef4444' },
  { code: 'contract_signed', label: '已簽約', group: 'closing', groupLabel: '🔴 成交', color: '#ef4444' },
  { code: 'collecting_consent', label: '住戶同意徵集', group: 'subsidy', groupLabel: '🟣 補助', color: '#a855f7' },
  { code: 'structural_assessment', label: '結構評估中', group: 'subsidy', groupLabel: '🟣 補助', color: '#a855f7' },
  { code: 'subsidy_submitted', label: '補助送件', group: 'subsidy', groupLabel: '🟣 補助', color: '#a855f7' },
  { code: 'subsidy_approved', label: '補助核准', group: 'subsidy', groupLabel: '🟣 補助', color: '#a855f7' },
  { code: 'pre_construction', label: '施工準備', group: 'execution', groupLabel: '🟢 施工', color: '#22c55e' },
  { code: 'under_construction', label: '施工中', group: 'execution', groupLabel: '🟢 施工', color: '#22c55e' },
  { code: 'inspection', label: '驗收', group: 'execution', groupLabel: '🟢 施工', color: '#22c55e' },
  { code: 'completed', label: '完工', group: 'execution', groupLabel: '🟢 施工', color: '#22c55e' },
  { code: 'subsidy_reimbursement', label: '補助請款', group: 'post_sale', groupLabel: '⭐ 售後', color: '#f59e0b' },
  { code: 'followup', label: '售後追蹤', group: 'post_sale', groupLabel: '⭐ 售後', color: '#f59e0b' },
  { code: 'referral_generated', label: '已推薦', group: 'post_sale', groupLabel: '⭐ 售後', color: '#f59e0b' },
  { code: 'on_hold', label: '暫緩', group: 'dead', groupLabel: '❌ 結案', color: '#6b7280' },
  { code: 'lost', label: '未成交', group: 'dead', groupLabel: '❌ 結案', color: '#6b7280' },
]

export const getStage = (code: string) => STAGES.find(s => s.code === code)
export const getStageLabel = (code: string) => getStage(code)?.label || code

export const LEAD_SOURCES = [
  { value: 'website', label: '官網' },
  { value: 'line', label: 'LINE' },
  { value: 'referral', label: '推薦' },
  { value: '104', label: '104' },
  { value: 'walk_in', label: '現場' },
  { value: 'social_media', label: '社群媒體' },
  { value: '591', label: '591' },
  { value: 'other', label: '其他' },
]

export const BUILDING_TYPES = [
  { value: 'apartment_4to6', label: '公寓 (4-6樓)' },
  { value: 'townhouse', label: '透天' },
  { value: 'building', label: '大樓' },
  { value: 'other', label: '其他' },
]

export const BUDGET_RANGES = [
  { value: 'under_30', label: '30萬以下' },
  { value: '30_50', label: '30-50萬' },
  { value: '50_80', label: '50-80萬' },
  { value: '80_120', label: '80-120萬' },
  { value: 'over_120', label: '120萬+' },
  { value: 'undecided', label: '未定' },
]

export const DISTRICTS = [
  '中正', '大同', '中山', '松山', '大安', '萬華',
  '信義', '士林', '北投', '內湖', '南港', '文山',
  '板橋', '新莊', '中和', '永和', '三重', '蘆洲',
  '汐止', '林口', '淡水', '新店', '土城', '樹林',
  '其他新北', '其他',
]

export const SCOPE_OPTIONS = [
  { value: 'living', label: '客廳' },
  { value: 'bedroom', label: '臥室' },
  { value: 'kitchen', label: '廚房' },
  { value: 'bathroom', label: '浴室' },
  { value: 'balcony', label: '陽台' },
  { value: 'full', label: '全屋' },
  { value: 'public_space', label: '公共空間' },
]

export const STYLE_OPTIONS = [
  { value: 'modern', label: '現代簡約' },
  { value: 'nordic', label: '北歐' },
  { value: 'japanese', label: '日式' },
  { value: 'industrial', label: '工業風' },
  { value: 'mixed', label: '混搭' },
  { value: 'none', label: '無偏好' },
]

export const TIMELINE_OPTIONS = [
  { value: 'within_1mo', label: '1個月內' },
  { value: '1_3mo', label: '1-3個月' },
  { value: '3_6mo', label: '3-6個月' },
  { value: 'over_6mo', label: '半年以上' },
  { value: 'no_rush', label: '無急迫' },
]

export const LOST_REASONS = [
  { value: 'budget', label: '預算不足' },
  { value: 'timing', label: '時程不合' },
  { value: 'competitor', label: '選擇競爭對手' },
  { value: 'unresponsive', label: '無回應' },
  { value: 'not_eligible', label: '不符資格' },
  { value: 'other', label: '其他' },
]

export const PAYMENT_TYPES = [
  { value: 'deposit', label: '訂金' },
  { value: 'installment', label: '期款' },
  { value: 'final', label: '尾款' },
  { value: 'other', label: '其他' },
]

export const CONDITIONS = [
  { value: 'empty', label: '空屋' },
  { value: 'occupied', label: '自住中' },
  { value: 'rented', label: '出租中' },
  { value: 'abandoned', label: '廢棄' },
]

export const OWNERSHIP_TYPES = [
  { value: 'self', label: '自有' },
  { value: 'family_shared', label: '家人共有' },
  { value: 'multi_owner', label: '多戶共有' },
]

export const SUBSIDY_STATUS = [
  { value: 'eligible', label: '✅ 符合' },
  { value: 'not_eligible', label: '❌ 不符合' },
  { value: 'pending', label: '🔍 待確認' },
]

export const ELIGIBILITY_REASONS = [
  { value: 'age_30plus', label: '屋齡30年+' },
  { value: 'has_65plus', label: '有65+長者' },
  { value: 'low_income', label: '低收入戶' },
  { value: 'longterm_care', label: '長照2級+' },
]
