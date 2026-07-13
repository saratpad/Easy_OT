'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, Plus, Download, Upload, Edit2, Trash2, Save, X, Check, UserPlus, ChevronDown, ChevronRight, Folder, FolderOpen, Users, UserCheck } from 'lucide-react'
import { createUser, updateUser, deleteUser, importUsers, exportUsers, createDivision, updateDivision, deleteDivision, createGroup, updateDivisionExecutive } from '@/app/actions/admin'
import { createClient } from '@/utils/supabase/client'
import * as XLSX from 'xlsx'
import type { UserRole } from '@/types/database'

type User = {
  id: string
  full_name: string
  position: string
  role: string
  division_id: string
  group_id?: string | null
  username?: string | null
  signature_url?: string | null
  division?: { id: string; name: string }
  group?: { id: string; name: string }
  seniority_level?: number | null
}

type Division = { 
  id: string
  name: string
  executive_id?: string | null
  executive?: { id: string; full_name: string } | null
}
type Group = { id: string; name: string; division_id: string }

type Props = {
  users: User[]
  divisions: Division[]
  groups: Group[]
  isSuperAdmin: boolean
  currentDivisionId: string | null
  isComponent?: boolean
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'employee', label: 'เจ้าหน้าที่' },
  { value: 'supervisor', label: 'ผอ.กลุ่ม' },
  { value: 'director', label: 'ผอ.กอง' },
  { value: 'executive', label: 'ผู้บริหาร' },
  { value: 'sub_admin', label: 'ผู้ดูแล (กอง)' },
  { value: 'super_admin', label: 'ผู้ดูแลระบบ' },
]

function Toast({ message, type }: { message: string; type: 'success' | 'error' | 'info' }) {
  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  }
  return (
    <div className={`fixed bottom-20 md:bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${colors[type]}`}>
      {type === 'success' ? <Check className="w-4 h-4" /> : type === 'error' ? <X className="w-4 h-4" /> : null}
      {message}
    </div>
  )
}

