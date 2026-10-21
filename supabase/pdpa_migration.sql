-- ============================================================
-- Easy-OT — PDPA Compliance Migration
-- พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
-- Run this in Supabase SQL Editor (standalone — ไม่ต้องรัน main schema ก่อน)
-- ============================================================

-- ============================================================
-- 0. HELPER FUNCTION (สร้างหรืออัปเดตโดยอัตโนมัติ)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- A. ROPA (Record of Processing Activities)
--    ทะเบียนกิจกรรมการประมวลผล ตาม PDPA มาตรา 39
-- ============================================================
CREATE TABLE IF NOT EXISTS ropa_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ข้อมูลกิจกรรม
  activity_name       TEXT NOT NULL,       -- ชื่อกิจกรรม เช่น "บริหารจัดการคำขอ OT"
  activity_purpose    TEXT NOT NULL,       -- วัตถุประสงค์
  legal_basis         TEXT NOT NULL,       -- ฐานทางกฎหมาย (consent/contract/legal_obligation/vital_interest/public_task/legitimate_interest)
  legal_basis_detail  TEXT,               -- รายละเอียดเพิ่มเติมของฐานทางกฎหมาย

  -- ข้อมูลที่ประมวลผล
  data_categories     TEXT[] NOT NULL,     -- ประเภทข้อมูลที่เก็บ
  data_subjects       TEXT[] NOT NULL,     -- กลุ่มเจ้าของข้อมูล เช่น ['employee', 'approver']
  data_sources        TEXT[] NOT NULL,     -- แหล่งที่มาของข้อมูล

  -- การถ่ายโอนข้อมูล
  recipients          TEXT[],             -- ผู้รับข้อมูล (บุคคลหรือองค์กร)
  third_country_transfer BOOLEAN DEFAULT FALSE, -- ส่งข้อมูลออกนอกประเทศหรือไม่

  -- ระยะเวลา
  retention_period    TEXT NOT NULL,       -- ระยะเวลาเก็บรักษา เช่น "5 ปี"
  deletion_criteria   TEXT,               -- เกณฑ์การลบข้อมูล

  -- มาตรการรักษาความปลอดภัย
  security_measures   TEXT[],             -- มาตรการ เช่น ['bcrypt', 'https', 'rls']

  -- เมตาดาต้า
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          UUID               -- อ้างอิง user ที่สร้าง (optional)
);

COMMENT ON TABLE ropa_records IS 'ROPA: Record of Processing Activities ตาม PDPA มาตรา 39';

-- อัปเดต updated_at อัตโนมัติ
CREATE TRIGGER trg_ropa_updated_at
  BEFORE UPDATE ON ropa_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- B. CONSENT LOGS
--    บันทึกการให้/ถอนความยินยอม ตาม PDPA มาตรา 19
-- ============================================================
CREATE TABLE IF NOT EXISTS consent_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,          -- อ้างอิงผู้ใช้งาน (soft ref — ไม่ cascade delete)
  
  consent_type    TEXT NOT NULL           -- ประเภทความยินยอม
    CHECK (consent_type IN (
      'privacy_policy',        -- ยอมรับนโยบายความเป็นส่วนตัว
      'line_uid_processing',   -- ยินยอมใช้ LINE UID
      'signature_processing',  -- ยินยอมใช้ลายมือชื่ออิเล็กทรอนิกส์
      'data_deletion_request'  -- ขอลบข้อมูล
    )),
  
  consent_given   BOOLEAN NOT NULL,       -- true = ให้ความยินยอม, false = ถอนความยินยอม
  method          TEXT NOT NULL           -- วิธีการให้ความยินยอม
    CHECK (method IN ('checkbox', 'button_click', 'implicit')),
  
  policy_version  TEXT NOT NULL DEFAULT '1.0', -- เวอร์ชันนโยบายที่ยินยอม
  notes           TEXT,                   -- หมายเหตุเพิ่มเติม
  
  consented_at    TIMESTAMPTZ DEFAULT NOW() -- เวลาที่ให้ความยินยอม
);

