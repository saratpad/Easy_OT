import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Settings, Save, CheckCircle, AlertCircle } from 'lucide-react'

export default function DeptConfig() {
  const { profile } = useAuth()
  const [config, setConfig] = useState(null)
  const [dept, setDept] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (profile?.department_id) fetchData()
  }, [profile?.department_id])

  async function fetchData() {
    setLoading(true)

    // Dept Info
    const { data: dData } = await supabase.from('departments').select('*').eq('id', profile.department_id).single()
    if (dData) setDept(dData)

    // Approval Config
    const { data: cData } = await supabase.from('department_approval_config').select('*').eq('department_id', profile.department_id).single()
    if (cData) setConfig(cData)
    else {
      // Create if missing
      const { data: newC } = await supabase.from('department_approval_config').insert({ department_id: profile.department_id }).select().single()
      if (newC) setConfig(newC)
    }

    // Users in dept
    const { data: uData } = await supabase.from('profiles').select('id, first_name, last_name, role').eq('department_id', profile.department_id)
    if (uData) setUsers(uData)

    setLoading(false)
  }

  function showMsg(text, type) {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)

    const { error: e1 } = await supabase
      .from('department_approval_config')
      .update({
        supervisor_id: config.supervisor_id || null,
        commander_id: config.commander_id || null,
      })
      .eq('id', config.id)

    const { error: e2 } = await supabase
      .from('departments')
      .update({
        gas_webhook_url: dept.gas_webhook_url,
        gas_template_doc_id: dept.gas_template_doc_id,
        gas_pdf_folder_id: dept.gas_pdf_folder_id
      })
      .eq('id', dept.id)

    setSaving(false)

    if (e1 || e2) showMsg('เกิดข้อผิดพลาดในการบันทึก', 'danger')
    else showMsg('บันทึกการตั้งค่าแผนกเรียบร้อย', 'success')
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner spinner-dark" /></div>
  if (!dept || !config) return <div>ไม่พบข้อมูลแผนก</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">ตั้งค่าแผนก</h1>
          <p className="page-subtitle">จัดการสายการอนุมัติและการเชื่อมต่อระบบ GAS ของ {dept.name_th}</p>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'grid', gap: '1.5rem', maxWidth: 800 }}>
        
        {/* สายการอนุมัติ */}
        <div className="card">
          <div className="card-header"><div className="card-title">สายการอนุมัติ (Approval Chain)</div></div>
          
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">ผู้อนุมัติระดับ ๑ (ผอ.กลุ่ม / หัวหน้าฝ่าย)</label>
            <select className="form-select" value={config.supervisor_id || ''} onChange={e => setConfig({...config, supervisor_id: e.target.value})}>
              <option value="">-- ไม่ระบุ --</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">ผู้อนุมัติระดับ ๒ (ผอ.กนย.)</label>
            <select className="form-select" value={config.commander_id || ''} onChange={e => setConfig({...config, commander_id: e.target.value})}>
              <option value="">-- ไม่ระบุ --</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>)}
            </select>
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            * ผู้กำกับดูแล (ระดับ ๓) จะถูกกำหนดจากส่วนกลางโดยผู้ดูแลระบบ (Super Admin)
          </div>
        </div>

        {/* การเชื่อมต่อ GAS */}
        <div className="card">
          <div className="card-header"><div className="card-title">การเชื่อมต่อ Google Apps Script (Webhook)</div></div>
          
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">GAS Webhook URL (Web App Deployment URL)</label>
            <input 
              className="form-input" 
              type="text" 
              placeholder="https://script.google.com/macros/s/..."
              value={dept.gas_webhook_url || ''} 
              onChange={e => setDept({...dept, gas_webhook_url: e.target.value})} 
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Template Document ID (Google Doc)</label>
            <input 
              className="form-input" 
              type="text" 
              value={dept.gas_template_doc_id || ''} 
              onChange={e => setDept({...dept, gas_template_doc_id: e.target.value})} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">PDF Output Folder ID (Google Drive)</label>
            <input 
              className="form-input" 
              type="text" 
              value={dept.gas_pdf_folder_id || ''} 
              onChange={e => setDept({...dept, gas_pdf_folder_id: e.target.value})} 
            />
          </div>
        </div>

        <div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner" /> : <Save size={16} />}
            บันทึกการตั้งค่า
          </button>
        </div>
      </form>
    </div>
  )
}
