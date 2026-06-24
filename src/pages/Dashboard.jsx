import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, CheckSquare, XCircle, FileText, BarChart2 } from 'lucide-react'

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) {
      fetchStats()
    }
  }, [profile?.id])

  async function fetchStats() {
    setLoading(true)
    
    // Default stats template
    const s = {
      myPending: 0,
      myApproved: 0,
      myRejected: 0,
      toApprove: 0,
      totalDept: 0,
    }

    try {
      // 1. Fetch own stats
      const { data: myData } = await supabase
        .from('ot_requests')
        .select('status')
        .eq('requester_id', profile.id)

      if (myData) {
        s.myPending = myData.filter(r => r.status.startsWith('pending')).length
        s.myApproved = myData.filter(r => r.status === 'approved_final').length
        s.myRejected = myData.filter(r => r.status.startsWith('rejected')).length
      }

      // 2. Fetch "to approve" based on role
      if (['supervisor', 'commander', 'supervising_commander'].includes(profile.role)) {
        let statusFilter = ''
        if (profile.role === 'supervisor') statusFilter = 'pending_supervisor'
        if (profile.role === 'commander') statusFilter = 'approved_supervisor'
        if (profile.role === 'supervising_commander') statusFilter = 'approved_commander'

        // Supervisor & Commander are scoped to department
        if (['supervisor', 'commander'].includes(profile.role)) {
           const { count } = await supabase
            .from('ot_requests')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', profile.department_id)
            .eq('status', statusFilter)
           s.toApprove = count || 0
        } else if (profile.role === 'supervising_commander') {
          // Supervising commander needs to join with assignments, simpler way is to fetch assigned depts first
          const { data: assignments } = await supabase
            .from('supervising_commander_assignments')
            .select('department_id')
            .eq('supervising_commander_id', profile.id)
            .eq('is_active', true)
          
          if (assignments && assignments.length > 0) {
            const deptIds = assignments.map(a => a.department_id)
            const { count } = await supabase
              .from('ot_requests')
              .select('*', { count: 'exact', head: true })
              .in('department_id', deptIds)
              .eq('status', statusFilter)
            s.toApprove = count || 0
          }
        }
      }

      // 3. Fetch dept total (for admins/commanders)
      if (['sub_admin', 'supervisor', 'commander'].includes(profile.role) && profile.department_id) {
         const { count } = await supabase
            .from('ot_requests')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', profile.department_id)
         s.totalDept = count || 0
      }

      setStats(s)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  if (loading) {
     return <div style={{ padding: '2rem' }}><span className="spinner spinner-dark" /> กำลังโหลดข้อมูล...</div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">ยินดีต้อนรับ, {profile?.first_name} 👋</h1>
          <p className="page-subtitle">ภาพรวมระบบขอทำงานล่วงเวลา</p>
        </div>
      </div>

      <div className="card-title" style={{ marginBottom: '1rem', fontSize: '1rem' }}>ข้อมูลส่วนตัวของฉัน</div>
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-label">รอดำเนินการ</div>
          <div className="stat-value">{stats?.myPending || 0}</div>
          <div className="stat-sub">คำขอที่รอผู้บังคับบัญชาอนุมัติ</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">อนุมัติแล้ว</div>
          <div className="stat-value">{stats?.myApproved || 0}</div>
          <div className="stat-sub">คำขอที่อนุมัติเสร็จสิ้นทั้งหมด</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">ไม่อนุมัติ</div>
          <div className="stat-value">{stats?.myRejected || 0}</div>
          <div className="stat-sub">คำขอที่ไม่ผ่านการอนุมัติ</div>
        </div>
      </div>

      {['supervisor', 'commander', 'supervising_commander'].includes(profile?.role) && (
        <>
          <div className="card-title" style={{ marginBottom: '1rem', marginTop: '2rem', fontSize: '1rem' }}>สำหรับผู้พิจารณาอนุมัติ</div>
          <div className="stats-grid">
            <div className="stat-card purple">
              <div className="stat-label">คำขอที่รอคุณพิจารณา</div>
              <div className="stat-value">{stats?.toApprove || 0}</div>
              <div className="stat-sub">ต้องพิจารณาอนุมัติ/ไม่อนุมัติ</div>
            </div>
             {['supervisor', 'commander'].includes(profile.role) && (
              <div className="stat-card teal">
                <div className="stat-label">คำขอทั้งหมดในแผนก</div>
                <div className="stat-value">{stats?.totalDept || 0}</div>
                <div className="stat-sub">รวมทุกสถานะ</div>
              </div>
            )}
          </div>
        </>
      )}
      
      {['sub_admin', 'super_admin'].includes(profile?.role) && (
        <>
          <div className="card-title" style={{ marginBottom: '1rem', marginTop: '2rem', fontSize: '1rem' }}>ผู้ดูแลระบบ</div>
          <div className="stats-grid">
             <div className="stat-card teal">
                <div className="stat-label">คำขอทั้งหมดในความดูแล</div>
                <div className="stat-value">{stats?.totalDept || 0}</div>
                <div className="stat-sub">รวมทุกสถานะ</div>
              </div>
          </div>
        </>
      )}

    </div>
  )
}
