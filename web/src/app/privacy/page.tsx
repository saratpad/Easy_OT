import Link from 'next/link'

export const metadata = {
  title: 'นโยบายคุ้มครองข้อมูลส่วนบุคคล | Easy OT',
  description: 'นโยบายความเป็นส่วนตัวและการคุ้มครองข้อมูลส่วนบุคคล ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm leading-tight">นโยบายคุ้มครองข้อมูลส่วนบุคคล</h1>
            <p className="text-[11px] text-slate-500">Easy OT — ระบบขออนุมัติการทำงานล่วงเวลา</p>
          </div>
          <div className="ml-auto">
            <Link href="/login" className="text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2">
              ← กลับหน้าเข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-full text-blue-700 font-medium">มีผลบังคับใช้: 1 มกราคม 2568</span>
          <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full">เวอร์ชัน 1.0</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-slate-700 leading-relaxed">
            เอกสารฉบับนี้ชี้แจงแนวปฏิบัติเกี่ยวกับการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของท่านภายใต้ระบบ <strong>Easy OT</strong> ซึ่งเป็นระบบบริหารและขออนุมัติการทำงานล่วงเวลาของหน่วยงาน จัดทำขึ้นตาม <strong>พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</strong> และกฎหมายที่เกี่ยวข้อง
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">1. ผู้ควบคุมข้อมูลส่วนบุคคล (Data Controller)</h2>
          <p className="text-sm text-slate-700 leading-relaxed">หน่วยงานที่ดำเนินการใช้ระบบ Easy OT ถือเป็นผู้ควบคุมข้อมูลส่วนบุคคล ตามความหมายของ PDPA มาตรา 6 โดยรับผิดชอบในการกำหนดวัตถุประสงค์และวิธีการประมวลผลข้อมูลส่วนบุคคลของเจ้าหน้าที่ผู้ใช้ระบบ</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">2. ข้อมูลส่วนบุคคลที่เก็บรวบรวม และฐานทางกฎหมาย (ROPA)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">ประเภทข้อมูล</th>
                  <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">รายละเอียด</th>
                  <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">วัตถุประสงค์</th>
                  <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">ฐานทางกฎหมาย</th>
                  <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">ระยะเก็บรักษา</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                <tr className="hover:bg-slate-50/50">
                  <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">ข้อมูลเพื่อระบุตัวตน</td>
                  <td className="border border-slate-200 px-3 py-2">ชื่อ-นามสกุล, ตำแหน่งงาน, กอง/สำนัก</td>
                  <td className="border border-slate-200 px-3 py-2">ระบุตัวตนผู้ใช้งานในระบบ</td>
                  <td className="border border-slate-200 px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-medium">ภารกิจราชการ (ม.24(4))</span></td>
                  <td className="border border-slate-200 px-3 py-2">ตลอดระยะเวลาการปฏิบัติงาน + 5 ปี</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">LINE UID</td>
                  <td className="border border-slate-200 px-3 py-2">ตัวระบุจาก LINE Platform</td>
                  <td className="border border-slate-200 px-3 py-2">เชื่อมบัญชีเพื่อรับการแจ้งเตือน</td>
                  <td className="border border-slate-200 px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">ความยินยอม (ม.19)</span></td>
                  <td className="border border-slate-200 px-3 py-2">จนกว่าจะยกเลิกการเชื่อมบัญชี</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">ข้อมูลบัญชีผู้ใช้</td>
                  <td className="border border-slate-200 px-3 py-2">Username, รหัสผ่านที่เข้ารหัส (bcrypt)</td>
                  <td className="border border-slate-200 px-3 py-2">ยืนยันตัวตนเพื่อเข้าสู่ระบบ</td>
                  <td className="border border-slate-200 px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-medium">ภารกิจราชการ (ม.24(4))</span></td>
                  <td className="border border-slate-200 px-3 py-2">ตลอดระยะเวลาการปฏิบัติงาน + 5 ปี</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">ข้อมูลการทำงาน OT</td>
                  <td className="border border-slate-200 px-3 py-2">วัน/เวลา, ชั่วโมง OT, เหตุผล, ภารกิจ</td>
                  <td className="border border-slate-200 px-3 py-2">บริหารจัดการคำขอ OT และออกเอกสาร</td>
                  <td className="border border-slate-200 px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-medium">ภารกิจราชการ (ม.24(4))</span></td>
                  <td className="border border-slate-200 px-3 py-2">5 ปีนับจากวันที่อนุมัติ</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">ลายมือชื่ออิเล็กทรอนิกส์</td>
                  <td className="border border-slate-200 px-3 py-2">ภาพลายเซ็นในรูปแบบดิจิทัล</td>
                  <td className="border border-slate-200 px-3 py-2">ออกหนังสือรับรองและเอกสารราชการ</td>
                  <td className="border border-slate-200 px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">ความยินยอม (ม.19)</span></td>
                  <td className="border border-slate-200 px-3 py-2">ตลอดระยะเวลาการปฏิบัติงาน</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">บันทึก Consent</td>
                  <td className="border border-slate-200 px-3 py-2">เวลา, ประเภทความยินยอม, วิธีการให้</td>
                  <td className="border border-slate-200 px-3 py-2">หลักฐานการให้ความยินยอมตาม PDPA</td>
                  <td className="border border-slate-200 px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-medium">ปฏิบัติตามกฎหมาย (ม.28)</span></td>
                  <td className="border border-slate-200 px-3 py-2">อย่างน้อย 5 ปี</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">3. การเปิดเผยข้อมูลส่วนบุคคล</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">▸</span>บุคลากรของหน่วยงานที่มีหน้าที่เกี่ยวข้องในสายการอนุมัติ (ผอ.กลุ่ม, ผอ.กอง)</li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">▸</span>LINE Corporation — เฉพาะ LINE UID สำหรับการส่งแจ้งเตือน</li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">▸</span>Google Drive — เฉพาะเอกสาร PDF ที่ออกโดยระบบ (หากเปิดใช้งาน)</li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">▸</span>หน่วยงานกำกับดูแลของรัฐ — ตามที่กฎหมายกำหนดเท่านั้น</li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">4. สิทธิ์ของเจ้าของข้อมูลส่วนบุคคล (PDPA มาตรา 30–41)</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { right: 'สิทธิ์รับทราบ (ม.30)', detail: 'รับรู้ว่ามีการเก็บข้อมูลใดบ้าง' },
              { right: 'สิทธิ์เข้าถึง (ม.30)', detail: 'ขอสำเนาข้อมูลส่วนบุคคลของตน' },
              { right: 'สิทธิ์แก้ไข (ม.35)', detail: 'ขอแก้ไขข้อมูลให้ถูกต้อง' },
              { right: 'สิทธิ์ลบ / ทำลาย (ม.33)', detail: 'ขอลบข้อมูลเมื่อหมดความจำเป็น' },
              { right: 'สิทธิ์คัดค้าน (ม.37)', detail: 'คัดค้านการประมวลผลในบางกรณี' },
              { right: 'สิทธิ์ถอนความยินยอม (ม.19)', detail: 'ถอนความยินยอมที่เคยให้ไว้ได้ทุกเมื่อ' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <div>
                  <p className="text-xs font-semibold text-slate-900">{item.right}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
            ⚠️ หากต้องการใช้สิทธิ์ กรุณาติดต่อผู้ดูแลระบบของหน่วยงาน หรือส่งคำร้องผ่านระบบได้ที่หน้า <strong>โปรไฟล์ → สิทธิ์ข้อมูลส่วนบุคคล</strong>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">5. มาตรการรักษาความปลอดภัยของข้อมูล</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            {[
              'รหัสผ่านเข้ารหัสด้วย bcrypt (ไม่มีการเก็บรหัสผ่านจริง)',
              'ข้อมูลส่งผ่าน HTTPS ตลอดเวลา',
              'ฐานข้อมูลมีการกำหนดสิทธิ์ Row Level Security (RLS)',
              'Session หมดอายุอัตโนมัติภายใน 30 วัน',
              'ไม่มีการเปิดเผย LINE UID ต่อสาธารณะ',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>{item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-3 pb-3 border-b border-slate-100">6. การติดต่อผู้ควบคุมข้อมูล</h2>
          <p className="text-sm text-slate-700">หากท่านมีข้อสงสัยหรือต้องการใช้สิทธิ์ใดๆ ตาม PDPA กรุณาติดต่อผู้ดูแลระบบ Easy OT ของหน่วยงานท่าน หรือส่งคำร้องผ่านเมนู <strong>โปรไฟล์ → สิทธิ์ข้อมูลส่วนบุคคล</strong> ในระบบ</p>
        </div>

        <div className="text-center pt-2 pb-8">
          <p className="text-[11px] text-slate-400">นโยบายนี้จัดทำขึ้นตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 และประกาศที่เกี่ยวข้อง</p>
          <Link href="/login" className="inline-block mt-3 px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
            กลับหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  )
}
