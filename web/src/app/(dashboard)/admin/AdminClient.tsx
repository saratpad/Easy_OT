'use client'

import { useState } from 'react'
import { Users, Route, Save, Plus, Trash2, Settings, Building2, X, Check } from 'lucide-react'
import {
  updateUserRole,
  updateApprovalRoutes,
  createDivision,
  updateDivisionLineConfig,
  updateDivision,
  deleteDivision,
} from '@/app/actions/admin'
import type { UserRole } from '@/types/database'
import UsersClient from './users/UsersClient'

// ─── Types ────────────────────────────────────────────────────────────────────
type User = {
  id: string
  full_name: string
  position: string
  role: string
  division_id: string
  division?: { id: string; name: string }
}

type Division = {
  id: string
  name: string
  phone?: string | null
  recipient_name?: string | null
  doc_number_prefix?: string | null
  line_channel_access_token?: string | null
  line_target_id?: string | null
  drive_folder_id?: string | null
  line_notifications_enabled?: boolean
}

type ApprovalRoute = {
  id?: string
  division_id: string
  step_order: number
  target_role: string
}

type Group = {
  id: string
  name: string
  division_id: string
}

type Props = {
  users: User[]
  divisions: Division[]
  groups: Group[]
  allRoutes: ApprovalRoute[]
  isSuperAdmin: boolean
  currentUserDivisionId: string | null
}

// ─── Toast notification ───────────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-20 md:bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      {message}
    </div>
  )
}

