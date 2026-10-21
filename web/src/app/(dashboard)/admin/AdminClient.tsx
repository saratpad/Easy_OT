'use client'

import { useState } from 'react'
import { 
  Users, 
  Route, 
  Save, 
  Plus, 
  Trash2, 
  Settings, 
  Building2, 
  X, 
  Check, 
  ShieldCheck, 
  Bot, 
  PlusCircle,
  FolderTree
} from 'lucide-react'
import {
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
    <div className={`fixed bottom-20 md:bottom-4 right-4 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-xs font-bold transition-all animate-fadeIn ${
      type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
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

  const APPROVER_ROLE_OPTIONS = [
    { value: 'supervisor', label: 'ผู้อำนวยการกลุ่ม (Supervisor)' },
    { value: 'director', label: 'ผู้อำนวยการกอง (Director)' },
    { value: 'executive', label: 'ผู้บริหารที่กำกับดูแล (Executive)' },
  ]

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-indigo-900 to-blue-900 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-blue-100 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
              <span>{isSuperAdmin ? 'สิทธิ์การดูแลระบบ: ระดับสูงสุด (Super Admin)' : 'สิทธิ์การดูแลระบบ: ระดับกอง (Sub Admin)'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              ตั้งค่าและจัดการระบบ Easy OT
            </h1>
            <p className="mt-1 text-sm text-blue-100/90 max-w-xl">
              {isSuperAdmin 
                ? 'จัดการบัญชีผู้ใช้งาน สายการอนุมัติ โครงสร้างกอง และการตั้งค่า LINE Official Account' 
                : 'จัดการเจ้าหน้าที่และสายการอนุมัติภายในกองของคุณ'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-4 py-2.5 text-center">
              <span className="text-[11px] text-blue-200 block">ผู้ใช้งานทั้งหมด</span>
              <span className="text-xl font-black text-white">{users.length} คน</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-4 py-2.5 text-center">
              <span className="text-[11px] text-blue-200 block">กองในระบบ</span>
              <span className="text-xl font-black text-cyan-300">{divisions.length} กอง</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div className="glass-panel p-1.5 rounded-2xl flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === 'users'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>จัดการผู้ใช้งาน ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('routes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === 'routes'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
          }`}
        >
          <Route className="w-4 h-4" />
          <span>ตั้งค่าสายการอนุมัติ</span>
        </button>

        <button
          onClick={() => setActiveTab('divisions')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === 'divisions'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>ตั้งค่ากอง & LINE Bot</span>
        </button>
      </div>

      {/* Main Tab Panels */}
      <div className="glass-panel rounded-2xl overflow-hidden p-5 md:p-6">
        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {isSuperAdmin && divisions.length > 0 && (
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <label className="text-xs font-bold text-gray-700">กรองตามกอง:</label>
                <select
                  value={selectedDivision}
                  onChange={(e) => handleDivisionChange(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500/30 outline-none"
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

        {/* ROUTES TAB */}
        {activeTab === 'routes' && (
          <div className="space-y-6 max-w-3xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">กำหนดสายการอนุมัติคำร้อง (Approval Hierarchy)</h3>
                <p className="text-xs text-gray-500 mt-0.5">ระบุลำดับตำแหน่งที่ต้องพิจารณาคำร้องตามลำดับขั้น</p>
              </div>

              {divisions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600">เลือกกอง:</span>
                  <select
                    value={selectedDivision}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    disabled={!isSuperAdmin}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/30 outline-none disabled:bg-gray-100"
                  >
                    {divisions.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {currentRoutes.map((route, index) => (
                <div key={index} className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {route.step_order}
                  </div>

                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">
                      ผู้อนุมัติขั้นที่ {route.step_order}
                    </label>
                    <select
                      value={route.target_role}
                      onChange={(e) => handleRouteRoleChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500/30 outline-none bg-white"
                    >
                      {APPROVER_ROLE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => handleRemoveRouteStep(index)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                    title="ลบขั้นตอนนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                onClick={handleAddRouteStep}
                className="w-full flex justify-center items-center gap-2 py-3.5 border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl text-xs font-bold text-gray-600 hover:text-blue-600 transition-all bg-slate-50/50"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มขั้นตอนการอนุมัติถัดไป</span>
              </button>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleSaveRoutes}
                disabled={isSavingRoutes}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingRoutes ? 'กำลังบันทึก...' : 'บันทึกสายการอนุมัติ'}</span>
              </button>
            </div>
          </div>
        )}

        {/* DIVISIONS TAB */}
        {activeTab === 'divisions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">ตั้งค่าข้อมูลกองและ LINE Bot แจ้งเตือน</h3>
                <p className="text-xs text-gray-500 mt-0.5">กำหนดการส่งข้อความแจ้งเตือนผลอนุมัติและออกเอกสารอัตโนมัติ</p>
              </div>

              {isSuperAdmin && (
                <button
                  onClick={() => setShowNewDivisionForm(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-sm transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>สร้างกองใหม่</span>
                </button>
              )}
            </div>

            {/* Form Create New Division */}
            {showNewDivisionForm && isSuperAdmin && (
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 animate-fadeIn space-y-3">
                <h4 className="text-xs font-bold text-blue-900">เพิ่มกองใหม่ในระบบ</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDivisionName}
                    onChange={(e) => setNewDivisionName(e.target.value)}
                    placeholder="ชื่อกอง เช่น กองบริหารงานทั่วไป"
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/30 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateDivision()}
                  />
                  <button
                    onClick={handleCreateDivision}
                    disabled={isCreatingDivision || !newDivisionName.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                  >
                    {isCreatingDivision ? 'กำลังสร้าง...' : 'สร้าง'}
                  </button>
                  <button
                    onClick={() => { setShowNewDivisionForm(false); setNewDivisionName('') }}
                    className="px-3 py-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Divisions list */}
            <div className="grid grid-cols-1 gap-5">
              {divisionList.map((div) => (
                <div key={div.id} className="p-5 rounded-2xl bg-slate-50/60 border border-gray-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-900">{div.name}</h4>
                    </div>

                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDeleteDivision(div)}
                        className="text-rose-500 hover:bg-rose-50 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบกอง</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">ชื่อกอง</label>
                      <input
                        type="text"
                        value={div.name}
                        onChange={(e) => handleDivisionConfigChange(div.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/30 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                      <input
                        type="text"
                        value={div.phone || ''}
                        onChange={(e) => handleDivisionConfigChange(div.id, 'phone', e.target.value)}
                        placeholder="เช่น ๔๘๙๒"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/30 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">คำขึ้นต้นเลขที่บันทึกข้อความ</label>
                      <input
                        type="text"
                        value={div.doc_number_prefix || ''}
                        onChange={(e) => handleDivisionConfigChange(div.id, 'doc_number_prefix', e.target.value)}
                        placeholder="เช่น นร ๐๑๐๒"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/30 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">ผู้รับบันทึก (เรียน)</label>
                      <input
                        type="text"
                        value={div.recipient_name || ''}
                        onChange={(e) => handleDivisionConfigChange(div.id, 'recipient_name', e.target.value)}
                        placeholder="เช่น เลขาธิการนายกรัฐมนตรี"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/30 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">LINE Channel Access Token</label>
                      <input
                        type="text"
                        value={div.line_channel_access_token || ''}
                        onChange={(e) => handleDivisionConfigChange(div.id, 'line_channel_access_token', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-[11px] focus:ring-2 focus:ring-blue-500/30 outline-none"
                        placeholder="eyJhbGciOiJIUzI1NiJ..."
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">LINE Target ID (Group/User)</label>
                      <input
                        type="text"
                        value={div.line_target_id || ''}
                        onChange={(e) => handleDivisionConfigChange(div.id, 'line_target_id', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-[11px] focus:ring-2 focus:ring-blue-500/30 outline-none"
                        placeholder="Uxxxxxxxxxx หรือ Cxxxxxxxxxx"
                      />
                    </div>

                    <div className="md:col-span-2 flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id={`notify-${div.id}`}
                        checked={div.line_notifications_enabled !== false}
                        onChange={(e) => handleDivisionConfigChange(div.id, 'line_notifications_enabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`notify-${div.id}`} className="text-xs font-semibold text-gray-700 cursor-pointer select-none">
                        เปิดใช้งานการแจ้งเตือนเอกสารผ่าน LINE Bot ประจำกองอัตโนมัติ
                      </label>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleSaveDivisionConfig(div)}
                      disabled={isSavingDivision === div.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-sm transition-all disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingDivision === div.id ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่ากอง'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
