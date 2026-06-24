import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, Plus, Edit2, CheckCircle, AlertCircle } from 'lucide-react'

export default function Positions() {
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({})

  useEffect(() => {
    fetchPositions()
  }, [])

  async function fetchPositions() {
    setLoading(true)
    const { data } = await supabase.from('positions').select('*').order('rank_weight', { ascending: true })
    setPositions(data || [])
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
      rank_weight: Number(form.rank_weight)
    }

    if (editingId) {
      const { error } = await supabase.from('positions').update(payload).eq('id', editingId)
      if (error) showMsg(error.message, 'danger')
      else { showMsg('อัพเดทสำเร็จ', 'success'); setEditingId(null); fetchPositions() }
    } else {
      const { error } = await supabase.from('positions').insert(payload)
      if (error) showMsg(error.message, 'danger')
      else { showMsg('เพิ่มตำแหน่งสำเร็จ', 'success'); setEditingId(null); fetchPositions() }
    }
  }

  function openEdit(p) {
    setEditingId(p.id)
    setForm({ name_th: p.name_th, rank_weight: p.rank_weight })
  }

  function openNew() {
    setEditingId('new')
    setForm({ name_th: '', rank_weight: 99 })
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">ตำแหน่งและลำดับอาวุโส (Positions & Ranks)</h1>
          <p className="page-subtitle">กำหนดลำดับความสำคัญของตำแหน่ง (ค่าน้อย = อาวุโสมาก จะแสดงก่อนในเอกสาร)</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> เพิ่มตำแหน่ง
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
          <div className="card-header"><div className="card-title">{editingId === 'new' ? 'เพิ่มตำแหน่งใหม่' : 'แก้ไขตำแหน่ง'}</div></div>
          <form onSubmit={handleSave} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
             <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">ชื่อตำแหน่ง (ภาษาไทย) *</label>
              <input className="form-input" value={form.name_th} onChange={e => setForm({...form, name_th: e.target.value})} autoFocus required />
            </div>
            <div className="form-group" style={{ width: 150 }}>
              <label className="form-label">น้ำหนัก (Rank Weight)</label>
              <input type="number" className="form-input" value={form.rank_weight} onChange={e => setForm({...form, rank_weight: e.target.value})} min="1" required />
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>ยกเลิก</button>
              <button type="submit" className="btn btn-primary">บันทึก</button>
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
                  <th style={{ width: 80, textAlign: 'center' }}>ลำดับน้ำหนัก</th>
                  <th>ชื่อตำแหน่ง</th>
                  <th style={{ width: 100 }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(p => (
                  <tr key={p.id}>
                    <td style={{ textAlign: 'center', fontWeight: 700, fontFamily: 'var(--font-en)', color: 'var(--blue)' }}>{p.rank_weight}</td>
                    <td style={{ fontWeight: 600 }}>{p.name_th}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
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