export default function AdminClient({ users, divisions, groups, allRoutes, isSuperAdmin, currentUserDivisionId }: Props) {
  const [activeTab, setActiveTab] = useState<'users' | 'routes' | 'divisions'>('users')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // ─── Route Management ─────────────────────────────────────────────────────
  const [selectedDivision, setSelectedDivision] = useState<string>(
    currentUserDivisionId || divisions[0]?.id || ''
  )
  const [localAllRoutes, setLocalAllRoutes] = useState<ApprovalRoute[]>(allRoutes)
  const [currentRoutes, setCurrentRoutes] = useState<ApprovalRoute[]>(
    allRoutes.filter(r => r.division_id === (currentUserDivisionId || divisions[0]?.id))
      .sort((a, b) => a.step_order - b.step_order)
  )
  const [isSavingRoutes, setIsSavingRoutes] = useState(false)

  // Division Management State
  const [divisionList, setDivisionList] = useState<Division[]>(divisions)
  const [isSavingDivision, setIsSavingDivision] = useState<string | null>(null)
  const [showNewDivisionForm, setShowNewDivisionForm] = useState(false)
  const [newDivisionName, setNewDivisionName] = useState('')
  const [isCreatingDivision, setIsCreatingDivision] = useState(false)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleDivisionChange = (divId: string) => {
    setSelectedDivision(divId)
    setCurrentRoutes(
      localAllRoutes.filter(r => r.division_id === divId)
        .sort((a, b) => a.step_order - b.step_order)
    )
  }

  const handleAddRouteStep = () => {
    setCurrentRoutes(prev => [
      ...prev,
      { division_id: selectedDivision, step_order: prev.length + 1, target_role: 'supervisor' },
    ])
  }

  const handleRemoveRouteStep = (index: number) => {
    setCurrentRoutes(prev => {
      const newRoutes = [...prev]
      newRoutes.splice(index, 1)
      return newRoutes.map((r, i) => ({ ...r, step_order: i + 1 }))
    })
  }

  const handleRouteRoleChange = (index: number, role: string) => {
    setCurrentRoutes(prev => {
      const newRoutes = [...prev]
      newRoutes[index] = { ...newRoutes[index], target_role: role }
      return newRoutes
    })
  }

  const handleSaveRoutes = async () => {
    setIsSavingRoutes(true)
    try {
      await updateApprovalRoutes(selectedDivision, currentRoutes.map(r => ({
        step_order: r.step_order,
        target_role: r.target_role,
      })))
      setLocalAllRoutes([
        ...localAllRoutes.filter(r => r.division_id !== selectedDivision),
        ...currentRoutes,
      ])
      showToast('บันทึกสายการอนุมัติสำเร็จ', 'success')
    } catch {
      showToast('เกิดข้อผิดพลาดในการบันทึกสายการอนุมัติ', 'error')
    } finally {
      setIsSavingRoutes(false)
    }
  }

  const handleDivisionConfigChange = (divId: string, field: keyof Division, value: string | boolean) => {
    setDivisionList(prev => prev.map(d => d.id === divId ? { ...d, [field]: value } : d))
  }

  const handleSaveDivisionConfig = async (div: Division) => {
    setIsSavingDivision(div.id)
    try {
      await updateDivisionLineConfig(div.id, div.line_channel_access_token || '', div.line_target_id || '', div.line_notifications_enabled !== false)
      await updateDivision(div.id, {
        name: div.name,
        phone: div.phone || undefined,
        recipient_name: div.recipient_name || undefined,
        doc_number_prefix: div.doc_number_prefix || undefined,
      })
      showToast('บันทึกการตั้งค่าแผนกสำเร็จ', 'success')
    } catch {
      showToast('เกิดข้อผิดพลาดในการบันทึกการตั้งค่าแผนก', 'error')
    } finally {
      setIsSavingDivision(null)
    }
  }

  const handleCreateDivision = async () => {
    if (!newDivisionName.trim()) return
    setIsCreatingDivision(true)
    try {
      await createDivision(newDivisionName.trim())
      setNewDivisionName('')
      setShowNewDivisionForm(false)
      showToast(`สร้างกอง "${newDivisionName.trim()}" สำเร็จ`, 'success')
    } catch {
      showToast('เกิดข้อผิดพลาดในการสร้างกอง', 'error')
    } finally {
      setIsCreatingDivision(false)
    }
  }

  const handleDeleteDivision = async (div: Division) => {
    if (!confirm(`ยืนยันการลบกอง "${div.name}"?\nการดำเนินการนี้ไม่สามารถยกเลิกได้`)) return
    try {
      await deleteDivision(div.id)
      setDivisionList(prev => prev.filter(d => d.id !== div.id))
      showToast('ลบกองสำเร็จ', 'success')
    } catch {
      showToast('เกิดข้อผิดพลาดในการลบกอง', 'error')
    }
  }

  // ─── Options ──────────────────────────────────────────────────────────────

  const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
    { value: 'employee', label: 'เจ้าหน้าที่ทั่วไป (Employee)' },
    { value: 'supervisor', label: 'ผู้อำนวยการกลุ่ม (Supervisor)' },
    { value: 'director', label: 'ผู้อำนวยการกอง (Director)' },
    { value: 'executive', label: 'ผู้บริหารที่กำกับดูแล (Executive)' },
    { value: 'sub_admin', label: 'ผู้ดูแลระบบ-กอง (Sub Admin)' },
    ...(isSuperAdmin ? [{ value: 'super_admin' as UserRole, label: 'ผู้ดูแลระบบ-ทั้งหมด (Super Admin)' }] : []),
  ]

  const APPROVER_ROLE_OPTIONS = [
    { value: 'supervisor', label: 'ผู้อำนวยการกลุ่ม (Supervisor)' },
    { value: 'director', label: 'ผู้อำนวยการกอง (Director)' },
    { value: 'executive', label: 'ผู้บริหารที่กำกับดูแล (Executive)' },
  ]

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            ตั้งค่ากอง
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isSuperAdmin ? 'ตั้งค่าสายการอนุมัติและ LINE Bot ของทุกกอง' : 'ตั้งค่าสายการอนุมัติและ LINE Bot ของกองคุณ'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            จัดการผู้ใช้งาน
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'routes' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Route className="w-4 h-4 mr-2" />
            ตั้งค่าสายการอนุมัติ
          </button>
          <button
            onClick={() => setActiveTab('divisions')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'divisions' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="w-4 h-4 mr-2" />
            ตั้งค่ากอง & LINE Bot
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">

        {/* ── USERS TAB ── */}
        {activeTab === 'users' && (
          <div className="p-4 sm:p-6">
            {isSuperAdmin && (
              <div className="mb-4 flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">เลือกกอง:</label>
                <select
                  value={selectedDivision}
                  onChange={(e) => handleDivisionChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary outline-none"
                >
                  {divisions.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
            <UsersClient
              users={users}
              divisions={divisions}
              groups={groups}
              isSuperAdmin={isSuperAdmin}
              currentDivisionId={selectedDivision}
              isComponent={true}
            />
          </div>
        )}

        {/* ── ROUTES TAB ── */}
        {activeTab === 'routes' && (
          <div className="p-6 space-y-6">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">เลือกกองที่ต้องการตั้งค่าสายการอนุมัติ</label>
              <select
                value={selectedDivision}
                onChange={(e) => handleDivisionChange(e.target.value)}
                disabled={!isSuperAdmin}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md disabled:bg-gray-50"
              >
                {divisions.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-1">สายการอนุมัติ</h3>
              <p className="text-xs text-gray-500 mb-4">กำหนดลำดับและ role ที่ต้องอนุมัติก่อนถึงขั้นถัดไป</p>

              <div className="space-y-3">
                {currentRoutes.map((route, index) => (
                  <div key={index} className="flex items-center space-x-3 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                      {route.step_order}
                    </div>
                    <div className="flex-1">
                      <select
                        value={route.target_role}
                        onChange={(e) => handleRouteRoleChange(index, e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                      >
                        {APPROVER_ROLE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => handleRemoveRouteStep(index)}
                      className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={handleAddRouteStep}
                  className="w-full flex justify-center items-center py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-primary-light hover:text-primary transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่มขั้นตอนการอนุมัติ
                </button>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveRoutes}
                  disabled={isSavingRoutes}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-dark disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSavingRoutes ? 'กำลังบันทึก...' : 'บันทึกสายการอนุมัติ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DIVISIONS TAB ── */}
        {activeTab === 'divisions' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">ตั้งค่ากองและ LINE Bot (Multi-Bot)</h3>
              {/* ปุ่มสร้างกองใหม่ — เฉพาะ super_admin */}
              {isSuperAdmin && (
                <button
                  onClick={() => setShowNewDivisionForm(true)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  สร้างกองใหม่
                </button>
              )}
            </div>

            {/* ── Form สร้างกองใหม่ ── */}
            {showNewDivisionForm && isSuperAdmin && (
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <h4 className="text-sm font-semibold text-primary-dark mb-3">สร้างกองใหม่</h4>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newDivisionName}
                    onChange={(e) => setNewDivisionName(e.target.value)}
                    placeholder="ชื่อกอง เช่น กองบริหารงานทั่วไป"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateDivision()}
                  />
                  <button
                    onClick={handleCreateDivision}
                    disabled={isCreatingDivision || !newDivisionName.trim()}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
                  >
                    {isCreatingDivision ? 'กำลังสร้าง...' : 'สร้าง'}
                  </button>
                  <button
                    onClick={() => { setShowNewDivisionForm(false); setNewDivisionName('') }}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── รายการกอง ── */}
            <div className="space-y-4">
              {divisionList.map((div) => (
                <div key={div.id} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-bold text-gray-800">{div.name}</h4>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDeleteDivision(div)}
                        className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 text-xs flex items-center"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        ลบกอง
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อกอง</label>
                      <input
                        type="text"
                        value={div.name}
                        onChange={(e) => handleDivisionConfigChange(div.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">เบอร์โทรศัพท์</label>
                      <input
                        type="text"
                        value={div.phone || ''}
                        onChange={(e) => handleDivisionConfigChange(div.id, 'phone', e.target.value)}
                        placeholder="เช่น ๔๘๙๒"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">คำขึ้นต้นเลขที่บันทึก</label>
                      <input
                        type="text"
                        value={div.doc_number_prefix || ''}
                        onChange={(e) => handleDivisionConfigChange(div.id, 'doc_number_prefix', e.target.value)}
                        placeholder="เช่น กนย"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">ผู้รับบันทึก (เรียน)</label>
                      <input
                        type="text"
                        value={div.recipient_name || ''}
                        onChange={(e) => handleDivisionConfigChange(div.id, 'recipient_name', e.target.value)}
                        placeholder="เช่น เลขาธิการนายกรัฐมนตรี"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">LINE Channel Access Token</label>
                      <input
                        type="text"
                        value={div.line_channel_access_token || ''}
                        onChange={(e) => handleDivisionConfigChange(div.id, 'line_channel_access_token', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-primary outline-none"
                        placeholder="eyJhbGciOiJIUzI1NiJ..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">LINE Target ID (กลุ่ม/User)</label>
                      <input
                        type="text"
                        value={div.line_target_id || ''}
                        onChange={(e) => handleDivisionConfigChange(div.id, 'line_target_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-primary outline-none"
                        placeholder="Uxxxxxxxxxx หรือ Cxxxxxxxxxx"
                      />
                    </div>
                    
                    <div className="md:col-span-2 flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id={`notify-${div.id}`}
                        checked={div.line_notifications_enabled !== false}
                        onChange={(e) => handleDivisionConfigChange(div.id, 'line_notifications_enabled', e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <label htmlFor={`notify-${div.id}`} className="text-xs font-medium text-gray-700 select-none cursor-pointer">
                        เปิดใช้งานการแจ้งเตือนเอกสารผ่าน LINE Bot (ส่งข้อความทันทีเมื่อออกเอกสารสำเร็จ)
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleSaveDivisionConfig(div)}
                      disabled={isSavingDivision === div.id}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-dark disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSavingDivision === div.id ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GROUPS TAB REMOVED ── */}
      </div>
    </div>
  )
}
