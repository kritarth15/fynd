-- ==============================================================================
-- FYND — Campus Lost & Found Recovery Platform
-- Complete PostgreSQL / Supabase Schema, RLS Security Policies & Triggers
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- ENUMS & CUSTOM TYPES
-- ==============================================================================
CREATE TYPE user_role AS ENUM ('student', 'moderator', 'admin');
CREATE TYPE item_type AS ENUM ('lost', 'found');
CREATE TYPE item_status AS ENUM (
  'draft',
  'active',
  'matched',
  'claim_pending',
  'verification',
  'handover_pending',
  'recovered',
  'expired',
  'cancelled',
  'disputed'
);
CREATE TYPE claim_status AS ENUM (
  'pending_verification',
  'passed',
  'failed',
  'escalated',
  'approved',
  'rejected',
  'completed'
);
CREATE TYPE match_classification AS ENUM ('strong', 'possible', 'weak');
CREATE TYPE handover_status AS ENUM ('pending', 'ready', 'completed', 'cancelled');

-- ==============================================================================
-- 1. PROFILES (Extends Supabase auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role user_role DEFAULT 'student' NOT NULL,
  campus_verified BOOLEAN DEFAULT TRUE NOT NULL,
  department TEXT DEFAULT 'General Studies',
  student_id TEXT,
  recovery_rating INTEGER DEFAULT 100 CHECK (recovery_rating >= 0 AND recovery_rating <= 100),
  lost_reported_count INTEGER DEFAULT 0,
  found_reported_count INTEGER DEFAULT 0,
  recovered_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Automatic trigger to create profile on Supabase auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    role,
    department,
    student_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'displayName', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
    COALESCE(NEW.raw_user_meta_data->>'department', 'Computer Science'),
    COALESCE(NEW.raw_user_meta_data->>'student_id', NEW.raw_user_meta_data->>'studentId', 'STU-2026')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 2. ITEMS (Public Discovery Listings)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type item_type NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  title TEXT NOT NULL,
  brand TEXT,
  color TEXT,
  location_id TEXT NOT NULL,
  location_name TEXT NOT NULL,
  incident_date TIMESTAMPTZ NOT NULL,
  approximate_time TEXT,
  public_description TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}'::TEXT[],
  status item_status DEFAULT 'active' NOT NULL,
  risk_tier SMALLINT DEFAULT 1 CHECK (risk_tier IN (1, 2, 3)) NOT NULL,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  reporter_name TEXT NOT NULL,
  has_private_evidence BOOLEAN DEFAULT FALSE NOT NULL,
  active_claim_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 3. PRIVATE EVIDENCE (Zero-Knowledge Isolation - Never Exposed Publicly)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.private_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID UNIQUE REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  serial_number TEXT,
  serial_number_hash TEXT,
  secret_questions JSONB DEFAULT '[]'::JSONB NOT NULL,
  finder_private_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 4. MATCHES (Deterministic Relationships Computed by Engine)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lost_item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  found_item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  score_details JSONB NOT NULL,
  classification match_classification DEFAULT 'possible' NOT NULL,
  status TEXT DEFAULT 'open' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_match_pair UNIQUE (lost_item_id, found_item_id)
);

-- ==============================================================================
-- 5. CLAIMS (Ownership Claims & Verification Challenges)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  found_item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  lost_item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  claimant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  claimant_name TEXT NOT NULL,
  claimant_email TEXT NOT NULL,
  status claim_status DEFAULT 'pending_verification' NOT NULL,
  submitted_answers JSONB DEFAULT '{}'::JSONB NOT NULL,
  attempt_count INTEGER DEFAULT 1 NOT NULL,
  max_attempts INTEGER DEFAULT 3 NOT NULL,
  risk_tier SMALLINT DEFAULT 1 NOT NULL,
  moderator_required BOOLEAN DEFAULT FALSE NOT NULL,
  moderator_notes TEXT,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 6. HANDOVERS (Physical Recovery Station with 6-Digit OTP)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.handovers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  finder_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  claimant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  location_name TEXT NOT NULL,
  handover_code TEXT NOT NULL, -- 6-digit OTP
  status handover_status DEFAULT 'ready' NOT NULL,
  verified_by TEXT DEFAULT 'finder' NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 7. NOTIFICATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  link_target TEXT,
  read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 8. AUDIT LOGS (Immutable Append-Only Security Trail)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- INDEXES FOR FAST QUERYING & MATCHING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_items_type_status ON public.items(type, status);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_items_location ON public.items(location_id);
CREATE INDEX IF NOT EXISTS idx_items_reporter ON public.items(reporter_id);
CREATE INDEX IF NOT EXISTS idx_matches_lost ON public.matches(lost_item_id);
CREATE INDEX IF NOT EXISTS idx_matches_found ON public.matches(found_item_id);
CREATE INDEX IF NOT EXISTS idx_claims_found_item ON public.claims(found_item_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimant ON public.claims(claimant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, read);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is Moderator or Admin
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('moderator', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 2. Items Policies (Public Discovery)
CREATE POLICY "Anyone can view active items"
  ON public.items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own items"
  ON public.items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporters or moderators can update items"
  ON public.items FOR UPDATE
  TO authenticated
  USING (auth.uid() = reporter_id OR public.is_moderator());

-- 3. Private Evidence Policies (CRITICAL: Zero-Knowledge Isolation)
CREATE POLICY "Only reporter or moderator can read private evidence"
  ON public.private_evidence FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id OR public.is_moderator());

CREATE POLICY "Reporter can insert private evidence for their item"
  ON public.private_evidence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporter or moderator can update private evidence"
  ON public.private_evidence FOR UPDATE
  TO authenticated
  USING (auth.uid() = reporter_id OR public.is_moderator());

-- 4. Matches Policies
CREATE POLICY "Users can view matches related to their items"
  ON public.matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.items
      WHERE (id = lost_item_id OR id = found_item_id) AND (reporter_id = auth.uid() OR public.is_moderator())
    )
  );

-- 5. Claims Policies
CREATE POLICY "Claimant, item finder, or moderator can view claim"
  ON public.claims FOR SELECT
  TO authenticated
  USING (
    claimant_id = auth.uid() OR
    public.is_moderator() OR
    EXISTS (
      SELECT 1 FROM public.items
      WHERE id = found_item_id AND reporter_id = auth.uid()
    )
  );

CREATE POLICY "Users can submit claims"
  ON public.claims FOR INSERT
  TO authenticated
  WITH CHECK (claimant_id = auth.uid());

CREATE POLICY "Moderators can update claims"
  ON public.claims FOR UPDATE
  TO authenticated
  USING (public.is_moderator());

-- 6. Handovers Policies
CREATE POLICY "Handover participants can view handover"
  ON public.handovers FOR SELECT
  TO authenticated
  USING (claimant_id = auth.uid() OR finder_id = auth.uid() OR public.is_moderator());

CREATE POLICY "Participants can update handover status"
  ON public.handovers FOR UPDATE
  TO authenticated
  USING (claimant_id = auth.uid() OR finder_id = auth.uid() OR public.is_moderator());

-- 7. Notifications Policies
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can update own notification read state"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid());

-- 8. Audit Logs Policies (Append-only & read by moderators)
CREATE POLICY "Moderators can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_moderator());

CREATE POLICY "Authenticated users can insert audit records"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
