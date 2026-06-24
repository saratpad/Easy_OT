import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ClipboardList, Plus, Edit2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'

export default function Tasks() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ id: null, name_th: '', is_active: true })

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    setLoading(true)
    let query = supabase.from('tasks').select('*').order('created_at', { ascending: false })
    
    if (profile?.role !== 'super_admin') {
      // Sub admin only sees their dept tasks and global tasks
      query = query.or(`department_id.eq.${profile.department_id},department_id.is.null`)
    }
    
    const { data } = await query
    setTasks(data || [])
    setLoading(false)
  }

  function showMsg(text, type) {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name_th.trim()) return showMsg('กรุณากรอกชื่อภารกิจ', 'danger')

    const payload = {
      name_th: form.name_th.trim(),
      is_active: form.is_active,
      department_id: profile.role === 'super_admin' ? null : profile.department_id // Super admin creates global tasks here for simplicity
    }

    if (form.id) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', form.id)
      if (error) showMsg(error.message, 'danger')
      else { showMsg('แก้ไขภารกิจสำเร็จ', 'success'); setShowForm(false); fetchTasks() }
    } else {
      const { error } = await supabase.from('tasks').insert(payload)
      if (error) showMsg(error.message, 'danger')
      else { showMsg('เพิ่มภารกิจสำเร็จ', 'success'); setShowForm(false); fetchTasks() }
    }
  }

  function openEdit(t) {
    setForm({ id: t.id, name_th: t.name_th, is_active: t.is_active })
    setShowForm(true)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">จัดการภารกิจ</h1>
          <p className="page-subtitle">รายการภารกิจที่จะให้เจ้าหน้าที่เลือกเวลาขอทำ OT</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ id: null, name_th: '', is_active: true }); setShowForm(!showForm) }}>
          <Plus size={16} /> เพิ่มภารกิจใหม่
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--blue)' }}>
          <div className="card-header"><div className="card-title">{form.id ? 'แก้ไขภารกิจ' : 'เพิ่มภารกิจใหม่'}</div></div>
          <form onSubmit={handleSave} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">ชื่อภารกิจ</label>
              <input className="form-input" value={form.name_th} onChange={e => setForm({...form, name_th: e.target.value})} autoFocus />
            </div>
            <label className="checkbox-row" style={{ padding: '0.6rem 0' }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
              <span>เปิดใช้งาน</span>
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>ยกเลิก</button>
              <button type="submit" className="btn btn-primary">บันทึก</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
           <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner spinner-dark" /></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-title">ยังไม่มีรายการภารกิจ</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ชื่อภารกิจ</th>
                  <th>ประเภท</th>
                  <th>สถานะ</th>
                  <th style={{ width: 100 }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id} style={{ opacity: t.is_active ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 600 }}>{t.name_th}</td>
                    <td>{t.department_id ? 'เฉพาะแผนก' : <span className="badge" style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}>ส่วนกลาง</span>}</td>
                    <td>{t.is_active ? '✅ ใช้งาน' : '❌ ปิดใช้งาน'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)} disabled={profile.role !== 'super_admin' && !t.department_id}>
                        <Edit2 size={14} /> แก้ไข
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
