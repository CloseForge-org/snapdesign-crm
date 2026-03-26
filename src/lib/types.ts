export interface Customer {
  id: string
  created_at: string
  updated_at: string
  name: string
  phone: string
  line_id: string
  email?: string
  preferred_title?: string
  lead_source: string
  referral_from?: string
  listing_url?: string
  address: string
  district?: string
  building_type: string
  unit_floor?: number
  total_floors?: number
  building_age: number
  size_ping?: number
  room_layout?: string
  current_condition?: string
  ownership?: string
  budget_range: string
  scope?: string[]
  style_preference?: string
  timeline?: string
  special_needs?: string
  google_drive_url?: string
  subsidy_eligible?: string
  eligibility_reasons?: string[]
  loan_subsidy_eligible?: boolean
  subsidy_notes?: string
  current_stage: string
  assigned_to?: string
  quote_amount?: number
  contract_amount?: number
  next_followup?: string
  lost_reason?: string
  lost_reason_other?: string
}

export interface StageHistory {
  id: string
  customer_id: string
  from_stage: string
  to_stage: string
  changed_by: string
  changed_at: string
  notes?: string
}

export interface Activity {
  id: string
  customer_id: string
  activity_type: string
  content: string
  created_by: string
  created_at: string
}

export interface Payment {
  id: string
  customer_id: string
  amount: number
  payment_type: string
  payment_date: string
  notes?: string
  created_by: string
  created_at: string
}
