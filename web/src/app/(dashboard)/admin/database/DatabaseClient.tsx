'use client'

import { useState, useEffect, useRef } from 'react'
import {
  listBackups,
  createBackup,
  deleteBackup,
  getBackupUrl,
  restoreDatabase,
  clearData,
  annualCutoff,
  exportDatabaseToDataURL,
  importDatabaseFromBase64,
  deleteDriveFile
} from '@/app/actions/database'
import { Database, Archive, Trash2, Download, Upload, AlertTriangle, RefreshCw } from 'lucide-react'

type Tab = 'backups' | 'cutoff' | 'clear' | 'import_export'

export default function DatabaseClient() {
  const [activeTab, setActiveTab] = useState<Tab>('backups')
  const [backups, setBackups] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [downloadedZipId, setDownloadedZipId] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Clear data states
  const [clearOptions, setClearOptions] = useState({
    clearUsers: false,
    clearRequests: false,
    clearDivisions: false,
    clearSettings: false
  })
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    if (activeTab === 'backups') {
      fetchBackups()
    }
  }, [activeTab])

  const fetchBackups = async () => {
    setLoading(true)
    try {
      const data = await listBackups()
      // sort descending by created_at
      data.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
      setBackups(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch backups')
    }
    setLoading(false)
  }

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  const showError = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(''), 5000)
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleCreateBackup = async () => {
    setLoading(true)
    try {
      await createBackup('System_Backup')
      await fetchBackups()
      showSuccess('สำรองข้อมูลระบบเรียบร้อยแล้ว')
    } catch (err: any) {
      showError(err.message || 'Failed to create backup')
    }
    setLoading(false)
  }

  const handleDownload = async (filename: string) => {
    try {
      const url = await getBackupUrl(filename)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
    } catch (err: any) {
      showError(err.message || 'Failed to download')
    }
  }

  const handleDelete = async (filename: string) => {
    if (!confirm('ยืนยันการลบไฟล์สำรองข้อมูลนี้?')) return
    setLoading(true)
    try {
      await deleteBackup(filename)
      await fetchBackups()
      showSuccess('ลบไฟล์สำรองข้อมูลเรียบร้อยแล้ว')
    } catch (err: any) {
      showError(err.message || 'Failed to delete backup')
    }
    setLoading(false)
  }

  const handleRestore = async (filename: string) => {
    const p = prompt(`คำเตือน: ข้อมูลปัจจุบันจะถูกลบและแทนที่ด้วยไฟล์นี้\nพิมพ์ "RESTORE" เพื่อยืนยันการกู้คืนจากไฟล์ ${filename}`)
    if (p !== 'RESTORE') {
      if (p !== null) alert('พิมพ์ไม่ถูกต้อง ยกเลิกการกู้คืน')
      return
    }

    setLoading(true)
    try {
      await restoreDatabase(filename)
      showSuccess('กู้คืนฐานข้อมูลเรียบร้อยแล้ว กรุณารีเฟรชหน้าเว็บ')
      // Optional: window.location.reload()
    } catch (err: any) {
      showError(err.message || 'Failed to restore database')
    }
    setLoading(false)
  }

  const handleCutoff = async () => {
    const p = prompt('คำเตือน: ข้อมูลการขอ OT ทั้งหมดจะถูกลบ (ข้อมูลผู้ใช้ยังคงอยู่)\\nระบบจะทำการสร้าง Backup และ Zip ไฟล์ PDF ใน Google Drive ให้อัตโนมัติ\\nพิมพ์ "CUTOFF" เพื่อยืนยัน')
    if (p !== 'CUTOFF') {
      if (p !== null) alert('พิมพ์ข้อความยืนยันไม่ถูกต้อง ยกเลิกการตัดยอด')
      return
    }

    setLoading(true)
    try {
      const res = await annualCutoff()
      showSuccess('ตัดยอดประจำปีและล้างข้อมูลคำร้องเรียบร้อยแล้ว')
      if (res.zipUrl) {
        // Use location.href instead of window.open to prevent popup blockers from stopping the download
        window.location.href = res.zipUrl
        if (res.zipFileId) {
          setDownloadedZipId(res.zipFileId)
        }
        showSuccess('กำลังดาวน์โหลดไฟล์เอกสารเก่า (.zip)...')
      }
      setActiveTab('backups') // Switch to see the new backup
    } catch (err: any) {
      showError(err.message || 'Failed to cutoff')
    }
    setLoading(false)
  }

  const handleClearData = async () => {
    if (!clearOptions.clearUsers && !clearOptions.clearRequests && !clearOptions.clearDivisions && !clearOptions.clearSettings) {
      return alert('กรุณาเลือกข้อมูลที่ต้องการลบอย่างน้อย 1 รายการ')
    }
    if (confirmText !== 'CONFIRM DELETE') {
      return alert('กรุณาพิมพ์ข้อความยืนยันให้ถูกต้อง')
    }

    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลที่เลือกอย่างถาวร?')) return

    setLoading(true)
    try {
      await clearData(clearOptions)
      setConfirmText('')
      setClearOptions({ clearUsers: false, clearRequests: false, clearDivisions: false, clearSettings: false })
      showSuccess('ล้างข้อมูลที่เลือกเรียบร้อยแล้ว')
    } catch (err: any) {
      showError(err.message || 'Failed to clear data')
    }
    setLoading(false)
  }

  const handleExport = async () => {
    setLoading(true)
    try {
      const dataUrl = await exportDatabaseToDataURL()
      const a = document.createElement('a')
      a.href = dataUrl
      
      const now = new Date()
      const localDate = new Date(now.getTime() + 7 * 60 * 60 * 1000)
      const dateStr = localDate.toISOString().replace(/[:.]/g, '-').split('T')[0]
      const timeStr = localDate.toISOString().replace(/[:.]/g, '-').split('T')[1].substring(0, 8)
      
      a.download = `Export_${dateStr}_${timeStr}.xlsx`
      a.click()
      showSuccess('ส่งออกข้อมูลเรียบร้อยแล้ว')
    } catch (err: any) {
      showError(err.message || 'Failed to export')
    }
    setLoading(false)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const p = prompt('คำเตือน: การนำเข้าข้อมูลจะลบข้อมูลปัจจุบันทั้งหมดและแทนที่ด้วยไฟล์นี้\nพิมพ์ "IMPORT" เพื่อยืนยัน')
    if (p !== 'IMPORT') {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setLoading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = event.target?.result as string
        try {
          await importDatabaseFromBase64(base64)
          showSuccess('นำเข้าข้อมูลเรียบร้อยแล้ว')
        } catch (err: any) {
          showError(err.message || 'Failed to import data')
        }
        setLoading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      showError(err.message || 'Failed to read file')
      setLoading(false)
    }
  }

  // ─── UI ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Database className="w-6 h-6 mr-2 text-blue-600" />
          จัดการฐานข้อมูล (Database)
        </h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 text-green-600 rounded-lg">
          {success}
        </div>
      )}

      {downloadedZipId && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-blue-900 mb-1">ดาวน์โหลดไฟล์เสร็จเรียบร้อยแล้วใช่หรือไม่?</div>
            <div className="text-sm">เพื่อไม่ให้เปลืองพื้นที่ Google Drive โปรดกดลบไฟล์ชั่วคราวนี้ออกจากระบบเมื่อดาวน์โหลดเสร็จแล้ว</div>
          </div>
          <button
            onClick={async () => {
              setLoading(true)
              try {
                await deleteDriveFile(downloadedZipId)
                showSuccess('ลบไฟล์ Zip จาก Google Drive เรียบร้อยแล้ว')
                setDownloadedZipId('')
              } catch(e: any) {
                showError('ไม่สามารถลบไฟล์ได้: ' + e.message)
              }
              setLoading(false)
            }}
            disabled={loading}
            className="px-4 py-2 shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            ลบไฟล์ออกจาก Drive
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/50">
          <button
            onClick={() => setActiveTab('backups')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'backups'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            รายการสำรองข้อมูล
          </button>
          <button
            onClick={() => setActiveTab('cutoff')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'cutoff'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            ตัดยอดประจำปี
          </button>
          <button
            onClick={() => setActiveTab('clear')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'clear'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            ล้างข้อมูล
          </button>
          <button
            onClick={() => setActiveTab('import_export')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'import_export'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            นำเข้า/ส่งออก
          </button>
        </div>

        <div className="p-6">
          {/* TAB: BACKUPS */}
          {activeTab === 'backups' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">ไฟล์สำรองข้อมูล (Backups)</h3>
                  <p className="text-sm text-gray-500">สร้างและจัดการไฟล์สำรองข้อมูลของระบบ (Excel format)</p>
                </div>
                <button
                  onClick={handleCreateBackup}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                  สร้าง Backup ใหม่
                </button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-gray-500 font-medium">ชื่อไฟล์</th>
                      <th className="px-6 py-3 text-gray-500 font-medium">วันที่สร้าง</th>
                      <th className="px-6 py-3 text-gray-500 font-medium">ขนาด</th>
                      <th className="px-6 py-3 text-right text-gray-500 font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {backups.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          ยังไม่มีไฟล์สำรองข้อมูล
                        </td>
                      </tr>
                    ) : (
                      backups.map(file => (
                        <tr key={file.name} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{file.name}</td>
                          <td className="px-6 py-4 text-gray-500">
                            {new Date(file.created_at).toLocaleString('th-TH')}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {(file.metadata?.size / 1024).toFixed(2)} KB
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => handleDownload(file.name)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg inline-flex"
                              title="ดาวน์โหลด"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRestore(file.name)}
                              disabled={loading}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg inline-flex"
                              title="กู้คืนฐานข้อมูลนี้"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(file.name)}
                              disabled={loading}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg inline-flex"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: CUTOFF */}
          {activeTab === 'cutoff' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">ตัดยอดประจำปี (Annual Cutoff)</h3>
                <p className="text-sm text-gray-500 mt-1">
                  ระบบจะทำการสำรองข้อมูลทั้งหมดให้โดยอัตโนมัติ จากนั้นจะลบข้อมูลที่เกี่ยวกับการ "ขออนุมัติ OT" ทั้งหมดทิ้ง 
                  เพื่อให้ระบบพร้อมสำหรับเริ่มปีงบประมาณใหม่ (ข้อมูลผู้ใช้ กอง กลุ่ม และการตั้งค่า จะยังคงอยู่)
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-200 p-6 rounded-xl">
                <div className="flex items-start">
                  <Archive className="w-6 h-6 text-orange-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="font-medium text-orange-900">กระบวนการที่จะเกิดขึ้น:</h4>
                    <ul className="list-disc list-inside mt-2 text-sm text-orange-800 space-y-1">
                      <li>สร้างไฟล์ Backup อัตโนมัติ (สามารถโหลดหรือกู้คืนได้ภายหลัง)</li>
                      <li>ลบข้อมูลรายการขอ OT ทั้งหมด</li>
                      <li>ลบข้อมูลการอนุมัติ (Approvals) ทั้งหมด</li>
                      <li>ลบข้อมูลประวัติการออกเอกสาร (Documents) ทั้งหมด</li>
                    </ul>
                    <button
                      onClick={handleCutoff}
                      disabled={loading}
                      className="mt-6 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50"
                    >
                      {loading ? 'กำลังดำเนินการ...' : 'ยืนยันการตัดยอดประจำปี'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CLEAR DATA */}
          {activeTab === 'clear' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 flex items-center text-red-600">
                  <Trash2 className="w-5 h-5 mr-2" />
                  ล้างข้อมูลระบบ (Clear Data)
                </h3>
                <p className="text-sm text-gray-500 mt-1">เลือกประเภทข้อมูลที่ต้องการลบทิ้งถาวรจากฐานข้อมูล (ยกเว้นสิทธิ์ super_admin จะไม่ถูกลบ)</p>
              </div>

              <div className="grid gap-4 bg-gray-50 p-6 rounded-xl border border-gray-200">
                <label className="flex items-start cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-600"
                    checked={clearOptions.clearUsers}
                    onChange={e => setClearOptions({...clearOptions, clearUsers: e.target.checked})}
                  />
                  <div className="ml-3">
                    <span className="block font-medium text-gray-900">ข้อมูลผู้ใช้งาน (Users)</span>
                    <span className="text-sm text-gray-500">ลบผู้ใช้ทุกคน (ยกเว้นผู้ที่ถือสิทธิ์ super_admin)</span>
                  </div>
                </label>

                <label className="flex items-start cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-600"
                    checked={clearOptions.clearRequests}
                    onChange={e => setClearOptions({...clearOptions, clearRequests: e.target.checked})}
                  />
                  <div className="ml-3">
                    <span className="block font-medium text-gray-900">ข้อมูลคำร้อง OT (Requests)</span>
                    <span className="text-sm text-gray-500">ลบคำร้อง การอนุมัติ และเอกสารต่างๆ</span>
                  </div>
                </label>

                <label className="flex items-start cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-600"
                    checked={clearOptions.clearDivisions}
                    onChange={e => setClearOptions({...clearOptions, clearDivisions: e.target.checked})}
                  />
                  <div className="ml-3">
                    <span className="block font-medium text-gray-900">ข้อมูลโครงสร้างองค์กร (Divisions & Groups)</span>
                    <span className="text-sm text-gray-500">ลบข้อมูลกอง กลุ่ม และเส้นทางการอนุมัติ</span>
                  </div>
                </label>

                <label className="flex items-start cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-600"
                    checked={clearOptions.clearSettings}
                    onChange={e => setClearOptions({...clearOptions, clearSettings: e.target.checked})}
                  />
                  <div className="ml-3">
                    <span className="block font-medium text-gray-900">การตั้งค่าและวันหยุด (Settings & Holidays)</span>
                    <span className="text-sm text-gray-500">ลบวันหยุดราชการที่ตั้งไว้ทั้งหมด</span>
                  </div>
                </label>
              </div>

              <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                <label className="block text-sm font-medium text-red-900 mb-2">
                  พิมพ์คำว่า "CONFIRM DELETE" เพื่อยืนยันการลบ
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    className="flex-1 max-w-sm rounded-lg border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                    placeholder="CONFIRM DELETE"
                  />
                  <button
                    onClick={handleClearData}
                    disabled={loading || confirmText !== 'CONFIRM DELETE'}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'กำลังลบ...' : 'ลบข้อมูลถาวร'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: IMPORT / EXPORT */}
          {activeTab === 'import_export' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">นำเข้า / ส่งออกฐานข้อมูล (Import / Export)</h3>
                <p className="text-sm text-gray-500 mt-1">สามารถส่งออกเป็นไฟล์ Excel เพื่อจัดเก็บในเครื่อง หรือนำเข้าไฟล์เดิมเพื่อเขียนทับฐานข้อมูลปัจจุบัน</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                    <Download className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">ส่งออกข้อมูล (Export)</h4>
                    <p className="text-sm text-gray-500 mt-1">ดาวน์โหลดข้อมูลทุกตารางออกมาเป็นไฟล์ .xlsx ทันที โดยไม่บันทึกเก็บไว้ในระบบ</p>
                  </div>
                  <button
                    onClick={handleExport}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    ส่งออก (.xlsx)
                  </button>
                </div>

                <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">นำเข้าข้อมูล (Import)</h4>
                    <p className="text-sm text-gray-500 mt-1">อัปโหลดไฟล์ .xlsx ที่เคยสำรองไว้ เพื่อนำมาเขียนทับข้อมูลในระบบทั้งหมด</p>
                  </div>
                  <input 
                    type="file" 
                    accept=".xlsx"
                    ref={fileInputRef}
                    onChange={handleImportFile}
                    className="hidden" 
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  >
                    เลือกไฟล์นำเข้า...
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
