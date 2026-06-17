-- =====================================================
-- AMBITIOUS CARE — PAYMENT, PAYOUT & DISPUTE MIGRATION
-- =====================================================
-- Additive migration. Run AFTER SUPABASE_SQL_SETUP.sql.
-- Implements: Stripe Connect onboarding, pay-and-hold at booking,
-- conditional automatic payouts (separate charges & transfers),
-- disputes, safety concerns, and notifications.
--
-- NOTE: The `ALTER TYPE ... ADD VALUE` statements cannot run inside a
-- transaction block. If you paste this whole file into the Supabase SQL
-- editor it runs each statement autocommitted, which is fine. If you wrap
-- it in BEGIN/COMMIT, run the ALTER TYPE block separately first.
-- =====================================================

-- -----------------------------------------------------
-- 1. EXTEND ENUMS
-- -----------------------------------------------------

-- Platform admin role (admins resolve disputes/safety cases). Bootstrap the
-- first admin by setting a user's user_role to 'admin' in the DB.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- New expert categories.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'executive_coach';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'executive_mentor';

-- Extra appointment lifecycle states (existing: pending, confirmed,
-- cancelled, completed, no_show). 'pending' = "pending expert approval".
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'reschedule_pending';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'awaiting_confirmation';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'disputed';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'under_investigation';

-- Payment lifecycle, independent of appointment status.
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'unpaid',             -- no payment yet
    'paid_held',          -- charged; funds held in platform balance
    'ready_for_release',  -- conditions met; payout pending transfer
    'released',           -- transferred to expert connected account
    'refund_initiated',   -- refund requested
    'refunded',           -- fully refunded
    'partially_refunded', -- partial refund (dispute split)
    'payout_failed'       -- transfer to expert failed
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Dispute / safety case states.
DO $$ BEGIN
  CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- -----------------------------------------------------
-- 2. PLATFORM SETTINGS (single-row config)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  default_commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 15.00, -- percent
  auto_release_hours INTEGER NOT NULL DEFAULT 72,   -- worker-no-response window
  expert_response_days INTEGER NOT NULL DEFAULT 7,  -- expert-no-response window
  summary_reminder_hours INTEGER NOT NULL DEFAULT 48,
  max_reschedules INTEGER NOT NULL DEFAULT 3,
  currency TEXT NOT NULL DEFAULT 'gbp',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------
-- 3. PROFESSIONAL_PROFILES — STRIPE CONNECT FIELDS
-- -----------------------------------------------------
ALTER TABLE professional_profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT FALSE,
  -- NULL => fall back to platform_settings.default_commission_rate
  ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 2);

-- -----------------------------------------------------
-- 4. APPOINTMENT_REQUESTS — PAYMENT & SESSION FIELDS
-- -----------------------------------------------------
ALTER TABLE appointment_requests
  -- session delivery
  ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'online',   -- online | offline
  ADD COLUMN IF NOT EXISTS online_platform TEXT,                 -- google_meet | zoom
  ADD COLUMN IF NOT EXISTS meeting_link TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  -- money (all amounts in minor units / pence)
  ADD COLUMN IF NOT EXISTS payment_status payment_status DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'gbp',
  ADD COLUMN IF NOT EXISTS amount_pence INTEGER,
  ADD COLUMN IF NOT EXISTS commission_pence INTEGER,
  ADD COLUMN IF NOT EXISTS expert_payout_pence INTEGER,
  ADD COLUMN IF NOT EXISTS commission_rate_applied DECIMAL(5, 2),
  -- stripe references
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payout_released_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payout_failure_reason TEXT,
  -- session completion
  ADD COLUMN IF NOT EXISTS session_summary TEXT,
  ADD COLUMN IF NOT EXISTS session_notes TEXT,
  ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS session_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS worker_confirmed_at TIMESTAMP WITH TIME ZONE,
  -- auto-progression deadlines
  ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMP WITH TIME ZONE,  -- completed + 72h
  ADD COLUMN IF NOT EXISTS request_expires_at TIMESTAMP WITH TIME ZONE, -- created + 7d
  ADD COLUMN IF NOT EXISTS summary_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS link_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  -- reschedule tracking
  ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reschedule_reason TEXT,
  ADD COLUMN IF NOT EXISTS proposed_date DATE,
  ADD COLUMN IF NOT EXISTS proposed_time TIME;

CREATE INDEX IF NOT EXISTS idx_appointment_requests_payment_status
  ON appointment_requests(payment_status);
CREATE INDEX IF NOT EXISTS idx_appointment_requests_auto_release
  ON appointment_requests(auto_release_at) WHERE auto_release_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointment_requests_expires
  ON appointment_requests(request_expires_at) WHERE request_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointment_requests_pi
  ON appointment_requests(stripe_payment_intent_id);

-- -----------------------------------------------------
-- 5. DISPUTES & SAFETY CONCERNS
-- -----------------------------------------------------
-- One table covers both standard disputes and emergency safety concerns,
-- distinguished by `category`. Both block payout until resolved.
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointment_requests(id) ON DELETE CASCADE NOT NULL,
  raised_by UUID REFERENCES users(id) ON DELETE SET NULL,
  raised_by_role TEXT,                       -- worker | expert | admin
  category TEXT NOT NULL DEFAULT 'standard', -- standard | safety
  reason TEXT NOT NULL,
  details TEXT,
  status dispute_status NOT NULL DEFAULT 'open',
  resolution_type TEXT,                       -- full_refund | partial_refund | expert_wins | dismissed
  worker_refund_pence INTEGER,
  expert_payout_pence INTEGER,
  admin_notes TEXT,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_appointment ON disputes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_category ON disputes(category);

-- -----------------------------------------------------
-- 6. NOTIFICATIONS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,            -- machine key, e.g. 'payment_successful'
  title TEXT NOT NULL,
  body TEXT,
  appointment_id UUID REFERENCES appointment_requests(id) ON DELETE CASCADE,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

-- -----------------------------------------------------
-- 7. RLS
-- -----------------------------------------------------
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Disputes: a participant of the appointment can read & raise.
CREATE POLICY "Participants can read disputes" ON disputes
  FOR SELECT TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM appointment_requests
      WHERE patient_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
         OR professional_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Participants can raise disputes" ON disputes
  FOR INSERT TO authenticated
  WITH CHECK (
    raised_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Notifications: users see and update (mark-read) only their own.
CREATE POLICY "Users read own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Platform settings: read-only to authenticated; writes happen via service role.
CREATE POLICY "Anyone can read platform settings" ON platform_settings
  FOR SELECT TO authenticated USING (true);

-- NOTE: All payout/refund/state-machine writes are performed by Netlify
-- functions using the Supabase SERVICE ROLE key, which bypasses RLS.
-- The existing appointment_requests UPDATE policies remain for client-side
-- actions (cancel, accept, etc.).

-- -----------------------------------------------------
-- 8. TRIGGERS
-- -----------------------------------------------------
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Stamp request_expires_at (created + expert_response_days) on insert.
CREATE OR REPLACE FUNCTION set_request_expiry()
RETURNS TRIGGER AS $$
DECLARE
  resp_days INTEGER;
BEGIN
  SELECT expert_response_days INTO resp_days FROM platform_settings WHERE id = 1;
  IF NEW.request_expires_at IS NULL THEN
    NEW.request_expires_at := NOW() + (COALESCE(resp_days, 7) || ' days')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_appointment_request_expiry BEFORE INSERT ON appointment_requests
  FOR EACH ROW EXECUTE FUNCTION set_request_expiry();

-- =====================================================
-- END MIGRATION
-- =====================================================
