-- This script inserts mock data into Supabase for development testing.
-- WARNING: Run this in the Supabase SQL Editor ONLY on a dev database.

-- 1. Insert a Division
INSERT INTO divisions (id, name) 
VALUES ('d0000000-0000-0000-0000-000000000001', 'กองประสานนโยบายและยุทธศาสตร์')
ON CONFLICT DO NOTHING;

-- 2. Insert Dummy Users into auth.users (Supabase requires this for foreign keys)
-- User 1: Employee
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000001', 'employee@test.com', '{"name": "สมหญิง ขยันดี"}')
ON CONFLICT DO NOTHING;

-- User 2: Supervisor
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000002', 'supervisor@test.com', '{"name": "สมชาย ใจดี"}')
ON CONFLICT DO NOTHING;

-- User 3: Admin / Director
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000003', 'admin@test.com', '{"name": "ผู้บริหาร สูงสุด"}')
ON CONFLICT DO NOTHING;

-- 3. Insert into public.users
INSERT INTO public.users (id, division_id, role, full_name, position, seniority_level)
VALUES 
('00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'employee', 'สมหญิง ขยันดี', 'เจ้าพนักงานธุรการ', 99),
('00000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'supervisor', 'สมชาย ใจดี', 'หัวหน้ากลุ่มงาน', 50),
('00000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'director', 'ผู้บริหาร สูงสุด', 'ผู้อำนวยการกอง', 1)
ON CONFLICT DO NOTHING;

-- 4. Setup an Approval Route for this Division
-- Step 1: Supervisor
INSERT INTO approval_routes (division_id, step_order, target_role)
VALUES ('d0000000-0000-0000-0000-000000000001', 1, 'supervisor')
ON CONFLICT DO NOTHING;

-- Step 2: Director
INSERT INTO approval_routes (division_id, step_order, target_role)
VALUES ('d0000000-0000-0000-0000-000000000001', 2, 'director')
ON CONFLICT DO NOTHING;
