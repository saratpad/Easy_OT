-- Run this script in Supabase SQL Editor to temporarily disable RLS during development testing
-- Note: We will re-enable this before going to production

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE ot_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE ot_request_approvals DISABLE ROW LEVEL SECURITY;
ALTER TABLE approval_routes DISABLE ROW LEVEL SECURITY;
