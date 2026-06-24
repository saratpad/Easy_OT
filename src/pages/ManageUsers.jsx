import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Users, Edit2, CheckCircle, AlertCircle, Plus, X } from 'lucide-react'

export default function ManageUsers() {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  
  // Edit modal
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    if (['sub_admin', 'super_admin'].includes(profile?.role)) {
      fetchData()
    }
  }, [profile?.role])

  async function fetchData() {
    setLoading(true)
    
    // Fetch users
    let query = supabase.from('profiles').select('*, position:positions(name_th, rank_weight), department:departments(name_th)')
    if (profile.role !== 'super_admin') {
      query = query.eq('department_id', profile.department_id)
    }
    const { data: uData } = await query.order('created_at')
    if (uData) setUsers(uData)

    // Fetch positions
    const { data: pData } = await supabase.from('positions').select('id, name_th').order('rank_weight')
    if (pData) setPositions(pData)

    setLoading(false)
  }

  function showMsg(text, type) {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  async function handleSave(e) {
    e.preventDefault()
    
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        position_id: editForm.position_id || null,
        role: editForm.role,
        is_active: editForm.is_active
      })
      .eq('id', editingUser.id)

    if (error) {
      showMsg('เกิดข้อผิดพลาด: ' + error.message, 'danger')
    } else {
      showMsg('บันทึกข้อมูลเรียบร้อย', 'success')
      setEditingUser(null)
      fetchData()
    }
  }

  function openEdit(u) {
    setEditingUser(u)
    setEditForm({
      first_name: u.first_name,
      last_name: u.last_name,
      position_id: u.position_id,
      role: u.role,
      is_active: u.is_active
    })
  }

  if (!['sub_admin', 'super_admin'].includes(profile?.role)) {
    return <div style={{ padding: '2rem' }}>ไม่มีสิทธิ์เข้าถึง</div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">จัดการบุคลากร</h1>
          <p className="page-subtitle">จัดการข้อมูลส่วนตัว ตำแหน่ง และสิทธิ์การใช้งาน</p>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
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
                  <th>ชื่อ-สกุล</th>
                  <th>ตำแหน่ง</th>
                  <th>บทบาท (Role)</th>
                  <th>สถานะ</th>
                  {profile.role === 'super_admin' && <th>แผนก</th>}
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</td>
                    <td className="text-muted">{u.position?.name_th || '-'}</td>
                    <td><span className="badge" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>{u.role}</span></td>
                    <td>{u.is_active ? '✅ ใช้งาน' : '❌ ระงับ'}</td>
                    {profile.role === 'super_admin' && <td className="text-muted">{u.department?.name_th || '-'}</td>}
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>
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

      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">แก้ไขข้อมูลบุคลากร</div>
              <button className="btn-close" onClick={() => setEditingUser(null)}><X size={16}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">ชื่อ</label>
                    <input className="form-input" value={editForm.first_name} onChange={e => setEditForm(f => ({...f, first_name: e.target.value}))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">นามสกุล</label>
                    <input className="form-input" value={editForm.last_name} onChange={e => setEditForm(f => ({...f, last_name: e.target.value}))} required />
                  </div>
                </div>
                
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">ตำแหน่ง</label>
                  <select className="form-select" value={editForm.position_id || ''} onChange={e => setEditForm(f => ({...f, position_id: e.target.value}))}>
                    <option value="">-- ไม่ระบุ --</option>
                    {positions.map(p => <option key={p.id} value={p.id}>{p.name_th}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">บทบาทระบบ</label>
                  <select className="form-select" value={editForm.role} onChange={e => setEditForm(f => ({...f, role: e.target.value}))}>
                    <option value="employee">เจ้าหน้าที่ (Employee)</option>
                    <option value="supervisor">ผู้อนุมัติระดับ ๑ (Supervisor)</option>
                    <option value="commander">ผู้อนุมัติระดับ ๒ (Commander)</option>
                    <option value="supervising_commander">ผู้กำกับดูแล (Supervising Cmd)</option>
                    <option value="sub_admin">ผู้ดูแลแผนก (Sub Admin)</option>
                    {profile.role === 'super_admin' && <option value="super_admin">ผู้ดูแลระบบ (Super Admin)</option>}
                  </select>
                </div>

                <label className="checkbox-row">
                  <input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm(f => ({...f, is_active: e.target.checked}))} />
                  <span>เปิดใช้งานบัญชีนี้</span>
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingUser(null)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
