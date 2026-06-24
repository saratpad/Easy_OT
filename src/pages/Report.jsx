import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatThaiDate, formatTime } from '../lib/thaiDate'
import { StatusBadge } from '../components/StatusBadge'
import { Search, Download, Filter } from 'lucide-react'

export default function Report() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    if (profile?.department_id) fetchReport()
  }, [month, year, profile?.department_id])

  async function fetchReport() {
    setLoading(true)
    
    // Create date range for the month
    const start = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const end = new Date(year, month, 0).toISOString().split('T')[0]

    let query = supabase
      .from('ot_requests_detailed')
      .select('*')
      .gte('request_date', start)
      .lte('request_date', end)
      .order('request_date', { ascending: false })

    // Non-super-admins are scoped to their department
    if (profile.role !== 'super_admin') {
      query = query.eq('department_id', profile.department_id)
    }

    const { data, error } = await query
    
    if (!error) setRequests(data || [])
    setLoading(false)
  }

  // Calculate stats
  const totalHours = requests.reduce((acc, r) => acc + Number(r.total_hours || 0), 0)
  const approvedCount = requests.filter(r => r.status === 'approved_final').length
  const pendingCount = requests.filter(r => r.status.startsWith('pending') || r.status.startsWith('approved_supervisor') || r.status.startsWith('approved_commander')).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">รายงานการปฏิบัติงานล่วงเวลา</h1>
          <p className="page-subtitle">แสดงข้อมูลทั้งหมดของบุคลากร</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="form-group" style={{ maxWidth: 200 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--navy)' }}>เดือน</label>
          <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
            <option value={1}>มกราคม</option>
            <option value={2}>กุมภาพันธ์</option>
            <option value={3}>มีนาคม</option>
            <option value={4}>เมษายน</option>
            <option value={5}>พฤษภาคม</option>
            <option value={6}>มิถุนายน</option>
            <option value={7}>กรกฎาคม</option>
            <option value={8}>สิงหาคม</option>
            <option value={9}>กันยายน</option>
            <option value={10}>ตุลาคม</option>
            <option value={11}>พฤศจิกายน</option>
            <option value={12}>ธันวาคม</option>
          </select>
        </div>
        <div className="form-group" style={{ maxWidth: 150 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--navy)' }}>ปี (พ.ศ.)</label>
          <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[0, 1, 2, 3].map(offset => {
              const y = new Date().getFullYear() - offset
              return <option key={y} value={y}>{y + 543}</option>
            })}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-navy" onClick={() => window.print()}>
          <Download size={16} /> พิมพ์รายงาน
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card blue">
          <div className="stat-label">จำนวนคำขอทั้งหมด</div>
          <div className="stat-value">{requests.length}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">อนุมัติแล้วเสร็จ</div>
          <div className="stat-value">{approvedCount}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">อยู่ระหว่างพิจารณา</div>
          <div className="stat-value">{pendingCount}</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-label">รวมชั่วโมง (ชม.)</div>
          <div className="stat-value">{totalHours.toFixed(1)}</div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="spinner spinner-dark" />
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-title">ไม่พบข้อมูลในเดือนนี้</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>วันที่ขอ</th>
                  <th>ชื่อ-สกุล</th>
                  <th>เวลา</th>
                  <th>ชม.</th>
                  <th>สถานะ</th>
                  <th>เลขที่บันทึก</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'var(--font-en)', fontWeight: 600 }}>{r.request_code}</td>
                    <td>{formatThaiDate(r.request_date)}</td>
                    <td>{r.full_name}</td>
                    <td style={{ fontFamily: 'var(--font-en)' }}>{formatTime(r.ot_start_time)}–{formatTime(r.ot_end_time)}</td>
                    <td style={{ fontFamily: 'var(--font-en)' }}>{r.total_hours}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ fontFamily: 'var(--font-en)', color: 'var(--text-muted)' }}>{r.memo_number || '-'}</td>
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
