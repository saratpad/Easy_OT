import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatThaiDate, formatTime } from '../lib/thaiDate'
import { CheckSquare, XSquare, Search, AlertCircle, CheckCircle, X } from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import { ApprovalTimeline } from '../components/ApprovalTimeline'

export default function Approve() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [message, setMessage] = useState(null)
  
  // Detail modal
  const [selectedReq, setSelectedReq] = useState(null)
  const [actionNote, setActionNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const role = profile?.role

  useEffect(() => {
    if (role) fetchPending()
  }, [role])

  async function fetchPending() {
    setLoading(true)
    let statusFilter = ''
    if (role === 'supervisor') statusFilter = 'pending_supervisor'
    else if (role === 'commander') statusFilter = 'approved_supervisor'
    else if (role === 'supervising_commander') statusFilter = 'approved_commander'
    else { setLoading(false); return }

    // Use the detailed view if we made one, or we can just join tables
    // In schema, we made `ot_requests_detailed` view, but Supabase JS doesn't return joined columns easily without explicit view query
    // Let's query the view directly!
    const { data, error } = await supabase
      .from('ot_requests_detailed')
      .select('*')
      .eq('status', statusFilter)
      .order('rank_weight', { ascending: true }) // Sort by rank!
      .order('created_at', { ascending: true })

    if (error) console.error(error)
    else setRequests(data || [])
    
    setLoading(false)
    setSelectedIds(new Set())
  }

  function toggleSelect(id) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  function toggleSelectAll() {
    if (selectedIds.size === requests.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(requests.map(r => r.id)))
  }

  function showMsg(text, type) {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  // Handle Approve / Reject
  async function handleAction(actionType, reqIds, note = '') {
    if (reqIds.length === 0) return
    if (!confirm(`ยืนยันการ${actionType === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'} ${reqIds.length} รายการ?`)) return
    
    setSubmitting(true)

    // Determine the next status based on current role
    let nextStatus = ''
    let updateFields = {}
    const now = new Date().toISOString()

    if (role === 'supervisor') {
      nextStatus = actionType === 'approved' ? 'approved_supervisor' : 'rejected_supervisor'
      updateFields = {
        status: nextStatus,
        supervisor_id: profile.id,
        supervisor_action: actionType,
        supervisor_at: now,
        supervisor_note: note
      }
    } else if (role === 'commander') {
      nextStatus = actionType === 'approved' ? 'approved_commander' : 'rejected_commander'
      updateFields = {
        status: nextStatus,
        commander_id: profile.id,
        commander_action: actionType,
        commander_at: now,
        commander_note: note
      }
    } else if (role === 'supervising_commander') {
      nextStatus = actionType === 'approved' ? 'approved_final' : 'rejected_final'
      updateFields = {
        status: nextStatus,
        supervising_commander_id: profile.id,
        supervising_action: actionType,
        supervising_at: now,
        supervising_note: note
      }
    }

    // Supabase update in
    const { error } = await supabase
      .from('ot_requests')
      .update(updateFields)
      .in('id', reqIds)

    setSubmitting(false)
    
    if (error) {
      showMsg('เกิดข้อผิดพลาด: ' + error.message, 'danger')
    } else {
      showMsg('ดำเนินการสำเร็จ', 'success')
      setSelectedReq(null)
      setActionNote('')
      fetchPending()
    }
  }

  if (!['supervisor', 'commander', 'supervising_commander'].includes(role)) {
    return <div style={{ padding: '2rem' }}>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">รายการรออนุมัติ</h1>
          <p className="page-subtitle">พิจารณาคำขอทำงานล่วงเวลาเรียงตามลำดับอาวุโส</p>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="bulk-bar">
          <div className="selected-count">{selectedIds.size} รายการที่เลือก</div>
          <button className="btn btn-danger btn-sm" onClick={() => handleAction('rejected', Array.from(selectedIds))}>
            <XSquare size={16} /> ไม่อนุมัติ
          </button>
          <button className="btn btn-success btn-sm" onClick={() => handleAction('approved', Array.from(selectedIds))}>
            <CheckSquare size={16} /> อนุมัติ
          </button>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner spinner-dark" style={{ margin: '0 auto 0.75rem' }} />
            กำลังโหลดข้อมูล...
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <div className="empty-state-title">ไม่มีคำขอค้างอนุมัติ</div>
            <div className="empty-state-sub">เยี่ยมมาก! คุณจัดการคำขอหมดแล้ว</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      onChange={toggleSelectAll} 
                      checked={requests.length > 0 && selectedIds.size === requests.length}
                    />
                  </th>
                  <th>ผู้ขออนุญาต</th>
                  <th>วันที่ขอ</th>
                  <th>เวลา</th>
                  <th>ภารกิจ</th>
                  <th>แผนก</th>
                  <th style={{ width: 100 }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(r.id)} 
                        onChange={() => toggleSelect(r.id)} 
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.full_name}</div>
                      <div className="text-muted">{r.position_th || 'ไม่มีตำแหน่ง'}</div>
                    </td>
                    <td>{formatThaiDate(r.request_date)}</td>
                    <td style={{ fontFamily: 'var(--font-en)' }}>{formatTime(r.ot_start_time)}–{formatTime(r.ot_end_time)}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.task_custom || r.task_id} {/* In a real app we'd fetch the task name from joined view if we exposed it. Oh wait, we used ot_requests_detailed! We should ensure task name is there. */}
                    </td>
                    <td className="text-muted">{r.department_th}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedReq(r)}>
                        พิจารณา
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Individual Action Modal */}
      {selectedReq && (
        <div className="modal-overlay" onClick={() => !submitting && setSelectedReq(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">พิจารณาคำขอ {selectedReq.request_code}</div>
              <button className="btn-close" disabled={submitting} onClick={() => setSelectedReq(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div className="text-muted">ผู้ขออนุญาต:</div>
                  <div style={{ fontWeight: 600 }}>{selectedReq.full_name} ({selectedReq.position_th})</div>
                  <div className="text-muted">วันที่:</div>
                  <div>{formatThaiDate(selectedReq.request_date)}</div>
                  <div className="text-muted">เวลา:</div>
                  <div style={{ fontFamily: 'var(--font-en)' }}>{formatTime(selectedReq.ot_start_time)} – {formatTime(selectedReq.ot_end_time)} ({selectedReq.total_hours} ชม.)</div>
                  <div className="text-muted">แผนก:</div>
                  <div>{selectedReq.department_th}</div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">หมายเหตุ / ความเห็น (ถ้ามี)</label>
                <textarea 
                  className="form-textarea" 
                  value={actionNote} 
                  onChange={e => setActionNote(e.target.value)}
                  placeholder="เหตุผลในการไม่อนุมัติ หรือข้อสังเกตเพิ่มเติม..."
                  disabled={submitting}
                />
              </div>

              <div className="card-title" style={{ fontSize: '0.9rem', marginBottom: '0.875rem' }}>สถานะปัจจุบัน</div>
              <ApprovalTimeline request={selectedReq} />
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => setSelectedReq(null)} 
                disabled={submitting}
              >
                ยกเลิก
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => handleAction('rejected', [selectedReq.id], actionNote)}
                disabled={submitting}
              >
                <XSquare size={16} /> ไม่อนุมัติ
              </button>
              <button 
                className="btn btn-success" 
                onClick={() => handleAction('approved', [selectedReq.id], actionNote)}
                disabled={submitting}
              >
                <CheckSquare size={16} /> อนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
