import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }
    setLoading(true)
    setError('')
    const { error: err } = await signIn(email, password)
    if (err) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
      setLoading(false)
      return
    }
    navigate('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0A2540 0%, #0D3260 50%, #1A73E8 100%)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative blobs */}
      <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(26,115,232,.15)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: 350, height: 350, borderRadius: '50%', background: 'rgba(0,196,180,.12)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{
        background: 'rgba(255,255,255,.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,.12)',
        borderRadius: '24px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 24px 60px rgba(0,0,0,.3)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '20px',
            background: 'linear-gradient(135deg, #1A73E8, #00C4B4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', fontSize: '2rem',
            boxShadow: '0 8px 24px rgba(26,115,232,.4)',
          }}>⏱️</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
            Easy-OT
          </h1>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            ระบบขออนุมัติทำงานล่วงเวลา กนย.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Email */}
          <div className="form-group">
            <label className="form-label" style={{ color: 'rgba(255,255,255,.8)' }}>
              อีเมล
            </label>
            <input
              className="form-input"
              type="email"
              placeholder="example@mail.go.th"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
              style={{
                background: 'rgba(255,255,255,.08)',
                border: '1.5px solid rgba(255,255,255,.15)',
                color: '#fff',
              }}
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" style={{ color: 'rgba(255,255,255,.8)' }}>
              รหัสผ่าน
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                style={{
                  background: 'rgba(255,255,255,.08)',
                  border: '1.5px solid rgba(255,255,255,.15)',
                  color: '#fff',
                  paddingRight: '2.75rem',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(220,38,38,.15)', border: '1px solid rgba(220,38,38,.3)',
              borderRadius: '8px', padding: '0.625rem 0.875rem',
              color: '#fca5a5', fontSize: '0.85rem',
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              background: 'linear-gradient(135deg, #1A73E8, #0053db)',
              boxShadow: '0 4px 16px rgba(26,115,232,.4)',
            }}
          >
            {loading ? <><span className="spinner" /> กำลังเข้าสู่ระบบ...</> : <><LogIn size={16} /> เข้าสู่ระบบ</>}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
          🔒 ระบบนี้ใช้การยืนยันตัวตนแบบ Supabase Auth
        </div>
      </div>
    </div>
  )
}
