-- =====================================================
-- Easy OT — Database Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. เพิ่ม columns ใน divisions
ALTER TABLE public.divisions
  ADD COLUMN IF NOT EXISTS executive_ids      UUID[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS drive_folder_id    TEXT,
  ADD COLUMN IF NOT EXISTS doc_number_prefix  TEXT    DEFAULT 'กนย',
  ADD COLUMN IF NOT EXISTS recipient_name     TEXT    DEFAULT 'เลขาธิการนายกรัฐมนตรี',
  ADD COLUMN IF NOT EXISTS phone              TEXT,
  ADD COLUMN IF NOT EXISTS is_deleted         BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. สร้างตาราง ot_documents
CREATE TABLE IF NOT EXISTS public.ot_documents (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  division_id   UUID        NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  created_by    UUID        NOT NULL REFERENCES public.users(id),
  fiscal_year   TEXT        NOT NULL,
  month_year    TEXT        NOT NULL,
  doc_number    TEXT,
  request_ids   UUID[]      NOT NULL DEFAULT '{}',
  format        TEXT        NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'docx')),
  document_url  TEXT,
  line_sent     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Index สำหรับ query บ่อย
CREATE INDEX IF NOT EXISTS idx_ot_documents_division_id
  ON public.ot_documents(division_id);

CREATE INDEX IF NOT EXISTS idx_ot_documents_fiscal_year
  ON public.ot_documents(fiscal_year);

CREATE INDEX IF NOT EXISTS idx_ot_requests_fiscal_year
  ON public.ot_requests(fiscal_year);

CREATE INDEX IF NOT EXISTS idx_ot_requests_status
  ON public.ot_requests(status);

-- 4. ตรวจสอบ is_deleted ใน users (ถ้ายังไม่มี)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- 5. ตรวจสอบ is_deleted ใน ot_requests (ถ้ายังไม่มี)
ALTER TABLE public.ot_requests
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