COMMENT ON TABLE consent_logs IS 'บันทึกการให้และถอนความยินยอมตาม PDPA มาตรา 19';
COMMENT ON COLUMN consent_logs.consent_given IS 'true = ให้ความยินยอม, false = ถอนความยินยอม';
COMMENT ON COLUMN consent_logs.user_id IS 'Soft reference to users.id — ไม่มี FK เพื่อรักษาบันทึกแม้ลบ user แล้ว';

-- Index สำหรับ query เร็ว
CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id ON consent_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_type ON consent_logs (consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_logs_consented_at ON consent_logs (consented_at DESC);

-- ============================================================
-- C. DATA SUBJECT RIGHTS REQUESTS
--    คำร้องขอใช้สิทธิ์ตาม PDPA มาตรา 30-41
-- ============================================================
CREATE TABLE IF NOT EXISTS dsr_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,           -- ผู้ยื่นคำร้อง
  
  request_type    TEXT NOT NULL
    CHECK (request_type IN (
      'access',        -- ม.30 ขอเข้าถึง/สำเนาข้อมูล
      'rectification', -- ม.35 ขอแก้ไขข้อมูล
      'erasure',       -- ม.33 ขอลบ/ทำลายข้อมูล
      'restriction',   -- ม.34 ขอระงับการใช้ข้อมูล
      'objection',     -- ม.37 คัดค้านการประมวลผล
      'portability'    -- ม.36 ขอให้ส่งโอนข้อมูล
    )),
  
  reason          TEXT,                    -- เหตุผลประกอบคำร้อง
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  
  admin_notes     TEXT,                    -- บันทึกของผู้ดูแลระบบ
  processed_by    UUID,                    -- ผู้ดูแลที่จัดการคำร้อง
  processed_at    TIMESTAMPTZ,             -- เวลาที่จัดการ
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE dsr_requests IS 'คำร้องขอใช้สิทธิ์เจ้าของข้อมูล (Data Subject Rights) ตาม PDPA มาตรา 30-41';

CREATE TRIGGER trg_dsr_updated_at
  BEFORE UPDATE ON dsr_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_dsr_requests_user_id ON dsr_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_dsr_requests_status ON dsr_requests (status);

-- ============================================================
-- D. ENABLE RLS
-- ============================================================
ALTER TABLE ropa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsr_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- E. RLS POLICIES
-- ============================================================

-- ropa_records: อ่านได้ทุกคน, แก้ไขได้เฉพาะ super_admin
-- (สำหรับ users table ที่มีระบบ session cookie ใช้ service role)
CREATE POLICY "ropa_read_all" ON ropa_records
  FOR SELECT USING (TRUE);

-- consent_logs: ใช้ service role เท่านั้น (ไม่มี RLS policy สำหรับ anon/authenticated)
-- เพราะระบบนี้ใช้ service key ผ่าน server actions
CREATE POLICY "consent_logs_service_only" ON consent_logs
  FOR ALL USING (FALSE); -- ปิด direct client access ทั้งหมด

CREATE POLICY "dsr_requests_service_only" ON dsr_requests
  FOR ALL USING (FALSE); -- ปิด direct client access ทั้งหมด

-- ============================================================
-- F. SEED ROPA RECORDS (ข้อมูลตั้งต้นตามระบบ Easy OT)
-- ============================================================
INSERT INTO ropa_records (
  activity_name, activity_purpose, legal_basis, legal_basis_detail,
  data_categories, data_subjects, data_sources,
  recipients, retention_period, security_measures
) VALUES
(
  'การยืนยันตัวตนและการจัดการบัญชีผู้ใช้งาน',
  'ยืนยันตัวตนบุคลากรเพื่อเข้าใช้งานระบบ Easy OT',
  'contract',
  'การปฏิบัติตามสัญญาจ้างงานและภารกิจราชการ',
  ARRAY['ชื่อ-นามสกุล', 'ตำแหน่งงาน', 'กอง/สำนัก', 'Username', 'Password (bcrypt hash)'],
  ARRAY['employee', 'approver', 'admin'],
  ARRAY['ผู้ใช้งานกรอกเอง', 'ผู้ดูแลระบบสร้างให้'],
  ARRAY['บุคลากรในสายอนุมัติ'],
  'ตลอดระยะเวลาการปฏิบัติงาน + 5 ปี',
  ARRAY['bcrypt', 'https', 'rls', 'httponly_cookie']
),
(
  'การเชื่อมบัญชี LINE เพื่อรับการแจ้งเตือน',
  'แจ้งเตือนสถานะคำขอ OT ผ่าน LINE Official Account',
  'consent',
  'ผู้ใช้งานให้ความยินยอมผ่าน checkbox ณ จุดลงทะเบียน (PDPA ม.19)',
  ARRAY['LINE UID'],
  ARRAY['employee', 'approver'],
  ARRAY['LINE Platform (LIFF/OAuth)'],
  ARRAY['LINE Corporation (สำหรับส่ง push notification เท่านั้น)'],
  'จนกว่าจะยกเลิกการเชื่อมบัญชีหรือพ้นสภาพบุคลากร',
  ARRAY['https', 'line_uid_not_displayed_publicly']
),
(
  'การบริหารจัดการคำขอทำงานล่วงเวลา (OT)',
  'รับ-ส่งคำขอ OT ในสายการอนุมัติ และออกเอกสารราชการ',
  'public_task',
  'ภารกิจราชการของหน่วยงาน / ประโยชน์สาธารณะ (PDPA ม.24(4))',
  ARRAY['ชื่อ-นามสกุล', 'ตำแหน่ง', 'วันที่ทำงาน OT', 'เวลาเริ่ม-สิ้นสุด', 'ชั่วโมง OT', 'เหตุผล/ภารกิจ'],
  ARRAY['employee'],
  ARRAY['ผู้ใช้งานกรอกเอง'],
  ARRAY['บุคลากรในสายอนุมัติ (ผอ.กลุ่ม, ผอ.กอง)', 'ผู้ดูแลระบบ'],
  '5 ปีนับจากวันที่อนุมัติ (ตามระเบียบงานสารบรรณ)',
  ARRAY['rls', 'https']
),
(
  'การออกเอกสารราชการด้วยลายมือชื่ออิเล็กทรอนิกส์',
  'ออกหนังสือรับรองและเอกสาร OT อย่างเป็นทางการ',
  'consent',
  'ผู้ใช้งานอัปโหลดลายเซ็นด้วยความยินยอม (PDPA ม.19)',
  ARRAY['ลายมือชื่ออิเล็กทรอนิกส์ (ภาพลายเซ็น)'],
  ARRAY['approver', 'admin'],
  ARRAY['ผู้ใช้งานอัปโหลดเอง'],
  ARRAY['Google Drive (เฉพาะ PDF ที่ออกโดยระบบ)', 'บุคลากรในหน่วยงาน'],
  'ตลอดระยะเวลาการปฏิบัติงาน',
  ARRAY['https', 'google_drive_access_control']
),
(
  'การบันทึกหลักฐานการให้ความยินยอม (Consent Log)',
  'บันทึกหลักฐานเพื่อพิสูจน์การปฏิบัติตาม PDPA มาตรา 19',
  'legal_obligation',
  'หน้าที่ตามกฎหมาย PDPA มาตรา 28 — ต้องสามารถแสดงหลักฐานการได้รับความยินยอม',
  ARRAY['user_id', 'ประเภทความยินยอม', 'เวลาที่ให้ความยินยอม', 'วิธีการให้ความยินยอม', 'เวอร์ชันนโยบาย'],
  ARRAY['employee', 'approver', 'admin'],
  ARRAY['ระบบบันทึกอัตโนมัติ'],
  ARRAY['ผู้ดูแลระบบ (กรณีตรวจสอบ)'],
  'อย่างน้อย 5 ปีตาม PDPA',
  ARRAY['rls', 'service_role_only', 'https']
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- END OF PDPA MIGRATION
-- ============================================================