export default function UsersClient({ users, divisions, groups, isSuperAdmin, currentDivisionId, isComponent }: Props) {
  const [userList, setUserList] = useState<User[]>(users)

  useEffect(() => {
    setUserList(users)
  }, [users])
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  
  // Tree state
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Modal state
  const [showUserModal, setShowUserModal] = useState(false)
  const [showDivModal, setShowDivModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showExecutiveModal, setShowExecutiveModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingDivision, setEditingDivision] = useState<Division | null>(null)
  
  const [formData, setFormData] = useState({ full_name: '', position: '', division_id: '', group_id: '', role: 'employee', username: '', password: '', signature_url: '', seniority_level: '' })
  const [divFormData, setDivFormData] = useState({ name: '' })
  const [groupFormData, setGroupFormData] = useState({ name: '', division_id: '' })
  const [execDivisionId, setExecDivisionId] = useState('')
  const [execUserId, setExecUserId] = useState('')
  const [saving, setSaving] = useState(false)

  // Import
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Filtered users (global search)
  const filteredUsers = useMemo(() => {
    return userList.filter(u => {
      const matchSearch = !search || 
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.position?.toLowerCase().includes(search.toLowerCase()) ||
        u.username?.toLowerCase().includes(search.toLowerCase())
      return matchSearch
    })
  }, [userList, search])

  // Helpers for tree
  const toggleDivision = (id: string) => {
    const newSet = new Set(expandedDivisions)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setExpandedDivisions(newSet)
  }

  const toggleGroup = (id: string) => {
    const newSet = new Set(expandedGroups)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setExpandedGroups(newSet)
  }

  // ─── Actions: User ──────────────────────────────────────────────────────────
  const openCreateUserModal = (divisionId: string, groupId?: string) => {
    setEditingUser(null)
    setFormData({ 
      full_name: '', 
      position: '', 
      division_id: divisionId, 
      group_id: groupId || '', 
      role: 'employee', 
      username: '', 
      password: '',
      signature_url: '',
      seniority_level: '',
    })
    setShowUserModal(true)
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setFormData({
      full_name: user.full_name,
      position: user.position,
      division_id: user.division_id,
      group_id: user.group_id || '',
      role: user.role,
      username: user.username || '',
      password: '',
      signature_url: user.signature_url || '',
      seniority_level: user.seniority_level !== null && user.seniority_level !== undefined ? String(user.seniority_level) : '',
    })
    setShowUserModal(true)
  }

  const handleUploadSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload-signature', {
        method: 'POST',
        body: formData
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      
      setFormData(prev => ({ ...prev, signature_url: data.url }))
      showToast('อัปโหลดลายเซ็นสำเร็จ', 'success')
    } catch (err: any) {
      console.error('Signature upload error:', err)
      showToast(`เกิดข้อผิดพลาด: ${err.message || 'ไม่ทราบสาเหตุ'}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveUser = async () => {
    if (!formData.full_name.trim() || !formData.division_id) return
    setSaving(true)
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          full_name: formData.full_name,
          position: formData.position,
          division_id: formData.division_id,
          group_id: formData.group_id || undefined,
          role: formData.role,
          username: formData.username || undefined,
          password: formData.password || undefined,
          signature_url: formData.signature_url || null,
          seniority_level: formData.seniority_level.trim() !== '' ? Number(formData.seniority_level) : null,
        })
        showToast('แก้ไขข้อมูลสำเร็จ', 'success')
      } else {
        await createUser({
          full_name: formData.full_name,
          position: formData.position,
          division_id: formData.division_id,
          group_id: formData.group_id || undefined,
          role: formData.role,
          username: formData.username || undefined,
          password: formData.password || undefined,
          signature_url: formData.signature_url || null,
          seniority_level: formData.seniority_level.trim() !== '' ? Number(formData.seniority_level) : null,
        })
        showToast('เพิ่มผู้ใช้สำเร็จ', 'success')
      }
      setShowUserModal(false)
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาด', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`ยืนยันลบผู้ใช้ "${user.full_name}"?`)) return
    try {
      await deleteUser(user.id)
      setUserList(prev => prev.filter(u => u.id !== user.id))
      showToast('ลบผู้ใช้สำเร็จ', 'success')
    } catch {
      showToast('เกิดข้อผิดพลาดในการลบ', 'error')
    }
  }

  // ─── Actions: Division ──────────────────────────────────────────────────────
  const openCreateDivisionModal = () => {
    setEditingDivision(null)
    setDivFormData({ name: '' })
    setShowDivModal(true)
  }

  const openEditDivisionModal = (div: Division, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingDivision(div)
    setDivFormData({ name: div.name })
    setShowDivModal(true)
  }

  const handleSaveDivision = async () => {
    if (!divFormData.name.trim()) return
    setSaving(true)
    try {
      if (editingDivision) {
        await updateDivision(editingDivision.id, { name: divFormData.name })
        showToast('แก้ไขชื่อกองสำเร็จ', 'success')
      } else {
        await createDivision(divFormData.name)
        showToast('เพิ่มกองสำเร็จ', 'success')
      }
      setShowDivModal(false)
      setDivFormData({ name: '' })
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาด', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDivision = async (div: Division, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`ยืนยันลบกอง "${div.name}" ? (หากในกองมีผู้ใช้หรือข้อมูลที่เกี่ยวข้อง อาจจะลบไม่ได้)`)) return
    try {
      await deleteDivision(div.id)
      showToast('ลบกองสำเร็จ', 'success')
    } catch {
      showToast('เกิดข้อผิดพลาดในการลบกอง', 'error')
    }
  }

  const handleSaveGroup = async () => {
    if (!groupFormData.name.trim() || !groupFormData.division_id) return
    setSaving(true)
    try {
      await createGroup(groupFormData.division_id, groupFormData.name)
      showToast('เพิ่มกลุ่มสำเร็จ', 'success')
      setShowGroupModal(false)
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาด', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveExecutive = async () => {
    if (!execDivisionId) return
    setSaving(true)
    try {
      await updateDivisionExecutive(execDivisionId, execUserId || null)
      showToast('ตั้งค่าผู้บริหารสำเร็จ', 'success')
      setShowExecutiveModal(false)
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาด', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ─── Export / Import ────────────────────────────────────────────────────────
  const handleExport = async (divisionId?: string) => {
    try {
      const exportDivId = divisionId || (isSuperAdmin ? undefined : currentDivisionId ?? undefined)
      const data = await exportUsers(exportDivId)
      if (!data || data.length === 0) {
        showToast('ไม่มีข้อมูลสำหรับ Export', 'info')
        return
      }

      const BOM = '\uFEFF'
      const header = 'ชื่อ-นามสกุล,ตำแหน่ง,กอง,กลุ่ม,Role,Username\n'
      const rows = data.map((u: any) =>
        `"${u.full_name}","${u.position}","${(u.division as any)?.name || ''}","${(u.group as any)?.name || ''}","${u.role}","${u.username || ''}"`
      ).join('\n')

      const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users_export_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Export สำเร็จ', 'success')
    } catch {
      showToast('Export ล้มเหลว', 'error')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>, targetDivisionName?: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)

    try {
      let newUsers: any[] = []
      const ext = file.name.split('.').pop()?.toLowerCase()

      if (ext === 'csv') {
        const text = await file.text()
        const lines = text.split(/\r?\n/).filter(l => l.trim())
        const dataLines = lines.slice(1) // Skip header

        newUsers = dataLines.map(line => {
          // Regex to split by comma, ignoring commas inside double quotes
          const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim())
          return {
            full_name: cols[0] || '',
            position: cols[1] || '',
            division_name: targetDivisionName || cols[2] || '',
            group_name: cols[3] || '',
            role: cols[4] || 'employee',
            username: cols[5] || '',
            password: cols[6] || '',
          }
        }).filter(u => u.full_name)
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        // Skip header
        const dataRows = jsonData.slice(1) as any[][]
        newUsers = dataRows.map(cols => ({
          full_name: cols[0]?.toString().trim() || '',
          position: cols[1]?.toString().trim() || '',
          division_name: targetDivisionName || cols[2]?.toString().trim() || '',
          group_name: cols[3]?.toString().trim() || '',
          role: cols[4]?.toString().trim() || 'employee',
          username: cols[5]?.toString().trim() || '',
          password: cols[6]?.toString().trim() || '',
        })).filter(u => u.full_name)
      } else {
        throw new Error("รองรับเฉพาะไฟล์ .csv หรือ .xlsx เท่านั้น")
      }

      const result = await importUsers(newUsers)
      
      if (result.skipped > 0) {
        console.error('Import Errors:', result.errors)
        const firstError = result.errors[0] || 'Unknown error'
        showToast(`นำเข้าสำเร็จ ${result.imported} คน, ข้าม ${result.skipped} คน (${firstError})`, 'error')
      } else {
        showToast(`นำเข้าสำเร็จ ${result.imported} คน`, 'success')
      }
    } catch (err: any) {
      showToast('Import ล้มเหลว: ' + (err.message || ''), 'error')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isComponent ? 'mb-4' : ''}`}>
        {!isComponent ? (
          <div>
            <h2 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้ทั้งระบบ</h2>
            <p className="text-sm text-gray-500 mt-1">จัดการผู้ใช้งาน กอง และกลุ่ม ทั้งหมดในระบบ</p>
          </div>
        ) : (
          <div className="flex-1"></div>
        )}
        {!isComponent && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => handleExport()} className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4 mr-1.5" /> Export CSV
            </button>
            <label className={`inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer ${importing ? 'opacity-50' : ''}`}>
              <Upload className="w-4 h-4 mr-1.5" /> {importing ? 'กำลังนำเข้า...' : 'Import'}
              <input ref={fileInputRef} type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={(e) => handleImport(e)} disabled={importing} />
            </label>
            <button onClick={() => openCreateUserModal('', '')} className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
              <UserPlus className="w-4 h-4 mr-1.5" /> เพิ่มผู้ใช้
            </button>
            {isSuperAdmin && (
              <button onClick={openCreateDivisionModal} className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">
                <Plus className="w-4 h-4 mr-1.5" /> เพิ่มกอง
              </button>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="ค้นหาชื่อ, ตำแหน่ง, username... เพื่อกรองใน Tree"
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tree View */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-indigo-500" /> โครงสร้างระบบ
          </h3>
        </div>
        <div className="p-2 space-y-1">
          {divisions.length === 0 && (
             <div className="p-8 text-center text-gray-500">ยังไม่มีกองในระบบ</div>
          )}
          {divisions
            .filter(d => (isComponent && currentDivisionId ? d.id === currentDivisionId : true))
            .map(division => {
            const isDivExpanded = expandedDivisions.has(division.id) || search
            const divGroups = groups.filter(g => g.division_id === division.id)
            const divUsers = filteredUsers.filter(u => u.division_id === division.id)
            
            // "ไม่ระบุกลุ่ม"
            const noGroupUsers = divUsers.filter(u => !u.group_id)
            
            return (
              <div key={division.id} className="border border-gray-100 rounded-lg overflow-hidden bg-white group/div">
                {/* Division Header */}
                <div 
                  className="flex items-center justify-between px-4 py-3 bg-gray-50/50 hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => toggleDivision(division.id)}
                >
                  <div className="flex items-center gap-2">
                    {isDivExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                    <Folder className="w-5 h-5 text-blue-500" />
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{division.name}</span>
                      <span className="text-xs text-gray-500">
                        ผู้บริหารอนุมัติ: {division.executive ? <span className="text-indigo-600 font-medium">{division.executive.full_name}</span> : <span className="text-red-400 italic">ยังไม่กำหนด</span>}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 ml-2">({divUsers.length} คน)</span>
                  </div>
                  
                  {/* Action buttons at division level */}
                  <div className="flex items-center gap-2 opacity-0 group-hover/div:opacity-100 transition-opacity">
                      {isSuperAdmin && (
                        <>
                          <button onClick={(e) => openEditDivisionModal(division, e)} className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100" title="แก้ไขชื่อกอง">
                            <Edit2 className="w-3 h-3 mr-1" /> แก้ไข
                          </button>
                          <button onClick={(e) => handleDeleteDivision(division, e)} className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100" title="ลบกอง">
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setExecDivisionId(division.id); setExecUserId(division.executive_id || ''); setShowExecutiveModal(true); }} className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200">
                            <UserCheck className="w-3 h-3 mr-1" /> ตั้งค่าผู้บริหาร
                          </button>
                        </>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleExport(division.id) }} className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">
                        <Download className="w-3 h-3 mr-1" /> Export
                      </button>
                      <label onClick={e => e.stopPropagation()} className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
                        <Upload className="w-3 h-3 mr-1" /> Import
                        <input type="file" accept=".csv" className="hidden" onChange={(e) => handleImport(e, division.name)} disabled={importing} />
                      </label>
                      <button onClick={(e) => { e.stopPropagation(); setGroupFormData({ name: '', division_id: division.id }); setShowGroupModal(true) }} className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded hover:bg-indigo-200">
                        <Plus className="w-3 h-3 mr-1" /> เพิ่มกลุ่ม
                      </button>
                  </div>
                </div>

                {/* Division Content (Groups) */}
                {isDivExpanded && (
                  <div className="pl-8 pr-4 py-2 space-y-2 border-t border-gray-100">
                    {/* Groups */}
                    {divGroups.map(group => {
                      const isGrpExpanded = expandedGroups.has(group.id) || search
                      const grpUsers = divUsers.filter(u => u.group_id === group.id)
                      
                      return (
                        <div key={group.id} className="border border-gray-100 rounded-md">
                          <div 
                            className="flex items-center justify-between px-3 py-2 bg-blue-50/20 hover:bg-blue-50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1" onClick={() => toggleGroup(group.id)}>
                              {isGrpExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                              <Users className="w-4 h-4 text-emerald-500" />
                              <span className="text-sm font-medium text-gray-700">{group.name}</span>
                              <span className="text-xs text-gray-400">({grpUsers.length} คน)</span>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); openCreateUserModal(division.id, group.id) }}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded hover:bg-emerald-200"
                            >
                              <UserPlus className="w-3 h-3 mr-1" /> เพิ่มผู้ใช้
                            </button>
                          </div>
                          
                          {/* Group Users */}
                          {isGrpExpanded && (
                            <div className="bg-white p-2">
                              {grpUsers.length === 0 ? (
                                <div className="text-xs text-gray-400 py-2 px-6">ไม่มีผู้ใช้ในกลุ่มนี้</div>
                              ) : (
                                <div className="space-y-1">
                                  {grpUsers.map(user => (
                                    <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 px-4 hover:bg-gray-50 rounded-lg group">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm">
                                          {user.full_name.charAt(0)}
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                          <p className="text-xs text-gray-500">{user.position} • <span className={`text-xs text-gray-500`}>{ROLE_OPTIONS.find(r => r.value === user.role)?.label || user.role}</span>{user.seniority_level !== null && user.seniority_level !== undefined && <span className="text-blue-500 ml-1">(ลำดับอาวุโส: {user.seniority_level})</span>}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 mt-2 sm:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditModal(user)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded" title="แก้ไข">
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteUser(user)} className="text-red-500 hover:bg-red-50 p-1.5 rounded" title="ลบ">
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* No Group Users */}
                    <div className="border border-gray-100 rounded-md mt-2">
                      <div 
                        className="flex items-center justify-between px-3 py-2 bg-gray-50/50 hover:bg-gray-100 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1" onClick={() => toggleGroup(`${division.id}_no_group`)}>
                          {(expandedGroups.has(`${division.id}_no_group`) || search) ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-600 italic">บุคลากรไม่ระบุกลุ่ม</span>
                          <span className="text-xs text-gray-400">({noGroupUsers.length} คน)</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openCreateUserModal(division.id, '') }}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <UserPlus className="w-3 h-3 mr-1" /> เพิ่มผู้ใช้
                        </button>
                      </div>
                      
                      {(expandedGroups.has(`${division.id}_no_group`) || search) && (
                        <div className="bg-white p-2">
                          {noGroupUsers.length === 0 ? (
                            <div className="text-xs text-gray-400 py-2 px-6">ไม่มีผู้ใช้ในส่วนนี้</div>
                          ) : (
                            <div className="space-y-1">
                              {noGroupUsers.map(user => (
                                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 px-4 hover:bg-gray-50 rounded-lg group">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm">
                                      {user.full_name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                      <p className="text-xs text-gray-500">{user.position} • <span className={`text-xs text-gray-500`}>{ROLE_OPTIONS.find(r => r.value === user.role)?.label || user.role}</span>{user.seniority_level !== null && user.seniority_level !== undefined && <span className="text-blue-500 ml-1">(ลำดับอาวุโส: {user.seniority_level})</span>}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2 sm:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditModal(user)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded" title="แก้ไข">
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteUser(user)} className="text-red-500 hover:bg-red-50 p-1.5 rounded" title="ลบ">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Modal Create/Edit User ─── */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowUserModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-5">
              {editingUser ? `แก้ไขผู้ใช้: ${editingUser.full_name}` : 'เพิ่มผู้ใช้ใหม่'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล *</label>
                <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                  value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">สิทธิ์ (Role)</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    {ROLE_OPTIONS.filter(r => isSuperAdmin || r.value !== 'super_admin').map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ระดับอาวุโส / ลำดับตำแหน่ง (ตัวเลขน้อยขึ้นก่อน เช่น ผอ.=1, หน.กลุ่ม=2, เจ้าหน้าที่=3)</label>
                <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                  value={formData.seniority_level} onChange={e => setFormData({...formData, seniority_level: e.target.value})} placeholder="ปล่อยว่างไว้เพื่อเป็นลำดับสุดท้าย" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">กอง *</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={formData.division_id} onChange={e => setFormData({...formData, division_id: e.target.value, group_id: ''})}>
                    <option value="">-- เลือกกอง --</option>
                    {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">กลุ่ม</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" disabled={!formData.division_id}
                    value={formData.group_id} onChange={e => setFormData({...formData, group_id: e.target.value})}>
                    <option value="">-- ไม่ระบุกลุ่ม --</option>
                    {groups.filter(g => g.division_id === formData.division_id).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500 mb-3">ข้อมูลเข้าสู่ระบบ (ไม่จำเป็น — ถ้าใช้ LINE Login ไม่ต้องกรอก)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                      value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="ไม่จำเป็น" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{editingUser ? 'รหัสผ่านใหม่' : 'รหัสผ่าน'}</label>
                    <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                      value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={editingUser ? 'เว้นว่างถ้าไม่เปลี่ยน' : 'ไม่จำเป็น'} />
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500 mb-3">ลายเซ็นอิเล็กทรอนิกส์ (พื้นหลังโปร่งใส แนะนำ PNG)</p>
                <div className="flex items-center gap-4">
                  {formData.signature_url ? (
                    <div className="relative">
                      <img src={formData.signature_url} alt="Signature" className="h-12 object-contain bg-gray-50 border rounded p-1" />
                      <button onClick={() => setFormData({...formData, signature_url: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 italic">ยังไม่มีลายเซ็น</div>
                  )}
                  <label className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 cursor-pointer">
                    <Upload className="w-3 h-3 mr-1" /> อัปโหลดรูปลายเซ็น
                    <input type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" onChange={handleUploadSignature} />
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowUserModal(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                ยกเลิก
              </button>
              <button onClick={handleSaveUser} disabled={saving || !formData.full_name.trim()} className="flex-1 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Create/Edit Division ─── */}
      {showDivModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowDivModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-5">{editingDivision ? 'แก้ไขชื่อกอง' : 'เพิ่มกองใหม่'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อกอง *</label>
                <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={divFormData.name} onChange={e => setDivFormData({name: e.target.value})} placeholder="ระบุชื่อกอง..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDivModal(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                ยกเลิก
              </button>
              <button onClick={handleSaveDivision} disabled={saving || !divFormData.name.trim()} className="flex-1 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Create Group ─── */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowGroupModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-5">เพิ่มกลุ่มใหม่</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อกลุ่ม *</label>
                <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={groupFormData.name} onChange={e => setGroupFormData({...groupFormData, name: e.target.value})} placeholder="ระบุชื่อกลุ่ม..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowGroupModal(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                ยกเลิก
              </button>
              <button onClick={handleSaveGroup} disabled={saving || !groupFormData.name.trim()} className="flex-1 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Set Executive ─── */}
      {showExecutiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowExecutiveModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-5">ตั้งค่าผู้บริหารกอง</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เลือกผู้บริหาร (Executive)</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                  value={execUserId} onChange={e => setExecUserId(e.target.value)}>
                  <option value="">-- ไม่ระบุผู้บริหาร --</option>
                  {userList.filter(u => u.role === 'executive').map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowExecutiveModal(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                ยกเลิก
              </button>
              <button onClick={handleSaveExecutive} disabled={saving} className="flex-1 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
