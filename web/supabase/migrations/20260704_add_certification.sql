-- =====================================================
-- Easy OT — Database Migration (Work Certification)
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. เพิ่มคอลัมน์สำหรับการรับรองการปฏิบัติงานใน ot_requests
ALTER TABLE public.ot_requests
  ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_total_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS is_certified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_worked BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS certification_note TEXT,
  ADD COLUMN IF NOT EXISTS certification_step INTEGER NOT NULL DEFAULT 0;

-- คำอธิบาย certification_step:
-- 0 = รอผู้อำนวยการกลุ่มรับรอง (หรือถูกตีกลับให้ปรับปรุง)
-- 1 = รอผู้อำนวยการกองรับรอง
-- 2 = รับรองเสร็จสิ้น

-- 2. แทรกการตั้งค่าระบบ enable_work_certification (ถ้ายังไม่มี)
INSERT INTO public.system_settings (key, value)
VALUES ('enable_work_certification', 'false')
ON CONFLICT (key) DO NOTHING;
