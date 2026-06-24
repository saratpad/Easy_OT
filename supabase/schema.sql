-- ============================================================
-- Easy-OT System — Full Database Schema
-- Run this in Supabase SQL Editor (in order)
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. POSITIONS (Rank/Seniority Master Table)
-- ============================================================
CREATE TABLE IF NOT EXISTS positions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_th     TEXT NOT NULL UNIQUE,
  name_en     TEXT,
  rank_weight INT  NOT NULL DEFAULT 999,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed from legacy positionRank
INSERT INTO positions (name_th, rank_weight) VALUES
  ('ผู้อำนวยการกองประสานนโยบายและยุทธศาสตร์', 1),
  ('ผู้เชี่ยวชาญด้านประสานนโยบายและยุทธศาสตร์', 2),
  ('ผู้อำนวยการกลุ่มประสานนโยบายและยุทธศาสตร์ ๑', 3),
  ('ผู้อำนวยการกลุ่มประสานนโยบายและยุทธศาสตร์ ๒', 4),
  ('ผู้อำนวยการกลุ่มประสานนโยบายและยุทธศาสตร์ ๓', 5),
  ('ผู้อำนวยการกลุ่มประสานนโยบายและยุทธศาสตร์ ๔', 6),
  ('หัวหน้าฝ่ายบริหาร', 7),
  ('นักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ', 8),
  ('นักวิเคราะห์นโยบายและแผนชำนาญการ', 9),
  ('นักวิเคราะห์นโยบายและแผนปฏิบัติการ', 10),
  ('เจ้าพนักงานธุรการชำนาญงาน', 11),
  ('เจ้าพนักงานธุรการปฏิบัติงาน', 12),
  ('เจ้าหน้าที่วิเคราะห์นโยบายและแผน', 13),
  ('พนักงานธุรการ ส ๓', 14),
  ('เจ้าหน้าที่บริหารงานทั่วไป', 15),
  ('เจ้าหน้าที่รับรอง', 16),
  ('เจ้าพนักงานธุรการ', 17)
ON CONFLICT (name_th) DO NOTHING;

-- ============================================================
-- 3. DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_th              TEXT NOT NULL UNIQUE,
  name_en              TEXT,
  line_notify_token    TEXT,
  gas_template_doc_id  TEXT,
  gas_pdf_folder_id    TEXT,
  gas_webhook_url      TEXT,
  is_active            BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id        TEXT UNIQUE,
  first_name         TEXT NOT NULL,
  last_name          TEXT NOT NULL,
  department_id      UUID REFERENCES departments(id) ON DELETE SET NULL,
  position_id        UUID REFERENCES positions(id) ON DELETE SET NULL,
  role               TEXT NOT NULL DEFAULT 'employee'
                     CHECK (role IN ('super_admin','sub_admin','supervisor','commander','supervising_commander','employee')),
  signature_drive_id TEXT,
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'New'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 5. SUPERVISING COMMANDER ASSIGNMENTS (Many-to-Many)
-- ============================================================
CREATE TABLE IF NOT EXISTS supervising_commander_assignments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervising_commander_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id            UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_active                BOOLEAN DEFAULT TRUE,
  assigned_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supervising_commander_id, department_id)
);

-- ============================================================
-- 6. DEPARTMENT APPROVAL CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS department_approval_config (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id                 UUID NOT NULL UNIQUE REFERENCES departments(id) ON DELETE CASCADE,
  supervisor_id                 UUID REFERENCES profiles(id) ON DELETE SET NULL,
  commander_id                  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  require_supervising_commander BOOLEAN DEFAULT TRUE,
  updated_at                    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. TASKS (ภารกิจ)
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_th       TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name_th, department_id)
);

-- ============================================================
-- 8. OT REQUESTS
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS ot_request_seq START 1;

