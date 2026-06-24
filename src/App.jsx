import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MyRequests from './pages/MyRequests'
import Approve from './pages/Approve'
import Export from './pages/Export'
import Report from './pages/Report'
import ManageUsers from './pages/ManageUsers'
import DeptConfig from './pages/DeptConfig'
import Tasks from './pages/Tasks'
import Departments from './pages/Departments'
import Positions from './pages/Positions'

function ProtectedLayout({ children }) {
  const { session, loading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (loading) return <div className="loading-screen"><span className="spinner spinner-dark" />กำลังโหลด...</div>
  if (!session) return <Navigate to="/login" replace />

  return (
    <div className={`app-layout ${mobileMenuOpen ? '' : ''}`}>
      <Topbar onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedLayout><Navigate to="/dashboard" replace /></ProtectedLayout>} />
          <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/my-requests" element={<ProtectedLayout><MyRequests /></ProtectedLayout>} />
          <Route path="/approve" element={<ProtectedLayout><Approve /></ProtectedLayout>} />
          <Route path="/export" element={<ProtectedLayout><Export /></ProtectedLayout>} />
          <Route path="/report" element={<ProtectedLayout><Report /></ProtectedLayout>} />
          <Route path="/manage-users" element={<ProtectedLayout><ManageUsers /></ProtectedLayout>} />
          <Route path="/dept-config" element={<ProtectedLayout><DeptConfig /></ProtectedLayout>} />
          <Route path="/tasks" element={<ProtectedLayout><Tasks /></ProtectedLayout>} />
          <Route path="/departments" element={<ProtectedLayout><Departments /></ProtectedLayout>} />
          <Route path="/positions" element={<ProtectedLayout><Positions /></ProtectedLayout>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
