# Easy-OT Modernization

ระบบขออนุมัติทำงานล่วงเวลา (Overtime Request System) ที่ถูกพัฒนาใหม่ (Modernized) จาก Google Apps Script (GAS) เดิม 
สู่สถาปัตยกรรม React + Supabase (PostgreSQL) + GAS Webhook

## สถาปัตยกรรม (Architecture)
- **Frontend**: React + Vite (สำหรับ Deploy บน Netlify)
- **Backend / Database / Auth**: Supabase
- **Document Generation Microservice**: Google Apps Script (GAS)

## การติดตั้งและการรัน (Local Development)

1. **ติดตั้ง Dependencies**
   ```bash
   npm install
   ```

2. **ตั้งค่า Environment Variables**
   คัดลอกไฟล์ `.env.example` ไปเป็น `.env` และกรอกค่า:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_GAS_SECRET=your-shared-secret
   ```

3. **รันแอพพลิเคชัน**
   ```bash
   npm run dev
   ```

## การ Setup ระบบ Database (Supabase)
ไฟล์ `supabase/schema.sql` มีโครงสร้าง Table และ RLS Policies ทั้งหมด
ให้นำโค้ดในไฟล์นั้นไปรันใน SQL Editor ของหน้าเว็บ Supabase เพื่อสร้างระบบหลังบ้าน

## ขั้นตอนต่อไป (Next Phase)
- **GAS Microservice**: สร้างไฟล์ `Code.gs` สำหรับรับ Webhook เพื่อนำรายชื่อที่จัดเรียงลำดับอาวุโสไปกรอกลง Google Docs Template แล้วแปลงเป็น PDF พร้อมแจ้งเตือนเข้า LINE Notify
