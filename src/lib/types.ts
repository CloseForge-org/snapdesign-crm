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

export interface Project {
  id: string
  customer_id: string
  project_name: string
  status: 'planning' | 'in_progress' | 'paused' | 'completed' | 'cancelled'
  start_date?: string
  target_end_date?: string
  actual_end_date?: string
  total_budget?: number
  spent_so_far: number
  contractor_name?: string
  contractor_phone?: string
  contractor_notes?: string
  google_drive_url?: string
  notes?: string
  created_at: string
  updated_at: string
  // joined
  customer?: Customer
  tasks?: ProjectTask[]
}

export interface ProjectTask {
  id: string
  project_id: string
  task_name: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  assigned_to?: string
  start_date?: string
  end_date?: string
  estimated_cost?: number
  actual_cost?: number
  sort_order: number
  notes?: string
  created_at: string
}

export interface ProjectPhoto {
  id: string
  project_id: string
  photo_url: string
  caption?: string
  phase: 'before' | 'during' | 'after'
  taken_at?: string
  created_at: string
}

export interface ProjectUpdate {
  id: string
  project_id: string
  content: string
  update_type: 'progress' | 'issue' | 'milestone' | 'note'
  created_by?: string
  created_at: string
}
