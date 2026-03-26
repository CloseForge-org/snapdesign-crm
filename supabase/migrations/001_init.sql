-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Table: customers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  name                  text NOT NULL,
  phone                 text NOT NULL,
  line_id               text NOT NULL,
  email                 text,
  preferred_title       text,
  lead_source           text NOT NULL,
  referral_from         text,
  listing_url           text,
  address               text NOT NULL DEFAULT '',
  district              text,
  building_type         text NOT NULL,
  unit_floor            integer,
  total_floors          integer,
  building_age          integer NOT NULL DEFAULT 0,
  size_ping             numeric,
  room_layout           text,
  current_condition     text,
  ownership             text,
  budget_range          text NOT NULL,
  scope                 text[],
  style_preference      text,
  timeline              text,
  special_needs         text,
  google_drive_url      text,
  subsidy_eligible      text,
  eligibility_reasons   text[],
  loan_subsidy_eligible boolean DEFAULT false,
  subsidy_notes         text,
  current_stage         text NOT NULL DEFAULT 'new_inquiry',
  assigned_to           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  quote_amount          numeric,
  contract_amount       numeric,
  next_followup         date,
  lost_reason           text,
  lost_reason_other     text
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- Table: stage_history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stage_history (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  from_stage    text NOT NULL,
  to_stage      text NOT NULL,
  changed_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at    timestamptz NOT NULL DEFAULT now(),
  notes         text
);

-- ============================================================
-- Table: activity_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id    uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  activity_type  text NOT NULL DEFAULT 'note',
  content        text NOT NULL,
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: payments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id    uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount         numeric NOT NULL,
  payment_type   text NOT NULL DEFAULT 'deposit',
  payment_date   date NOT NULL,
  notes          text,
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_customers_current_stage ON public.customers(current_stage);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON public.customers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_customers_next_followup ON public.customers(next_followup);
CREATE INDEX IF NOT EXISTS idx_customers_lead_source ON public.customers(lead_source);
CREATE INDEX IF NOT EXISTS idx_customers_district ON public.customers(district);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON public.customers(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_stage_history_customer_id ON public.stage_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_customer_id ON public.activity_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Customers: authenticated users can read/write
CREATE POLICY "auth_read_customers" ON public.customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_customers" ON public.customers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_customers" ON public.customers
  FOR DELETE TO authenticated USING (true);

-- Stage history: authenticated users can read/insert
CREATE POLICY "auth_read_stage_history" ON public.stage_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_stage_history" ON public.stage_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- Activity log: authenticated users can read/insert
CREATE POLICY "auth_read_activity_log" ON public.activity_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_activity_log" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Payments: authenticated users can read/insert
CREATE POLICY "auth_read_payments" ON public.payments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- Views
-- ============================================================

-- Pipeline summary view
CREATE OR REPLACE VIEW public.pipeline_summary AS
SELECT
  current_stage,
  COUNT(*) AS customer_count,
  SUM(COALESCE(quote_amount, 0)) AS total_quote_value,
  SUM(COALESCE(contract_amount, 0)) AS total_contract_value
FROM public.customers
WHERE current_stage NOT IN ('on_hold', 'lost')
GROUP BY current_stage;

-- Follow-ups due view
CREATE OR REPLACE VIEW public.upcoming_followups AS
SELECT
  id,
  name,
  phone,
  line_id,
  current_stage,
  next_followup,
  district
FROM public.customers
WHERE next_followup IS NOT NULL
  AND next_followup >= CURRENT_DATE
  AND next_followup <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY next_followup ASC;
