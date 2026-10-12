import { useState } from 'react'
import { useAuth } from '../store/auth'
import { useTheme } from '../store/theme'
import { Turnstile } from '@marsidev/react-turnstile'
import { authAPI } from '../services/api'
import { showToast } from '../components/dashboard/Toast'
import VideoBackground from '../components/common/VideoBackground'
import GoogleSignInButton from '../components/common/GoogleSignInButton'

// Penyimpanan kredensial "Ingat saya" (di-obfuscate ringan dengan base64).
const REMEMBER_FLAG = 'spmt_remember'
const REMEMBER_DATA = 'spmt_saved_login'

function readSavedLogin() {
  try {
    if (localStorage.getItem(REMEMBER_FLAG) !== 'on') return null
    const raw = localStorage.getItem(REMEMBER_DATA)
    if (!raw) return null
    return JSON.parse(decodeURIComponent(atob(raw)))
  } catch { return null }
}

export default function LoginPage({ onLogin }) {
  const { login, loginWithToken } = useAuth()
  const { t, lang } = useTheme()

  const saved = readSavedLogin()
  const [form, setForm] = useState({ username: saved?.username || '', password: saved?.password || '', email: '' })
  const [remember, setRemember] = useState(!!saved)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!turnstileToken) {
      setError(t.completeCaptcha)
      return
    }
    setError('')
    setLoading(true)

    try {
      await login(form.username, form.password, turnstileToken)
      // Simpan / hapus kredensial sesuai pilihan "Ingat saya"
      if (remember) {
        localStorage.setItem(REMEMBER_FLAG, 'on')
        localStorage.setItem(REMEMBER_DATA, btoa(encodeURIComponent(JSON.stringify({ username: form.username, password: form.password }))))
      } else {
        localStorage.removeItem(REMEMBER_FLAG)
        localStorage.removeItem(REMEMBER_DATA)
      }
      onLogin()
    } catch (err) {
      console.error('[Login Error]:', err)
      setError(err.response?.data?.error || t.loginFailed)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleCredential = async (credential) => {
    setError('')
    setLoading(true)
    try {
      const res = await authAPI.googleLogin({ credential })
      const data = res.data || {}
      if (data.token && data.user) {
        loginWithToken(data.token, data.user)
        onLogin()
      } else if (data.status === 'pending') {
        showToast(data.message || (t.regSuccess || 'Akun Anda menunggu persetujuan admin.'), 'success')
      } else {
        setError(data.message || 'Tidak dapat masuk dengan Google.')
      }
    } catch (err) {
      console.error('[Google Login Error]:', err)
      setError(err.response?.data?.error || 'Login dengan Google gagal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-root w-full min-h-[100dvh] flex items-center overflow-y-auto relative bg-[#1d2f3f]">
      <style>{`
        .back-btn-animated {
          animation: slideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards, pulseGlow 3s infinite;
          transition: all 0.3s ease;
        }
        .back-btn-animated:hover {
          transform: translateX(-5px) scale(1.05);
          box-shadow: 0 0 25px rgba(37, 99, 235, 0.4);
          background: rgba(255, 255, 255, 0.9) !important;
          color: #2563eb !important;
        }

        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(37, 99, 235, 0.2); }
          50% { box-shadow: 0 0 20px rgba(37, 99, 235, 0.5); }
        }

        /* Turnstile (~300px) diperkecil agar tidak overflow di layar sangat sempit */
        @media (max-width: 360px) {
          .login-turnstile { transform: scale(0.82); transform-origin: center; }
        }

        /* Kontras teks input:
           - kosong (placeholder tampil)  → latar putih, teks hitam (placeholder terbaca)
           - sudah diketik                → latar gelap, teks putih (kontras tinggi)
           [type=checkbox] dikecualikan agar "Ingat saya" tidak ikut berubah. */
        .login-card input:not([type="checkbox"]) {
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }
        .login-card input:not([type="checkbox"]):placeholder-shown {
          background: #ffffff !important;
          color: #0a1b2e !important;
        }
        .login-card input:not([type="checkbox"])::placeholder { color: #5b6b7d; opacity: 1; }
        .login-card input:not([type="checkbox"]):not(:placeholder-shown) {
          background: rgba(8, 22, 40, 0.96) !important;
          color: #ffffff !important;
        }
        .login-card input:focus {
          border-color: #6fd6ff !important;
          box-shadow: 0 0 0 3px rgba(111, 214, 255, 0.20) !important;
        }
        /* Autofill = field punya nilai → samakan dengan keadaan terisi (gelap + teks putih) */
        .login-card input:-webkit-autofill,
        .login-card input:-webkit-autofill:hover,
        .login-card input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff;
          -webkit-box-shadow: 0 0 0 1000px rgba(8, 22, 40, 0.96) inset;
          transition: background-color 9999s ease-in-out 0s;
          caret-color: #ffffff;
        }

        /* Layout: card di kanan (desktop), tengah di HP */
        .login-root {
          justify-content: flex-end;
          padding: clamp(16px, 4vw, 32px);
          padding-right: clamp(40px, 9vw, 150px);
        }
        .login-bg { background-position: 78% center; }
        .login-scrim { display: block; }
        @media (max-width: 820px) {
          .login-root {
            justify-content: center;
            padding: clamp(16px, 4vw, 32px);
          }
          .login-bg { background-position: center; }
          .login-scrim { display: none; }
        }
      `}</style>

      {/* BACKGROUND: video full-screen dengan loop mulus (crossfade) */}
      <VideoBackground
        src="/images/background/login-bg.mp4"
        poster="/images/background/login-bg-composite.svg"
        fade={0.8}
      />

      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1)_0%,_rgba(15,23,42,0.75)_100%)] z-[1]" />
      <div className="login-scrim fixed inset-0 z-[1] bg-[linear-gradient(90deg,_rgba(4,16,30,0)_38%,_rgba(4,16,30,0.42)_78%,_rgba(4,16,30,0.6)_100%)] pointer-events-none" />

      {/* LOGIN CARD */}
      <div className="login-card relative z-[2] w-[min(400px,92vw)] max-w-[90%] p-[clamp(24px,5vw,40px)] rounded-[14px] bg-[rgba(10,27,46,0.78)] backdrop-blur-[18px] border border-[rgba(111,214,255,0.28)] shadow-[0_24px_70px_rgba(0,8,24,0.55)] flex flex-col items-center">

        {/* LOGO */}
        <div className="mb-5">
          <img
            src="/images/logos/lo.png"
            className="h-[clamp(90px,24vw,130px)] bg-white py-3 px-7 rounded-xl border border-[rgba(111,214,255,0.35)] shadow-[0_8px_26px_rgba(0,8,24,0.35)] object-contain"
            alt="Pelindo Logo"
          />
        </div>

        <div className="text-[clamp(20px,5vw,24px)] font-bold text-[#eaf4fb]">{t.welcome}</div>
        <div className="text-[13px] text-[#9fc1dc] mb-[25px]">{t.signInAccess}</div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-[14px]">
          <input
            id="username"
            name="username"
            autoComplete="username"
            className="w-full py-[14px] px-4 rounded-xl border border-[rgba(120,175,225,0.45)] bg-white text-[#0a1b2e] text-base outline-none transition-all duration-200 box-border"
            type="text"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            placeholder={t.usernamePh}
            required
          />

          <input
            id="password"
            name="password"
            autoComplete="current-password"
            className="w-full py-[14px] px-4 rounded-xl border border-[rgba(120,175,225,0.45)] bg-white text-[#0a1b2e] text-base outline-none transition-all duration-200 box-border"
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder={t.passwordPh}
            required
          />

          <div className="flex justify-between w-full mt-[2px]">
            <label className="flex items-center gap-2 text-[13px] text-[#cfe3f5] cursor-pointer select-none mt-[2px]">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 accent-[#2f8fe0] cursor-pointer shrink-0"
              />
              {t.rememberMe || 'Remember me'}
            </label>
          </div>

          <div className="login-turnstile self-center my-2.5 mx-0 max-w-full bg-white rounded-[10px] p-2 border border-[rgba(111,214,255,0.35)] shadow-[0_4px_14px_rgba(0,8,24,0.35)]">
            <Turnstile
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '3x00000000000000000000FF'}
              options={{ theme: 'light' }}
              onSuccess={(token) => setTurnstileToken(token)}
            />
          </div>

          {error && <div className="text-[#ef4444] text-xs">{error}</div>}

          <button type="submit" className="mt-[14px] p-[14px] rounded-lg border-none bg-gradient-to-br from-[#2f8fe0] to-[#0f4c8a] text-white text-[14px] font-extrabold tracking-wider cursor-pointer shadow-[0_6px_18px_rgba(31,111,224,0.4)] disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
            {loading ? t.processing : t.signIn}
          </button>
        </form>

        {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <>
            {/* Divider */}
            <div className="flex items-center w-full my-4 mx-0 gap-2.5">
              <div className="flex-1 h-[1px] bg-[rgba(120,175,225,0.25)]" />
              <span className="text-xs text-[#9fc1dc] lowercase">
                {lang === 'id' ? 'atau' : (lang === 'zh' ? '或' : (lang === 'ru' ? 'или' : (lang === 'ja' ? 'atau' : 'or')))}
              </span>
              <div className="flex-1 h-[1px] bg-[rgba(120,175,225,0.25)]" />
            </div>

            {/* Google Sign-in/up Button */}
            <GoogleSignInButton
              onCredential={handleGoogleCredential}
              text="signin_with"
            />
          </>
        )}

      </div>

    </div>
  )
}