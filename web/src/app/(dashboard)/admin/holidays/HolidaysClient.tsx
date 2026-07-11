'use client'

import { useState } from 'react'
import { Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { addHoliday, deleteHoliday, type Holiday } from '@/app/actions/holidays'

export default function HolidaysClient({ initialHolidays }: { initialHolidays: Holiday[] }) {
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays)
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !name) return
    
    setLoading(true)
    setError('')
    try {
      const res = await addHoliday(date, name)
      if (res.success && res.data) {
        setHolidays([...holidays, res.data as Holiday].sort((a, b) => a.date.localeCompare(b.date)))
        setDate('')
        setName('')
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการเพิ่มวันหยุด')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันการลบวันหยุดนี้?')) return
    
    setLoading(true)
    try {
      const res = await deleteHoliday(id)
      if (res.success) {
        setHolidays(holidays.filter(h => h.id !== id))
      } else {
        alert(res.error || 'ลบวันหยุดไม่สำเร็จ')
      }
    } catch (err) {
      alert('ลบวันหยุดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">จัดการวันหยุดราชการ</h2>
        <p className="text-sm text-gray-500 mt-1">กำหนดวันหยุดนักขัตฤกษ์หรือวันหยุดชดเชย (ระบบจะนับวันเสาร์-อาทิตย์เป็นวันหยุดโดยอัตโนมัติ)</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm max-w-2xl">
        <h3 className="font-semibold text-gray-800 mb-4">เพิ่มวันหยุดใหม่</h3>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่</label>
            <input 
              type="date" 
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อวันหยุด / ภารกิจ</label>
            <input 
              type="text" 
              required
              placeholder="เช่น วันขึ้นปีใหม่"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-end">
            <button 
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px] h-[42px]"
            >
              {loading ? 'กำลังบันทึก...' : <><Plus className="w-4 h-4 mr-1" /> เพิ่มวันหยุด</>}
            </button>
          </div>
        </form>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-800">รายการวันหยุดที่กำหนดไว้</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3.5 font-medium">วันที่</th>
                <th className="px-6 py-3.5 font-medium">ชื่อวันหยุด</th>
                <th className="px-6 py-3.5 font-medium w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {holidays.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    ยังไม่มีการกำหนดวันหยุดพิเศษ
                  </td>
                </tr>
              ) : (
                holidays.map(holiday => (
                  <tr key={holiday.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {`${format(new Date(holiday.date), 'dd MMMM', { locale: th })} ${new Date(holiday.date).getFullYear() + 543}`}
                    </td>
                    <td className="px-6 py-4">{holiday.name}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleDelete(holiday.id)}
                        disabled={loading}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="ลบวันหยุด"
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
    </div>
  )
}
