import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Building2, Plus, Edit2, CheckCircle, AlertCircle } from 'lucide-react'

export default function Departments() {
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({})

  useEffect(() => {
    fetchDepts()
  }, [])

  async function fetchDepts() {
    setLoading(true)
    const { data } = await supabase.from('departments').select('*').order('created_at')
    setDepts(data || [])
    setLoading(false)
  }

  function showMsg(text, type) {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name_th.trim()) return

    const payload = {
      name_th: form.name_th.trim(),
      line_notify_token: form.line_notify_token,
      is_active: form.is_active
    }

    if (editingId) {
      const { error } = await supabase.from('departments').update(payload).eq('id', editingId)
      if (error) showMsg(error.message, 'danger')
      else { showMsg('อัพเดทสำเร็จ', 'success'); setEditingId(null); fetchDepts() }
    } else {
      const { error } = await supabase.from('departments').insert(payload)
      if (error) showMsg(error.message, 'danger')
      else { showMsg('เพิ่มแผนกสำเร็จ', 'success'); setEditingId(null); fetchDepts() }
    }
  }

  function openEdit(d) {
    setEditingId(d.id)
    setForm({ name_th: d.name_th, line_notify_token: d.line_notify_token, is_active: d.is_active })
  }

  function openNew() {
    setEditingId('new')
    setForm({ name_th: '', line_notify_token: '', is_active: true })
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">จัดการแผนก (Departments)</h1>
          <p className="page-subtitle">จัดการรายชื่อแผนกและ LINE Notify Token</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> เพิ่มแผนกใหม่
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {editingId && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--blue)' }}>
          <div className="card-header"><div className="card-title">{editingId === 'new' ? 'เพิ่มแผนกใหม่' : 'แก้ไขแผนก'}</div></div>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
               <div className="form-group">
                <label className="form-label">ชื่อแผนก (ภาษาไทย) *</label>
                <input className="form-input" value={form.name_th} onChange={e => setForm({...form, name_th: e.target.value})} autoFocus required />
              </div>
              <div className="form-group">
                <label className="form-label">LINE Notify Token (ของกลุ่ม)</label>
                <input className="form-input" value={form.line_notify_token || ''} onChange={e => setForm({...form, line_notify_token: e.target.value})} placeholder="ใส่ Token ของกลุ่ม LINE แผนกนี้" />
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="checkbox-row">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
                <span>เปิดใช้งานแผนกนี้</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">บันทึก</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner spinner-dark" /></div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ชื่อแผนก</th>
                  <th>LINE Token</th>
                  <th>สถานะ</th>
                  <th style={{ width: 100 }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {depts.map(d => (
                  <tr key={d.id} style={{ opacity: d.is_active ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 600 }}>{d.name_th}</td>
                    <td>{d.line_notify_token ? '🔑 ตั้งค่าแล้ว' : <span className="text-muted">ยังไม่ตั้งค่า</span>}</td>
                    <td>{d.is_active ? '✅ ใช้งาน' : '❌ ปิดใช้งาน'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(d)}>
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
