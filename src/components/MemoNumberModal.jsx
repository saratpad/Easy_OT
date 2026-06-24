import { useState } from 'react'
import { AlertCircle, X, FileText } from 'lucide-react'

/**
 * Modal that validates memo number before export.
 * Props:
 *   isOpen, onClose, onConfirm(memoNumber), isLoading
 */
export function MemoNumberModal({ isOpen, onClose, onConfirm, isLoading, selectedCount }) {
  const [memoNumber, setMemoNumber] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  function handleSubmit(e) {
    e.preventDefault()
    if (!memoNumber.trim()) {
      setError('กรุณากรอกเลขที่บันทึก ก่อนดำเนินการส่งออกเอกสาร')
      return
    }
    setError('')
    onConfirm(memoNumber.trim())
  }

  function handleClose() {
    setMemoNumber('')
    setError('')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '10px',
              background: 'var(--blue-dim)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--blue)'
            }}>
              <FileText size={20} />
            </div>
            <div>
              <div className="modal-title">ส่งออกเอกสาร OT</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                {selectedCount} รายการที่เลือก
              </div>
            </div>
          </div>
          <button className="btn-close" onClick={handleClose} disabled={isLoading}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{
              background: 'var(--warning-dim)',
              border: '1px solid #fde68a',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'flex-start',
              fontSize: '0.85rem',
              color: '#92400e'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <span>
                กรุณากรอก <strong>เลขที่บันทึก</strong> ที่ได้รับจากระบบสารบรรณภายใน
                ข้อมูลนี้จะถูกแทรกลงในเอกสาร PDF โดยอัตโนมัติ
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">เลขที่บันทึก (Memo Number) *</label>
              <input
                className="form-input"
                type="text"
                placeholder="เช่น กนย. 0001/2568"
                value={memoNumber}
                onChange={e => { setMemoNumber(e.target.value); setError('') }}
                autoFocus
                disabled={isLoading}
                style={{ fontSize: '1rem', fontWeight: '600' }}
              />
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={isLoading}>
              ยกเลิก
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="spinner" />
                  กำลังสร้างเอกสาร...
                </>
              ) : (
                <>
                  <FileText size={16} />
                  สร้างและส่งออก PDF
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
