-- =====================================================
-- Easy OT — Database Migration (Phase 6 - Attendance Report)
-- Run this in Supabase SQL Editor
-- =====================================================

-- เพิ่มคอลัมน์ doc_type เพื่อแยกประเภทเอกสารระหว่าง บันทึกข้อความ (memo) และ บัญชีลงเวลา (attendance)
ALTER TABLE public.ot_documents
  ADD COLUMN IF NOT EXISTS doc_type TEXT NOT NULL DEFAULT 'memo' CHECK (doc_type IN ('memo', 'attendance'));
