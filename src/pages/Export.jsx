import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { callGasWebhook } from '../lib/gasWebhook'
import { useAuth } from '../contexts/AuthContext'
import { formatThaiDate, formatTime } from '../lib/thaiDate'
import { FileText, CheckCircle, AlertCircle, Search } from 'lucide-react'
import { MemoNumberModal } from '../components/MemoNumberModal'
import { StatusBadge } from '../components/StatusBadge'

export default function Export() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [message, setMessage] = useState(null)
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [exporting, setExporting] = useState(false)

  const role = profile?.role

  useEffect(() => {
    if (profile?.department_id && ['commander', 'sub_admin'].includes(role)) {
      fetchExportable()
    }
  }, [profile?.department_id, role])

  async function fetchExportable() {
    setLoading(true)
    const { data, error } = await supabase
      .from('ot_requests_detailed')
      .select('*')
      .eq('department_id', profile.department_id)
      .eq('status', 'approved_final')
      .order('rank_weight', { ascending: true })

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
    setTimeout(() => setMessage(null), 8000)
  }

  async function handleExportConfirm(memoNumber) {
    setExporting(true)
    setMessage(null)

    const selectedReqs = requests.filter(r => selectedIds.has(r.id))
    
    // We need supervising commander info from the assignment or just leave it for GAS to complain?
    // In our schema, the latest supervisor is in the record: supervising_commander_id
    // But what if it's auto-approved? Actually `approved_final` means it passed all tiers.
    // Let's fetch the supervising commander profile of the first selected request
    let supervisingInfo = {}
    const scId = selectedReqs[0]?.supervising_commander_id
    if (scId) {
      const { data: scData } = await supabase
        .from('profiles')
        .select(`first_name, last_name, signature_drive_id, positions(name_th)`)
        .eq('id', scId)
        .single()
      
      if (scData) {
        supervisingInfo = {
          full_name: `${scData.first_name} ${scData.last_name}`,
          position_th: scData.positions?.name_th || '',
          signature_drive_id: scData.signature_drive_id,
          approval_time: selectedReqs[0].supervising_at
        }
      }
    }

    // Prepare payload
    const payload = {
      action: "generate_ot_document",
      memo_number: memoNumber,
      department: {
        id: profile.department.id,
        name_th: profile.department.name_th,
        line_notify_token: profile.department.line_notify_token,
        gas_pdf_folder_id: profile.department.gas_pdf_folder_id,
        gas_template_doc_id: profile.department.gas_template_doc_id
      },
      supervising_commander: supervisingInfo,
      requests: selectedReqs.map(r => ({
        request_code: r.request_code,
        request_date: r.request_date,
        request_date_th: formatThaiDate(r.request_date),
        requester_full_name: r.full_name,
        requester_position_th: r.position_th,
        requester_rank_weight: r.rank_weight,
        ot_start_time: formatTime(r.ot_start_time),
        ot_end_time: formatTime(r.ot_end_time),
        total_hours: r.total_hours,
        task: r.task_custom || r.task_id // Should ideally be joined task name
      }))
    }

    // Call GAS Webhook
    const res = await callGasWebhook(profile.department.gas_webhook_url, payload)

    if (!res.success) {
      setExporting(false)
      showMsg(`การส่งออกผิดพลาดจากระบบ GAS: ${res.error}`, 'danger')
      return
    }

    // Success! Log export
    const { data: logData } = await supabase
      .from('export_logs')
      .insert({
        exported_by: profile.id,
        department_id: profile.department_id,
        memo_number: memoNumber,
        request_ids: Array.from(selectedIds),
        document_url: res.file_url,
        line_notified: res.line_notified
      })
      .select('id')
      .single()

    // Update requests with memo_number and document_url and exported_at
    await supabase
      .from('ot_requests')
      .update({
        memo_number: memoNumber,
        document_url: res.file_url,
        exported_at: new Date().toISOString()
      })
      .in('id', Array.from(selectedIds))

    setExporting(false)
    setShowModal(false)
    showMsg(`สร้างเอกสารและส่งออกเรียบร้อย! ส่งแจ้งเตือน LINE ${res.line_notified ? 'สำเร็จ' : 'ไม่สำเร็จ'}`, 'success')
    fetchExportable()
  }

  if (!['commander', 'sub_admin'].includes(role)) {
    return <div style={{ padding: '2rem' }}>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">ส่งออกเอกสาร OT</h1>
          <p className="page-subtitle">เลือกรายการที่อนุมัติเสร็จสิ้นแล้ว เพื่อออกเอกสารบันทึกข้อความ (PDF)</p>
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
          <div className="selected-count">{selectedIds.size} รายการที่พร้อมส่งออก</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <FileText size={16} /> ออกเอกสาร (Generate PDF)
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
            <div className="empty-state-icon">📄</div>
            <div className="empty-state-title">ไม่มีรายการที่พร้อมส่งออก</div>
            <div className="empty-state-sub">คำขอต้องผ่านการอนุมัติขั้นสุดท้ายเรียบร้อยแล้ว จึงจะแสดงที่นี่</div>
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
                  <th>ชม.</th>
                  <th>สถานะ</th>
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
                      <div className="text-muted">{r.position_th || '-'}</div>
                    </td>
                    <td>{formatThaiDate(r.request_date)}</td>
                    <td style={{ fontFamily: 'var(--font-en)' }}>{formatTime(r.ot_start_time)}–{formatTime(r.ot_end_time)}</td>
                    <td style={{ fontFamily: 'var(--font-en)', fontWeight: 600 }}>{r.total_hours}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MemoNumberModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        onConfirm={handleExportConfirm}
        isLoading={exporting}
        selectedCount={selectedIds.size}
      />
    </div>
  )
}