CREATE TABLE IF NOT EXISTS ot_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code     TEXT UNIQUE,
  requester_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  department_id    UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  request_date     DATE NOT NULL,
  ot_start_time    TIME NOT NULL,
  ot_end_time      TIME NOT NULL,
  total_hours      NUMERIC(4,2),
  task_id          UUID REFERENCES tasks(id) ON DELETE SET NULL,
  task_custom      TEXT,

  status TEXT NOT NULL DEFAULT 'pending_supervisor'
    CHECK (status IN (
      'pending_supervisor',
      'approved_supervisor',
      'rejected_supervisor',
      'approved_commander',
      'rejected_commander',
      'approved_final',
      'rejected_final',
      'cancelled'
    )),

  -- Tier 1: Supervisor
  supervisor_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  supervisor_action TEXT CHECK (supervisor_action IN ('approved','rejected')),
  supervisor_at     TIMESTAMPTZ,
  supervisor_note   TEXT,

  -- Tier 2: Commander
  commander_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  commander_action  TEXT CHECK (commander_action IN ('approved','rejected')),
  commander_at      TIMESTAMPTZ,
  commander_note    TEXT,

  -- Tier 3: Supervising Commander
  supervising_commander_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  supervising_action       TEXT CHECK (supervising_action IN ('approved','rejected')),
  supervising_at           TIMESTAMPTZ,
  supervising_note         TEXT,

  -- Export / Document
  exported_at   TIMESTAMPTZ,
  memo_number   TEXT,
  document_url  TEXT,

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate request_code
CREATE OR REPLACE FUNCTION generate_request_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.request_code := 'OTR' || LPAD(nextval('ot_request_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_request_code ON ot_requests;
CREATE TRIGGER trg_request_code
  BEFORE INSERT ON ot_requests
  FOR EACH ROW
  EXECUTE FUNCTION generate_request_code();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ot_updated_at
  BEFORE UPDATE ON ot_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 9. HOLIDAYS
-- ============================================================
CREATE TABLE IF NOT EXISTS holidays (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. EXPORT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS export_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exported_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  department_id    UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  memo_number      TEXT NOT NULL,
  request_ids      UUID[] NOT NULL,
  document_url     TEXT,
  line_notified    BOOLEAN DEFAULT FALSE,
  line_notified_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. RLS HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_department_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT department_id FROM profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- 12. ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_approval_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervising_commander_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 13. RLS POLICIES
-- ============================================================

-- -------- positions (public read, super_admin write) --------
CREATE POLICY "positions_read_all" ON positions
  FOR SELECT USING (TRUE);

CREATE POLICY "positions_super_admin_write" ON positions
  FOR ALL USING (get_my_role() = 'super_admin');

-- -------- holidays (public read, super_admin/sub_admin write) --------
CREATE POLICY "holidays_read_all" ON holidays
  FOR SELECT USING (TRUE);

CREATE POLICY "holidays_admin_write" ON holidays
  FOR ALL USING (get_my_role() IN ('super_admin', 'sub_admin'));

-- -------- profiles --------
CREATE POLICY "profiles_self_read" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_dept_read" ON profiles
  FOR SELECT USING (
    department_id = get_my_department_id()
    AND get_my_role() IN ('sub_admin', 'supervisor', 'commander', 'supervising_commander')
  );

CREATE POLICY "profiles_super_admin_all" ON profiles
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "profiles_sub_admin_manage" ON profiles
  FOR ALL USING (
    get_my_role() = 'sub_admin'
    AND department_id = get_my_department_id()
  );

CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- -------- departments --------
CREATE POLICY "departments_own_read" ON departments
  FOR SELECT USING (id = get_my_department_id());

CREATE POLICY "departments_supervising_read" ON departments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM supervising_commander_assignments
      WHERE supervising_commander_id = auth.uid()
        AND department_id = departments.id
        AND is_active = TRUE
    )
  );

CREATE POLICY "departments_super_admin_all" ON departments
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "departments_sub_admin_read" ON departments
  FOR SELECT USING (get_my_role() = 'sub_admin' AND id = get_my_department_id());

CREATE POLICY "departments_sub_admin_update" ON departments
  FOR UPDATE USING (get_my_role() = 'sub_admin' AND id = get_my_department_id());

-- -------- department_approval_config --------
CREATE POLICY "dac_dept_read" ON department_approval_config
  FOR SELECT USING (department_id = get_my_department_id());

CREATE POLICY "dac_sub_admin_manage" ON department_approval_config
  FOR ALL USING (
    get_my_role() = 'sub_admin'
    AND department_id = get_my_department_id()
  );

CREATE POLICY "dac_super_admin_all" ON department_approval_config
  FOR ALL USING (get_my_role() = 'super_admin');

-- -------- supervising_commander_assignments --------
CREATE POLICY "sca_own_read" ON supervising_commander_assignments
  FOR SELECT USING (supervising_commander_id = auth.uid());

CREATE POLICY "sca_super_admin_all" ON supervising_commander_assignments
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "sca_sub_admin_read" ON supervising_commander_assignments
  FOR SELECT USING (
    get_my_role() = 'sub_admin'
    AND department_id = get_my_department_id()
  );

-- -------- tasks --------
CREATE POLICY "tasks_read_own_dept_or_global" ON tasks
  FOR SELECT USING (
    department_id IS NULL
    OR department_id = get_my_department_id()
  );

CREATE POLICY "tasks_sub_admin_manage" ON tasks
  FOR ALL USING (
    get_my_role() IN ('sub_admin', 'super_admin')
    AND (department_id = get_my_department_id() OR get_my_role() = 'super_admin')
  );

-- -------- ot_requests --------
-- SELECT
CREATE POLICY "ot_self_read" ON ot_requests
  FOR SELECT USING (requester_id = auth.uid());

CREATE POLICY "ot_supervisor_read" ON ot_requests
  FOR SELECT USING (
    get_my_role() = 'supervisor'
    AND department_id = get_my_department_id()
  );

CREATE POLICY "ot_commander_read" ON ot_requests
  FOR SELECT USING (
    get_my_role() = 'commander'
    AND department_id = get_my_department_id()
  );

CREATE POLICY "ot_supervising_read" ON ot_requests
  FOR SELECT USING (
    get_my_role() = 'supervising_commander'
    AND EXISTS (
      SELECT 1 FROM supervising_commander_assignments sca
      WHERE sca.supervising_commander_id = auth.uid()
        AND sca.department_id = ot_requests.department_id
        AND sca.is_active = TRUE
    )
  );

CREATE POLICY "ot_sub_admin_dept_read" ON ot_requests
  FOR SELECT USING (
    get_my_role() = 'sub_admin'
    AND department_id = get_my_department_id()
  );

CREATE POLICY "ot_super_admin_all" ON ot_requests
  FOR ALL USING (get_my_role() = 'super_admin');

-- INSERT
CREATE POLICY "ot_employee_insert" ON ot_requests
  FOR INSERT WITH CHECK (
    requester_id = auth.uid()
    AND department_id = get_my_department_id()
  );

-- UPDATE (approval actions)
CREATE POLICY "ot_supervisor_approve" ON ot_requests
  FOR UPDATE USING (
    get_my_role() = 'supervisor'
    AND department_id = get_my_department_id()
    AND status = 'pending_supervisor'
  );

CREATE POLICY "ot_commander_approve" ON ot_requests
  FOR UPDATE USING (
    get_my_role() = 'commander'
    AND department_id = get_my_department_id()
    AND status = 'approved_supervisor'
  );

CREATE POLICY "ot_supervising_approve" ON ot_requests
  FOR UPDATE USING (
    get_my_role() = 'supervising_commander'
    AND status = 'approved_commander'
    AND EXISTS (
      SELECT 1 FROM supervising_commander_assignments sca
      WHERE sca.supervising_commander_id = auth.uid()
        AND sca.department_id = ot_requests.department_id
        AND sca.is_active = TRUE
    )
  );

-- UPDATE (cancel own pending)
CREATE POLICY "ot_self_cancel" ON ot_requests
  FOR UPDATE USING (
    requester_id = auth.uid()
    AND status = 'pending_supervisor'
  );

-- UPDATE (sub_admin export stamp)
CREATE POLICY "ot_sub_admin_export" ON ot_requests
  FOR UPDATE USING (
    get_my_role() = 'sub_admin'
    AND department_id = get_my_department_id()
    AND status = 'approved_final'
  );

-- -------- export_logs --------
CREATE POLICY "export_own_dept" ON export_logs
  FOR ALL USING (
    department_id = get_my_department_id()
    AND get_my_role() IN ('sub_admin', 'commander', 'super_admin')
  );

CREATE POLICY "export_super_admin_all" ON export_logs
  FOR ALL USING (get_my_role() = 'super_admin');

-- ============================================================
-- 14. USEFUL VIEWS
-- ============================================================

-- Full OT request view with requester name + position rank
CREATE OR REPLACE VIEW ot_requests_detailed AS
SELECT
  r.*,
  p.first_name,
  p.last_name,
  p.first_name || ' ' || p.last_name AS full_name,
  pos.name_th AS position_th,
  pos.rank_weight,
  d.name_th AS department_th
FROM ot_requests r
JOIN profiles p ON p.id = r.requester_id
LEFT JOIN positions pos ON pos.id = p.position_id
LEFT JOIN departments d ON d.id = r.department_id;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
