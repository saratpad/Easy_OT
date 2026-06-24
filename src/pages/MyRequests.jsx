import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { StatusBadge } from '../components/StatusBadge'
import { ApprovalTimeline } from '../components/ApprovalTimeline'
import { formatThaiDate, formatTime, calcHours, generateTimeOptions } from '../lib/thaiDate'
import { Plus, X, Clock, ChevronDown, AlertCircle, CheckCircle, FileText } from 'lucide-react'

export default function MyRequests() {
  const { profile } = useAuth()
  const [requests, setRequests]     = useState([])
  const [tasks, setTasks]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [selectedReq, setSelectedReq] = useState(null)
  const [submitting, setSubmitting]   = useState(false)
  const [message, setMessage]         = useState(null)

  // Form state
  const [form, setForm] = useState({
    request_date: '',
    ot_start_time: '16:00',
    ot_end_time: '20:00',
    task_id: '',
    task_custom: '',
  })

  const timeOptions = generateTimeOptions()

  useEffect(() => {
    fetchRequests()
    fetchTasks()
  }, [])

  // Real-time subscription
  useEffect(() => {
    if (!profile?.id) return
    const channel = supabase
      .channel('my_ot_updates')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'ot_requests',
        filter: `requester_id=eq.${profile.id}`
      }, () => fetchRequests())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [profile?.id])

  async function fetchRequests() {
    setLoading(true)
    const { data, error } = await supabase
      .from('ot_requests')
      .select(`*, task:tasks(name_th)`)
      .eq('requester_id', profile.id)
      .order('created_at', { ascending: false })
    if (!error) setRequests(data || [])
    setLoading(false)
  }

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('id, name_th')
      .or(`department_id.eq.${profile.department_id},department_id.is.null`)
      .eq('is_active', true)
      .order('name_th')
    setTasks(data || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.request_date) return showMsg('กรุณาเลือกวันที่ขอทำงานล่วงเวลา', 'danger')
    const hours = calcHours(form.ot_start_time, form.ot_end_time)
    if (hours <= 0) return showMsg('เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น', 'danger')

    setSubmitting(true)
    const payload = {
      requester_id:  profile.id,
      department_id: profile.department_id,
      request_date:  form.request_date,
      ot_start_time: form.ot_start_time,
      ot_end_time:   form.ot_end_time,
      total_hours:   hours,
      task_id:       form.task_id || null,
      task_custom:   form.task_custom || null,
      status:        'pending_supervisor',
    }

    const { error } = await supabase.from('ot_requests').insert(payload)
    setSubmitting(false)

    if (error) return showMsg('เกิดข้อผิดพลาด: ' + error.message, 'danger')

    showMsg('ส่งคำขอสำเร็จแล้ว!', 'success')
    setShowForm(false)
    setForm({ request_date: '', ot_start_time: '16:00', ot_end_time: '20:00', task_id: '', task_custom: '' })
    fetchRequests()
  }

  async function handleCancel(reqId) {
    if (!confirm('ยืนยันการยกเลิกคำขอนี้?')) return
    const { error } = await supabase
      .from('ot_requests')
      .update({ status: 'cancelled' })
      .eq('id', reqId)
      .eq('requester_id', profile.id)
      .eq('status', 'pending_supervisor')
    if (error) showMsg('ไม่สามารถยกเลิกได้: ' + error.message, 'danger')
    else { showMsg('ยกเลิกคำขอสำเร็จ', 'success'); fetchRequests() }
  }

  function showMsg(text, type) {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const hours = calcHours(form.ot_start_time, form.ot_end_time)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">คำขอทำงานล่วงเวลาของฉัน</h1>
          <p className="page-subtitle">ประวัติคำขอและสถานะการพิจารณา</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(v => !v)}
        >
          {showForm ? <><X size={16} /> ปิดฟอร์ม</> : <><Plus size={16} /> แจ้งขออนุญาตทำงานล่วงเวลา</>}
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* OT Request Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem', borderTop: '3px solid var(--blue)' }}>
          <div className="card-header">
            <div>
              <div className="card-title">แบบฟอร์มขอทำงานล่วงเวลา</div>
              <div className="card-subtitle">กรอกข้อมูลให้ครบถ้วนก่อนส่งคำขอ</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">วันที่ขอทำงานล่วงเวลา *</label>
              <input
                type="date"
                className="form-input"
                value={form.request_date}
                onChange={e => setForm(f => ({ ...f, request_date: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">เวลาเริ่มต้น</label>
                <select
                  className="form-select"
                  value={form.ot_start_time}
                  onChange={e => setForm(f => ({ ...f, ot_start_time: e.target.value }))}
                >
                  {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">เวลาสิ้นสุด</label>
                <select
                  className="form-select"
                  value={form.ot_end_time}
                  onChange={e => setForm(f => ({ ...f, ot_end_time: e.target.value }))}
                >
                  {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">จำนวนชั่วโมง</label>
                <input
                  className="form-input"
                  type="text"
                  value={hours > 0 ? `${hours} ชั่วโมง` : '-'}
                  readOnly
                  style={{ background: 'var(--surface)', fontWeight: 600, color: hours > 0 ? 'var(--blue)' : 'var(--text-muted)' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">ภารกิจ / งานที่ปฏิบัติ *</label>
              <select
                className="form-select"
                value={form.task_id}
                onChange={e => setForm(f => ({ ...f, task_id: e.target.value }))}
              >
                <option value="">-- เลือกภารกิจ --</option>
                {tasks.map(t => <option key={t.id} value={t.id}>{t.name_th}</option>)}
                <option value="custom">➕ ระบุเอง...</option>
              </select>
            </div>

            {form.task_id === 'custom' && (
              <div className="form-group">
                <label className="form-label">ระบุภารกิจ</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="กรอกชื่อภารกิจ"
                  value={form.task_custom}
                  onChange={e => setForm(f => ({ ...f, task_custom: e.target.value }))}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                ยกเลิก
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <><span className="spinner" /> กำลังส่ง...</> : <><FileText size={16} /> ส่งคำขอ</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requests list */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">รายการคำขอทั้งหมด</div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{requests.length} รายการ</span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner spinner-dark" style={{ margin: '0 auto 0.75rem' }} />
            กำลังโหลด...
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">ยังไม่มีคำขอทำงานล่วงเวลา</div>
            <div className="empty-state-sub">กดปุ่ม "แจ้งขออนุญาต" เพื่อสร้างคำขอใหม่</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>รหัสคำขอ</th>
                  <th>วันที่ขอ</th>
                  <th>เวลา</th>
                  <th>ชม.</th>
                  <th>ภารกิจ</th>
                  <th>สถานะ</th>
                  <th>ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td><span style={{ fontFamily: 'var(--font-en)', fontWeight: 600, color: 'var(--blue)' }}>{r.request_code}</span></td>
                    <td>{formatThaiDate(r.request_date)}</td>
                    <td style={{ fontFamily: 'var(--font-en)' }}>{formatTime(r.ot_start_time)} – {formatTime(r.ot_end_time)}</td>
                    <td style={{ fontFamily: 'var(--font-en)', fontWeight: 600 }}>{r.total_hours}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.task?.name_th || r.task_custom || '-'}
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedReq(r)}
                        >
                          รายละเอียด
                        </button>
                        {r.status === 'pending_supervisor' && (
                          <button
                            className="btn btn-sm"
                            onClick={() => handleCancel(r.id)}
                            style={{ background: 'var(--danger-dim)', color: 'var(--danger)' }}
                          >
                            ยกเลิก
                          </button>
                        )}
                        {r.document_url && (
                          <a href={r.document_url} target="_blank" rel="noopener noreferrer" className="btn btn-teal btn-sm">
                            📄 PDF
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedReq && (
        <div className="modal-overlay" onClick={() => setSelectedReq(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">รายละเอียดคำขอ {selectedReq.request_code}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {formatThaiDate(selectedReq.request_date)} · {formatTime(selectedReq.ot_start_time)}–{formatTime(selectedReq.ot_end_time)} น. ({selectedReq.total_hours} ชม.)
                </div>
              </div>
              <button className="btn-close" onClick={() => setSelectedReq(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1.25rem' }}>
                <StatusBadge status={selectedReq.status} />
                <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <strong>ภารกิจ:</strong> {selectedReq.task?.name_th || selectedReq.task_custom || '-'}
                </div>
              </div>
              <div className="card-title" style={{ fontSize: '0.9rem', marginBottom: '0.875rem' }}>สถานะการพิจารณา</div>
              <ApprovalTimeline request={selectedReq} />
              {selectedReq.document_url && (
                <div style={{ marginTop: '1rem' }}>
                  <a href={selectedReq.document_url} target="_blank" rel="noopener noreferrer" className="btn btn-teal">
                    📄 ดูเอกสาร PDF
                  </a>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelectedReq(null)}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
