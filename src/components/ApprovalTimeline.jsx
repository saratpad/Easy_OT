import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { formatThaiDateTime } from '../lib/thaiDate'

const STEP_CONFIG = [
  { key: 'supervisor', label: 'ผู้อำนวยการกลุ่ม / หัวหน้าฝ่าย' },
  { key: 'commander',  label: 'ผู้อำนวยการ กนย.' },
  { key: 'supervising', label: 'ผู้บังคับบัญชาผู้กำกับดูแล' },
]

function StepIcon({ action }) {
  if (action === 'approved') return <CheckCircle size={16} />
  if (action === 'rejected') return <XCircle size={16} />
  return <Clock size={16} />
}

function stepDotClass(request, key) {
  const action = request[`${key}_action`]
  if (!action) {
    // determine if pending or not-yet-reached
    const statuses = {
      supervisor: 'pending_supervisor',
      commander:  'approved_supervisor',
      supervising: 'approved_commander',
    }
    return request.status === statuses[key] ? 'pending' : 'waiting'
  }
  return action
}

export function ApprovalTimeline({ request }) {
  return (
    <div className="approval-timeline">
      {STEP_CONFIG.map(({ key, label }) => {
        const action   = request[`${key}_action`]
        const at       = request[`${key}_at`]
        const note     = request[`${key}_note`]
        const dotCls   = stepDotClass(request, key)

        return (
          <div className="timeline-step" key={key}>
            <div className={`timeline-dot ${dotCls}`}>
              <StepIcon action={action} />
            </div>
            <div className="timeline-content">
              <div className="timeline-title">{label}</div>
              {action && (
                <div className="timeline-meta">
                  {action === 'approved' ? '✅ เห็นชอบ' : '❌ ไม่เห็นชอบ'}
                  {at && ` · ${formatThaiDateTime(at)}`}
                  {note && <> · <em>{note}</em></>}
                </div>
              )}
              {!action && dotCls === 'pending' && (
                <div className="timeline-meta">⏳ รอการพิจารณา</div>
              )}
              {!action && dotCls === 'waiting' && (
                <div className="timeline-meta" style={{ opacity: 0.4 }}>ยังไม่ถึงขั้นนี้</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
