/** Maps DB status enum → display label + badge class */
const STATUS_MAP = {
  pending_supervisor:  { label: 'รอ ผอ.กลุ่ม พิจารณา', cls: 'badge-pending' },
  approved_supervisor: { label: 'เห็นชอบ ผอ.กลุ่ม',   cls: 'badge-waiting' },
  rejected_supervisor: { label: 'ไม่เห็นชอบ ผอ.กลุ่ม', cls: 'badge-rejected' },
  approved_commander:  { label: 'อนุมัติ ผอ.กนย.',      cls: 'badge-waiting' },
  rejected_commander:  { label: 'ไม่อนุมัติ ผอ.กนย.',  cls: 'badge-rejected' },
  approved_final:      { label: 'อนุมัติแล้ว',          cls: 'badge-final' },
  rejected_final:      { label: 'ไม่อนุมัติ',            cls: 'badge-rejected' },
  cancelled:           { label: 'ยกเลิก',                cls: 'badge-cancelled' },
}

export function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || { label: status, cls: 'badge-cancelled' }
  return (
    <span className={`badge ${info.cls}`}>
      {info.label}
    </span>
  )
}

export function getStatusLabel(status) {
  return STATUS_MAP[status]?.label || status
}
