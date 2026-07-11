'use client'

import { useState, useEffect } from 'react'

type Props = {
  announcementActive: boolean
  announcementFormat: string
  announcement: string
  announcementType: string
  announcementImageUrl: string
  announcementShowAt: string
}

export default function AnnouncementPopup({
  announcementActive,
  announcementFormat,
  announcement,
  announcementType,
  announcementImageUrl,
  announcementShowAt
}: Props) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    console.log('AnnouncementPopup check:', { announcementActive, announcementShowAt })
    // Only show if it's supposed to be shown after login
    if (!announcementActive || announcementShowAt !== 'after_login') {
      return
    }

    // Check if we already showed it in this session
    const hasSeen = sessionStorage.getItem('has_seen_announcement')
    console.log('AnnouncementPopup hasSeen:', hasSeen)
    if (!hasSeen) {
      setShow(true)
    }
  }, [announcementActive, announcementShowAt])

  const handleClose = () => {
    setShow(false)
    sessionStorage.setItem('has_seen_announcement', 'true')
  }

  if (!show) return null

  // Setup styles for text format
  const announcementStyles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'ℹ️' },
    warning: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: '⚠️' },
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: '✅' }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div 
        className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300" 
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={handleClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-10"
        >
          ✕
        </button>
        
        {announcementFormat === 'image' && announcementImageUrl ? (
          <img src={announcementImageUrl} alt="Announcement" className="w-full h-auto max-h-[80vh] object-contain" />
        ) : (
          <div className="p-6 pt-10">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              {announcementStyles[announcementType]?.icon} ประกาศ
            </h3>
            <div className={`p-4 rounded-lg border ${announcementStyles[announcementType]?.bg} ${announcementStyles[announcementType]?.border}`}>
              <p className={`text-base leading-relaxed ${announcementStyles[announcementType]?.text}`}>
                {announcement}
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={handleClose}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
