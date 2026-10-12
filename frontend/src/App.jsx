import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AuthProvider, useAuth } from './store/auth'
import { ThemeProvider, useTheme } from './store/theme'
import { WebSocketProvider, useWebSocketStatus } from './store/WebSocketContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import WebsitesPage from './pages/WebsitesPage'
import UsersPage from './pages/UsersPage'
import ActivityLogPage from './pages/ActivityLogPage'
import TopBar from './components/dashboard/TopBar'
import ServiceDetailModal from './components/dashboard/ServiceDetailModal'
import ServerDetailModal from './components/dashboard/ServerDetailModal'
import ToastContainer, { showToast } from './components/dashboard/Toast'
import { dashboardAPI, websiteAPI, userAPI, eventsAPI, authAPI } from './services/api'
import { cleanReason } from './utils/rootCause'

// ── All Notifications Full Panel (rendered in portal, triggered by bell "View All")
const LOCALE_MAP = { id: 'id-ID', en: 'en-US', zh: 'zh-CN', ja: 'ja-JP', ru: 'ru-RU' }

function AllNotificationsPanel({ notifications, onDelete, onClearAll, onClose, onOpen }) {
  const { t, lang } = useTheme()
  const locale = LOCALE_MAP[lang] || 'en-US'
  const SC = { ONLINE: '#10b981', WARNING: '#f59e0b', CRITICAL: '#ef4444', OFFLINE: '#dc2626', UNKNOWN: '#94a3b8' }
  const fmtTime = d => d ? new Date(d).toLocaleString(locale, { hour12: false }) : '—'

  return createPortal(
    <div className="fixed inset-0 bg-[rgba(30,41,59,0.45)] z-[99998] flex items-start justify-end pt-[76px]"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-[min(540px,95vw)] h-[calc(100vh-86px)] mr-3 bg-bg-card backdrop-blur-md border border-border-strong rounded-[14px] shadow-[0_16px_48px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease]">
        <div className="flex items-center justify-between py-3.5 px-4.5 border-b border-border bg-bg-header shrink-0">
          <div>
            <div className="text-[15px] font-extrabold text-text">🔔 {t.allNotifications}</div>
            <div className="text-[11px] text-text-muted mt-0.5">{t.statusChangeEventsSession} ({notifications.length})</div>
          </div>
          <div className="flex gap-2">
            {notifications.length > 0 && <button onClick={onClearAll} className="bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] text-[#dc2626] rounded-md py-1.25 px-3 text-[11px] font-bold cursor-pointer">{t.clearAll}</button>}
            <button onClick={onClose} className="bg-transparent border-none text-text-muted cursor-pointer text-[18px] py-0 px-1">✕</button>
          </div>
        </div>
        {notifications.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
            <div className="text-[32px] mb-2.5 opacity-50">🔔</div>
            <div className="text-[13px]">{t.noNotifSession}</div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {notifications.map((n, i) => {
              const msg = cleanReason(n.reason)
              const clickable = !!(onOpen && n.websiteId)
              return (
                <div key={i}
                  onClick={clickable ? () => onOpen(n) : undefined}
                  title={clickable ? 'Buka detail layanan' : undefined}
                  className={`flex items-start gap-3 py-3 px-4.5 border-b border-[rgba(99,102,241,0.07)] transition-colors duration-150 hover:bg-[rgba(99,102,241,0.08)] ${
                    !n.read ? 'bg-[rgba(79,70,229,0.04)]' : 'bg-transparent'
                  } ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5] shrink-0 mt-1.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.25">
                      <span className="font-bold text-text text-[13px]">{n.name}</span>
                      {n.oldStatus && <span style={{ color: SC[n.oldStatus] || 'var(--text-muted)' }} className="text-[10px] font-semibold">{n.oldStatus} →</span>}
                      <span style={{ color: SC[n.type] || '#94a3b8', backgroundColor: (SC[n.type] || '#94a3b8') + '18', borderColor: (SC[n.type] || '#94a3b8') + '33' }} className="rounded py-[1px] px-1.75 text-[10px] font-bold border">{n.type}</span>
                    </div>
                    {msg && (
                      <div className="text-[12.5px] text-text-sub mb-1.5 leading-normal">{msg}</div>
                    )}
                    <div className="flex items-center gap-2.5 text-[10px] text-text-muted">
                      <span>{fmtTime(n.ts)}</span>
                      {n.responseTime != null && <span>· {n.responseTime}ms</span>}
                      {clickable && <span className="text-[#4f46e5] font-semibold">· Lihat detail</span>}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); onDelete?.(i) }} title="Hapus" className="bg-transparent border-none text-[#cbd5e1] cursor-pointer text-[16px] shrink-0">✕</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

function SettingsModal({ onClose }) {
  const { lang, setLanguage, LANGUAGES, themeId, setTheme, THEME_OPTIONS, t } = useTheme()
  const [sound, setSound] = useState(() => localStorage.getItem('spmt_sound') !== 'off')
  const [desktopNotif, setDesktopNotif] = useState(() => localStorage.getItem('spmt_desktop_notif') === 'on')
  const [autoAck, setAutoAck] = useState(() => localStorage.getItem('spmt_autoack') === 'on')
  const [langSel, setLangSel] = useState(lang)
  const [themeSel, setThemeSel] = useState(themeId)

  // Theme dipilih dulu (staged), baru diterapkan saat klik Save & Apply
  const handleThemeChange = (id) => {
    setThemeSel(id)
  }

  // Desktop notifications need explicit browser permission before they can be enabled.
  const toggleDesktopNotif = async () => {
    if (desktopNotif) { setDesktopNotif(false); return }
    if (!('Notification' in window)) {
      alert(t.noDesktopSupport)
      return
    }
    let perm = Notification.permission
    if (perm === 'default') perm = await Notification.requestPermission()
    if (perm === 'granted') setDesktopNotif(true)
    else alert(t.notifDenied)
  }

  const PREFS = [
    { l: `🔔 ${t.notifSound}`, d: t.notifSoundDesc, s: sound, set: () => setSound(v => !v) },
    { l: `🖥️ ${t.desktopNotif}`, d: t.desktopNotifDesc, s: desktopNotif, set: toggleDesktopNotif },
    { l: `🎯 ${t.autoAck}`, d: t.autoAckDesc, s: autoAck, set: () => setAutoAck(v => !v) },
  ]

  const save = () => {
    localStorage.setItem('spmt_sound', sound ? 'on' : 'off')
    localStorage.setItem('spmt_desktop_notif', desktopNotif ? 'on' : 'off')
    localStorage.setItem('spmt_autoack', autoAck ? 'on' : 'off')
    setTheme(themeSel)
    setLanguage(langSel)
    window.location.reload()
  }
  return createPortal(
    <div className="fixed inset-0 bg-[rgba(30,41,59,0.45)] z-[99999] flex items-center justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-bg-card backdrop-blur-md border border-border rounded-[14px] w-[440px] max-w-[94vw] shadow-[var(--shadow-glow)] animate-[fadeIn_0.15s_ease]">
        <div className="py-4 px-5 border-b border-border flex justify-between items-center bg-bg-header rounded-t-[14px]">
          <span className="text-[15px] font-extrabold text-text">⚙️ {t.systemSettings}</span>
          <button onClick={onClose} className="bg-transparent border-none text-text-sub cursor-pointer text-[16px]">✕</button>
        </div>
        <div className="py-4.5 px-5 max-h-[65vh] overflow-y-auto">

          <div className="text-[11px] font-bold text-accent tracking-wide mb-4">🎨 {t.themeSelection}</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5 mb-6">
            {THEME_OPTIONS.map(theme => (
              <div
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                style={{
                  backgroundColor: themeSel === theme.id ? 'var(--accent-light)' : 'rgba(0,0,0,0.03)',
                  borderColor: themeSel === theme.id ? 'var(--accent)' : 'var(--border)',
                  borderStyle: 'solid',
                  borderWidth: 1,
                  boxShadow: themeSel === theme.id ? `0 0 10px ${theme.color}20 inset` : 'none'
                }}
                className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all duration-200"
              >
                <div style={{ backgroundColor: theme.color, boxShadow: `0 0 8px ${theme.color}` }} className="w-4 h-4 rounded-full shrink-0" />
                <span style={{ color: themeSel === theme.id ? 'var(--text)' : 'var(--text-sub)' }} className="text-[12px] font-bold">{theme.dark ? t.darkMode : t.lightMode}</span>
              </div>
            ))}
          </div>

          <div className="text-[11px] font-bold text-accent tracking-wide mb-2.5">🌐 {t.languageLabel}</div>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(LANGUAGES).map(L => (
              <div
                key={L.code}
                onClick={() => setLangSel(L.code)}
                style={{
                  backgroundColor: langSel === L.code ? 'var(--accent-light)' : 'rgba(0,0,0,0.03)',
                  borderColor: langSel === L.code ? 'var(--accent)' : 'var(--border)',
                  borderStyle: 'solid',
                  borderWidth: 1,
                }}
                className="flex items-center gap-1.75 py-1.75 px-3 rounded-lg cursor-pointer transition-all duration-200"
              >
                <span className="text-[15px]">{L.flag}</span>
                <span style={{ color: langSel === L.code ? 'var(--text)' : 'var(--text-sub)' }} className="text-[12px] font-bold">{L.label}</span>
              </div>
            ))}
          </div>

          <div className="text-[11px] font-bold text-accent tracking-wide mb-1.5">⚙️ {t.monitoringPreferences}</div>
          {PREFS.map(item => (
            <div key={item.l} className="flex items-center justify-between gap-3.5 py-3 px-0 border-b border-border">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-text">{item.l}</div>
                <div className="text-[10px] text-text-muted mt-0.5 leading-normal">{item.d}</div>
              </div>
              <button
                onClick={item.set}
                style={{ backgroundColor: item.s ? 'var(--accent)' : 'rgba(0,0,0,0.3)' }}
                className="shrink-0 w-11 h-6 rounded-full border-none cursor-pointer relative transition-all duration-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
              >
                <span style={{ left: item.s ? 22 : 2 }} className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-[left] duration-200 shadow-[0_1px_4px_rgba(0,0,0,0.2)]" />
              </button>
            </div>
          ))}
        </div>
        <div className="py-3 px-5 border-t border-border flex justify-end gap-2.5 bg-bg-header rounded-b-[14px]">
          <button onClick={onClose} className="bg-transparent border border-border-strong text-text-sub rounded-[7px] py-1.75 px-4.5 text-[12px] cursor-pointer font-semibold">{t.cancel}</button>
          <button onClick={save} className="bg-accent border-none text-[#ffffff] rounded-[7px] py-1.75 px-5 text-[12px] font-extrabold cursor-pointer shadow-[0_0_15px_var(--accent-light)]">{t.saveApply}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── About Modal ─────────────────────────────────────────────────
function AboutModal({ onClose }) {
  const { t } = useTheme()
  return createPortal(
    <div className="fixed inset-0 bg-[rgba(30,41,59,0.45)] z-[99999] flex items-center justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-bg-card backdrop-blur-md border border-border-strong rounded-[14px] w-[500px] max-w-[94vw] shadow-[0_16px_48px_rgba(0,0,0,0.2)] animate-[fadeIn_0.15s_ease]">
        <div className="py-4 px-5 border-b border-[rgba(99,102,241,0.1)] flex justify-between items-center">
          <span className="text-[15px] font-extrabold text-text">ℹ️ {t.aboutTitle}</span>
          <button onClick={onClose} className="bg-transparent border-none text-text-muted cursor-pointer text-[16px]">✕</button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-3.5 mb-4.5 p-3.5 bg-[rgba(79,70,229,0.06)] rounded-lg border border-[rgba(79,70,229,0.1)]">
            <div className="w-13 h-13 rounded-xl bg-[rgba(79,70,229,0.12)] border border-[rgba(79,70,229,0.2)] flex items-center justify-center text-[26px]">📡</div>
            <div>
              <div className="text-[17px] font-extrabold text-text">SPMT Monitoring System</div>
              <div className="text-[12px] text-[#4f46e5] mt-0.5">{t.systemNameSub}</div>
              <div className="text-[10px] text-text-muted mt-1">v2.0.0 · 2026</div>
            </div>
          </div>
          {[
            [`🎯 ${t.aboutPurpose}`, t.aboutPurposeDesc],
            [`🔍 ${t.aboutHow}`, t.aboutHowDesc],
            [`🛡️ ${t.aboutSecurity}`, t.aboutSecurityDesc],
            [`📊 ${t.aboutFeatures}`, t.aboutFeaturesDesc],
          ].map(([title, d]) => (
            <div key={title} className="mb-2.5 py-2 px-3 bg-[rgba(99,102,241,0.03)] rounded-lg border border-[rgba(99,102,241,0.08)]">
              <div className="text-[11px] font-bold text-text mb-0.5">{title}</div>
              <div className="text-[10px] text-text-muted leading-relaxed">{d}</div>
            </div>
          ))}

          {/* Sinergi Section */}
          <div className="mt-5 border-t border-border pt-4">
            <div className="text-[10px] font-extrabold text-text-sub tracking-widest mb-3 uppercase">{t.sinergiCoreValues}</div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { img: 'pelindo.png', title: 'PELINDO', desc: t.brandPelindoDesc },
                { img: 'danan.png', title: 'DANANTARA', desc: t.brandDananDesc },
                { img: 'bumn', title: 'BUMN', desc: t.brandBumnDesc },
                { img: 'akhlak', title: 'AKHLAK', desc: t.brandAkhlakDesc }
              ].map(b => (
                <div key={b.title} className="flex items-center gap-2.5 p-2 bg-bg-main rounded-lg border border-border">
                  <img src={`/images/logos/${b.img}${b.img.includes('.') ? '' : '.png'}`} alt={b.title} className="h-5 w-auto max-w-[40px] object-contain" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-primary">{b.title}</span>
                    <span className="text-[8px] text-text-muted leading-tight">{b.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Logout Confirm ──────────────────────────────────────────────
function LogoutModal({ onConfirm, onCancel }) {
  const { t } = useTheme()
  return createPortal(
    <div className="fixed inset-0 bg-[rgba(30,41,59,0.45)] z-[99999] flex items-center justify-center"
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="bg-bg-card backdrop-blur-md border border-border-strong rounded-xl p-8 w-80 max-w-[90vw] text-center shadow-[0_16px_48px_rgba(0,0,0,0.2)] animate-[fadeIn_0.15s_ease]">
        <div className="text-[36px] mb-3">🚪</div>
        <div className="text-[16px] font-bold text-text mb-2">{t.logoutQ}</div>
        <div className="text-[13px] text-text-muted mb-6">{t.logoutConfirm}</div>
        <div className="flex gap-2.5 justify-center">
          <button onClick={onCancel} className="bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] text-text-sub rounded-[7px] py-2 px-5 text-[13px] font-semibold cursor-pointer">{t.cancel}</button>
          <button onClick={onConfirm} className="bg-gradient-to-br from-[#dc2626] to-[#ef4444] border-none text-text rounded-[7px] py-2 px-5 text-[13px] font-bold cursor-pointer">{t.logout}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Profile Modal ───────────────────────────────────────────────
function ProfileModal({ user, onClose }) {
  const { updateUser } = useAuth()
  const { t } = useTheme()
  const [activeTab, setActiveTab] = useState('profile') // 'profile' or 'security'
  const [initialAvatar] = useState(() => localStorage.getItem(`spmt_avatar_${user?.username}`) || null)
  const [avatar, setAvatar] = useState(initialAvatar)
  const [email, setEmail] = useState(user?.email || '')
  const [showOldPw, setShowOldPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  useEffect(() => {
    setOldPassword(''); setNewPassword(''); setConfirmPassword('')
    setShowOldPw(false); setShowNewPw(false); setShowConfirmPw(false)
  }, [activeTab])

  // Email change fields
  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [currentEmailConfirm, setCurrentEmailConfirm] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [confirmNewEmail, setConfirmNewEmail] = useState('')

  // Password fields
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target.result
      setAvatar(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleRemove = () => {
    setAvatar(null)
  }

  const handleSave = async (type = 'profile') => {
    setLoading(true)
    try {
      if (type === 'profile') {
        if (email && !isValidEmail(email)) {
          showToast('Please enter a valid email address', 'error')
          return
        }
        await authAPI.updateProfile({ email })
        updateUser({ email })
        showToast('Profile updated successfully', 'success')
        onClose()
      } else if (type === 'avatar') {
        if (avatar) {
          localStorage.setItem(`spmt_avatar_${user?.username}`, avatar)
        } else {
          localStorage.removeItem(`spmt_avatar_${user?.username}`)
        }
        window.dispatchEvent(new Event('AvatarUpdated'))
        showToast(t.lang === 'id' ? 'Foto profil berhasil diperbarui' : 'Profile avatar updated successfully', 'success')
        onClose()
      } else if (type === 'email') {
        const isFirstTime = !user?.email;
        if (!newEmail || !confirmNewEmail) {
          showToast('Please fill in both new email fields', 'error')
          return
        }
        if (!isFirstTime && !currentEmailConfirm) {
          showToast('Please confirm your current email address', 'error')
          return
        }
        if (!isFirstTime && currentEmailConfirm !== user?.email) {
          showToast('Current email is incorrect', 'error')
          return
        }
        if (newEmail !== confirmNewEmail) {
          showToast('New emails do not match', 'error')
          return
        }
        if (!isValidEmail(newEmail)) {
          showToast('Please enter a valid email address', 'error')
          return
        }
        await authAPI.updateProfile({ email: newEmail })
        updateUser({ email: newEmail })
        setEmail(newEmail)
        setShowChangeEmail(false)
        setCurrentEmailConfirm('')
        setNewEmail('')
        setConfirmNewEmail('')
        showToast('Email updated successfully', 'success')
        onClose() // Tutup modal setelah sukses agar tidak stuck di processing
      } else if (type === 'security') {
        if (!oldPassword || !newPassword || !confirmPassword) {
          showToast('Please fill all password fields', 'error')
          return
        }
        if (newPassword.length < 6) {
          showToast('New password must be at least 6 characters', 'error')
          return
        }
        if (newPassword !== confirmPassword) {
          showToast('New passwords do not match', 'error')
          return
        }
        if (newPassword === oldPassword) {
          showToast('New password must be different from the old password', 'error')
          return
        }
        await authAPI.changePassword({ old_password: oldPassword, new_password: newPassword, confirm_password: confirmPassword })
        showToast('Password changed successfully', 'success')
        onClose()
      } else if (type === 'test_email') {
        await authAPI.testEmail()
        showToast('Test email sent! Please check your inbox.', 'success')
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Operation failed'
      showToast(errorMsg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] z-[99999] flex items-center justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-bg-card backdrop-blur-md border border-border rounded-[14px] w-[440px] max-w-[94vw] shadow-[var(--shadow)] animate-[fadeIn_0.15s_ease]">
        <div className="py-4 px-5 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={onClose} title={t.back || 'Back'}
              className="bg-bg-header border border-border text-text cursor-pointer text-[12px] font-bold rounded-lg py-1.5 px-3 flex items-center gap-1.5"
            >
              ← {t.back || 'Back'}
            </button>
            <span className="text-[20px] font-black text-text">👤 {t.customizationProfile}</span>
          </div>
          <button onClick={onClose} title={t.close || 'Close'} className="bg-transparent border-none text-text-sub cursor-pointer text-[16px]">✕</button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4 mb-6">
            <label className="relative w-18 h-18 rounded-full border-2 border-accent cursor-pointer block shrink-0 group">
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <div className="w-full h-full rounded-full overflow-hidden relative">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-bg-header flex items-center justify-center text-[28px] font-extrabold text-accent">
                    {(user?.username || '?')[0].toUpperCase()}
                  </div>
                )}
                {/* Hover overlay with edit icon */}
                <div className="absolute inset-0 bg-[rgba(0,0,0,0.4)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white pointer-events-none">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </div>
              </div>
              {/* Floating edit badge in bottom right */}
              <div className="absolute bottom-[-2px] right-[-2px] bg-accent text-white w-5.5 h-5.5 rounded-full flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.3)] border-2 border-bg-card">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </div>
            </label>
            <div>
              <div className="text-[20px] font-extrabold text-text">{user?.username}</div>
              <div style={{ marginBottom: avatar ? 6 : 0 }} className="text-[12px] text-accent font-semibold">{t.roleLabel}: {user?.role.toUpperCase()}</div>
              {avatar && (
                <button
                  onClick={handleRemove}
                  className="bg-transparent border border-offline text-offline py-[3px] px-2.5 rounded-md text-[10px] cursor-pointer font-bold transition-all duration-200 hover:bg-[rgba(220,38,38,0.1)]"
                >
                  {t.remove}
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-5 mb-5 border-b border-border">
            <div
              onClick={() => setActiveTab('profile')}
              className={`py-2.5 px-1 text-[15px] font-black cursor-pointer border-b-2 transition-all duration-200 ${
                activeTab === 'profile' ? 'text-accent border-accent' : 'text-text-sub border-transparent'
              }`}
            >
              {t.generalSettings}
            </div>
            <div
              onClick={() => setActiveTab('security')}
              className={`py-2.5 px-1 text-[15px] font-black cursor-pointer border-b-2 transition-all duration-200 ${
                activeTab === 'security' ? 'text-accent border-accent' : 'text-text-sub border-transparent'
              }`}
            >
              {t.securityTab}
            </div>
          </div>

          <div className="bg-bg-header rounded-xl border border-border p-4 shadow-[inset_0_0_10px_rgba(0,0,0,0.1)]">
            {activeTab === 'profile' ? (
              <>
                <h4 className="m-0 mb-4 text-[13px] text-accent font-extrabold tracking-wide">{t.personalNotifSettings}</h4>
                <div className="flex flex-col gap-5">

                  {/* Email Section */}
                  <div className="bg-[rgba(38,74,236,0.15)] p-4 rounded-xl border border-border relative overflow-hidden">
                    <div className="absolute top-[-10px] right-[-10px] text-[40px] opacity-5 pointer-events-none">✉️</div>
                    <div className="flex justify-between items-center mb-2.5">
                      <div className="text-[10px] text-accent font-extrabold tracking-widest">
                        {t.currentEmailAddress}
                      </div>
                      {!user?.email && <span className="text-[9px] text-[#ef4444] font-extrabold py-0.5 px-2 bg-[rgba(239,68,68,0.15)] rounded border border-[rgba(239,68,68,0.3)]">{t.required}</span>}
                    </div>
                    <div className="flex gap-2.5 items-center">
                      <div className="flex-1 relative flex items-center">
                        <div style={{ color: email ? 'var(--text)' : 'var(--text-muted)' }} className="w-full bg-[rgba(0,0,0,0.25)] border border-border rounded-lg pt-3 pb-3 pr-3.5 pl-[38px] text-[16px] font-extrabold tracking-wide shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
                          <span className="absolute left-3 text-[20px] opacity-70">📧</span>
                          {email || t.noEmailYet}
                        </div>
                      </div>
                      <button
                        onClick={() => setShowChangeEmail(!showChangeEmail)}
                        style={{
                          backgroundColor: showChangeEmail ? 'rgba(239,68,68,0.15)' : 'var(--accent)',
                          border: showChangeEmail ? '1px solid #ef4444' : 'none',
                          color: showChangeEmail ? '#ef4444' : '#fff',
                          boxShadow: showChangeEmail ? 'none' : '0 4px 12px var(--accent-light)'
                        }}
                        className="rounded-lg py-3 px-6 text-[13px] font-black cursor-pointer transition-all duration-200"
                      >
                        {showChangeEmail ? t.closeBtn : (user?.email ? t.changeBtn : t.setEmailBtn)}
                      </button>
                    </div>

                    {showChangeEmail && (
                      <div className="mt-4.5 p-4.5 bg-bg-card rounded-xl border border-accent shadow-[0_8px_24px_rgba(0,0,0,0.2),0_0_0_1px_var(--accent)] animate-[slideDown_0.3s_cubic-bezier(0.16,1,0.3,1)]">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-1 h-4 bg-accent rounded-[2px]" />
                          <div className="text-[12px] font-black text-text tracking-wide">{t.updateEmailIdentity}</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                            {user?.email && (
                              <>
                                <div className="relative">
                                  <label className="block text-[9px] text-accent mb-1.25 font-extrabold tracking-wide">{t.confirmCurrentEmail}</label>
                                  <input
                                    type="email"
                                    value={currentEmailConfirm}
                                    onChange={e => setCurrentEmailConfirm(e.target.value)}
                                    placeholder={t.typeExistingEmail}
                                    className="w-full bg-[rgba(0,0,0,0.15)] border border-border rounded-lg py-2.5 px-3.5 text-[12px] text-text outline-none transition-colors duration-200 focus:border-accent"
                                  />
                                </div>
                                <div className="h-[1px] bg-border my-1 opacity-50" />
                              </>
                            )}
                            <div>
                              <label className="block text-[9px] text-text-muted mb-1.25 font-extrabold tracking-wide">{t.newEmailAddress}</label>
                              <input
                                type="email"
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                placeholder={t.enterNewEmail}
                                className="w-full bg-[rgba(0,0,0,0.15)] border border-border rounded-lg py-2.5 px-3.5 text-[12px] text-text outline-none focus:border-accent"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-text-muted mb-1.25 font-extrabold tracking-wide">{t.retypeNewEmail}</label>
                              <input
                                type="email"
                                value={confirmNewEmail}
                                onChange={e => setConfirmNewEmail(e.target.value)}
                                placeholder={t.confirmNewEmail}
                                className="w-full bg-[rgba(0,0,0,0.15)] border border-border rounded-lg py-2.5 px-3.5 text-[12px] text-text outline-none focus:border-accent"
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => handleSave('email')}
                            disabled={loading || !newEmail || !confirmNewEmail}
                            style={{ opacity: (loading || !newEmail || !confirmNewEmail) ? 0.6 : 1 }}
                            className="mt-1.5 bg-gradient-to-br from-accent to-[#4f46e5] border-none text-white rounded-lg p-3 text-[12px] font-extrabold cursor-pointer shadow-[0_4px_15px_rgba(79,70,229,0.3)] transition-transform duration-75 active:scale-95"
                          >
                            {loading ? t.processing : t.confirmIdentityChange}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>


                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between m-0 mb-4">
                  <h4 className="m-0 text-[13px] text-accent font-extrabold tracking-wide">{t.changeAccountPassword}</h4>
                </div>
                <div className="flex flex-col gap-3.5">
                  <div>
                    <div className="text-[13px] text-text-muted mb-1.5 font-extrabold">{t.oldPassword}</div>
                    <div className="relative flex items-center">
                      <input
                        type={showOldPw ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        placeholder={t.enterCurrentPassword}
                        className="w-full bg-[rgba(0,0,0,0.2)] border border-border rounded-lg pt-3 pb-3 pr-10.5 pl-3.5 text-[16px] text-text outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPw(v => !v)}
                        className="absolute right-3 bg-transparent border-none text-text-sub cursor-pointer flex items-center justify-center select-none"
                      >
                        {showOldPw ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                            <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                            <line x1="2" y1="2" x2="22" y2="22" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="h-[1px] bg-border my-1" />
                  <div>
                    <div className="text-[13px] text-text-muted mb-1.5 font-extrabold">{t.newPassword}</div>
                    <div className="relative flex items-center">
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder={t.enterNewPassword}
                        className="w-full bg-[rgba(0,0,0,0.2)] border border-border rounded-lg pt-3 pb-3 pr-10.5 pl-3.5 text-[16px] text-text outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(v => !v)}
                        className="absolute right-3 bg-transparent border-none text-text-sub cursor-pointer flex items-center justify-center select-none"
                      >
                        {showNewPw ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                            <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                            <line x1="2" y1="2" x2="22" y2="22" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="text-[13px] text-text-muted mb-1.5 font-extrabold">{t.confirmNewPassword}</div>
                    <div className="relative flex items-center">
                      <input
                        type={showConfirmPw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder={t.repeatNewPassword}
                        className="w-full bg-[rgba(0,0,0,0.2)] border border-border rounded-lg pt-3 pb-3 pr-10.5 pl-3.5 text-[16px] text-text outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(v => !v)}
                        className="absolute right-3 bg-transparent border-none text-text-sub cursor-pointer flex items-center justify-center select-none"
                      >
                        {showConfirmPw ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                            <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                            <line x1="2" y1="2" x2="22" y2="22" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                onClick={onClose}
                className="bg-transparent border border-border-strong text-text-sub rounded-[7px] py-1.75 px-4.5 text-[12px] cursor-pointer font-semibold"
              >{t.cancel}</button>
              {avatar !== initialAvatar ? (
                <button
                  onClick={() => handleSave('avatar')}
                  disabled={loading}
                  style={{ opacity: loading ? 0.7 : 1 }}
                  className="bg-accent border-none text-white rounded-[7px] py-1.75 px-5 text-[12px] font-extrabold cursor-pointer shadow-[0_0_15px_var(--accent-light)]"
                >
                  {loading ? t.processing : t.saveChanges}
                </button>
              ) : (
                activeTab === 'security' && (
                  <button
                    onClick={() => handleSave('security')}
                    disabled={loading}
                    style={{ opacity: loading ? 0.7 : 1 }}
                    className="bg-accent border-none text-white rounded-[7px] py-1.75 px-5 text-[12px] font-extrabold cursor-pointer shadow-[0_0_15px_var(--accent-light)]"
                  >
                    {loading ? t.processing : t.updatePassword}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Network Status Alert ─────────────────────────────────────────
function NetworkAlert({ isOffline, isSlow }) {
  const { t } = useTheme()
  if (!isOffline && !isSlow) return null

  return createPortal(
    <div style={{
      backgroundColor: isOffline ? 'rgba(239, 68, 68, 0.95)' : 'rgba(245, 158, 11, 0.95)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3), 0 0 20px rgba(239,68,68,0.2)',
      borderColor: isOffline ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
      borderStyle: 'solid',
      borderWidth: 1,
    }} className="fixed bottom-[30px] left-1/2 -translate-x-1/2 z-[1000000] w-[min(400px,90vw)] backdrop-blur-md text-white py-4 px-5 rounded-2xl flex gap-4 items-center animate-[slideUp_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)]">
      <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.2)] flex items-center justify-center text-[24px] animate-pulse">
        {isOffline ? '📡' : '⏳'}
      </div>
      <div className="flex-1">
        <div className="text-[14px] font-black tracking-wide mb-0.5">
          {isOffline ? t.connLost : t.connSlow}
        </div>
        <div className="text-[11px] opacity-90 leading-normal font-semibold">
          {isOffline ? t.connLostDesc : t.connSlowDesc}
        </div>
      </div>
    </div>,
    document.body
  )
}

function getInitialNav() {
  const saved = localStorage.getItem('spmt_active_nav')
  return ['dashboard', 'websites', 'activity-log', 'users', 'admin-tools'].includes(saved) ? saved : 'dashboard'
}

function AppInner() {
  const { user, isSuperAdmin, canManageUsers, logout } = useAuth()
  const { themeId, t } = useTheme()
  const [loggedIn, setLoggedIn] = useState(!!user)
  const [activeNav, setActiveNav] = useState(getInitialNav)
  const [summary, setSummary] = useState(null)
  const [websites, setWebsites] = useState([])
  const [users, setUsers] = useState([])
  const [allEvents, setAllEvents] = useState([])
  const [notifications, setNotifications] = useState([])
  const [showLogout, setShowLogout] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showAllNotifs, setShowAllNotifs] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isTvMode, setTvMode] = useState(false)
  // Drive the LIVE/CONNECTING indicator from the real WebSocket open state, not from
  // the first monitor_update message (which can lag many seconds after a refresh).
  const wsConnected = useWebSocketStatus()
  const [globalRefreshKey, setGlobalRefreshKey] = useState(0)
  const [detailWebsiteId, setDetailWebsiteId] = useState(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [isSlow, setIsSlow] = useState(false)

  // Monitor Browser Connectivity
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check for slow connection (if supported)
    if (navigator.connection) {
      const updateConn = () => {
        const type = navigator.connection.effectiveType
        setIsSlow(type === 'slow-2g' || type === '2g' || type === '3g')
      }
      navigator.connection.addEventListener('change', updateConn)
      updateConn()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const websitesRef = useRef(websites)
  useEffect(() => { websitesRef.current = websites }, [websites])



  useEffect(() => {
    const fn = () => {
      if (!document.fullscreenElement) {
        document.body.classList.remove('tv-mode')
        setTvMode(false)
      }
    }
    document.addEventListener('fullscreenchange', fn)
    return () => document.removeEventListener('fullscreenchange', fn)
  }, [])

  const toggleTvMode = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { })
      document.body.classList.add('tv-mode')
      setTvMode(true)
    } else {
      document.exitFullscreen().catch(() => { })
      document.body.classList.remove('tv-mode')
      setTvMode(false)
    }
  }, [])

  const playAlarm = useCallback(() => {
    if (localStorage.getItem('spmt_sound') === 'off') return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Ping 1
      const o1 = ctx.createOscillator(); const g1 = ctx.createGain();
      o1.type = 'sawtooth';
      o1.frequency.setValueAtTime(880, ctx.currentTime);
      o1.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      g1.gain.setValueAtTime(0.2, ctx.currentTime);
      g1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      o1.connect(g1); g1.connect(ctx.destination);
      o1.start(); o1.stop(ctx.currentTime + 0.3);

      // Ping 2
      setTimeout(() => {
        const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
        o2.type = 'sawtooth';
        o2.frequency.setValueAtTime(880, ctx.currentTime);
        o2.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
        g2.gain.setValueAtTime(0.2, ctx.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        o2.connect(g2); g2.connect(ctx.destination);
        o2.start(); o2.stop(ctx.currentTime + 0.3);
      }, 150);

    } catch (e) { }
  }, [])

  // Native OS notification for critical alerts (works even when the tab is in the background)
  const showDesktopNotif = useCallback((notif) => {
    if (localStorage.getItem('spmt_desktop_notif') !== 'on') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const n = new Notification(`🚨 ${notif.name || 'Website'} — ${notif.type}`, {
        body: notif.reason || notif.url || 'Status berubah',
        tag: `spmt-${notif.websiteId}`,
        icon: '/favicon.ico',
      });
      n.onclick = () => { window.focus(); n.close(); };
    } catch (e) { }
  }, [])

  const loadSummary = useCallback(async (signal) => {
    if (!loggedIn) return;
    try {
      const r = await dashboardAPI.getSummary({ signal });
      setSummary(r.data)
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
    }
  }, [loggedIn])

  const loadWebsites = useCallback(async (signal) => {
    if (!loggedIn) return;
    try {
      const r = await websiteAPI.getAll({ signal });
      setWebsites(r.data || []);
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
    }
  }, [loggedIn])

  const loadUsers = useCallback(async () => {
    if (!loggedIn || !canManageUsers) return;
    try {
      const r = await userAPI.getAll();
      setUsers(r.data || []);
    } catch (e) { }
  }, [loggedIn, canManageUsers])

  const loadEvents = useCallback(async () => {
    if (!loggedIn) return;
    try {
      const r = await eventsAPI.getAll(500);
      setAllEvents(r.data || []);
    } catch (e) { }
  }, [loggedIn])

  const triggerGlobalRefresh = useCallback(async () => {
    setGlobalRefreshKey(k => k + 1)
    await Promise.all([loadSummary(), loadWebsites(), loadEvents(), loadUsers()])
  }, [loadSummary, loadWebsites, loadEvents, loadUsers])

  const handleWebsiteUpdate = useCallback(async () => {
    await triggerGlobalRefresh();
    setRefreshTrigger(t => t + 1)
  }, [triggerGlobalRefresh])

  const handleUserUpdate = useCallback(() => {
    loadUsers();
    triggerGlobalRefresh();
  }, [loadUsers, triggerGlobalRefresh])

  useEffect(() => {
    if (!loggedIn) return;
    const controller = new AbortController();

    // Initial Load - Parallel
    triggerGlobalRefresh();

    // Global refresh rates: 1s for summary and websites, 2s for users/events
    const rSummary = 1000;
    const rWebsites = 1000;
    const rUsersEvents = 2000;

    const ivSummary = setInterval(() => loadSummary(controller.signal), rSummary);
    const ivWebsites = setInterval(() => loadWebsites(controller.signal), rWebsites); // More frequent but stable
    const ivUsersEvents = setInterval(() => { loadUsers(); loadEvents(); }, rUsersEvents);

    return () => {
      controller.abort();
      clearInterval(ivSummary);
      clearInterval(ivWebsites);
      clearInterval(ivUsersEvents);
    }
  }, [loggedIn, triggerGlobalRefresh, loadSummary, loadWebsites, loadUsers, loadEvents])

  const navTo = useCallback((nav) => {
    if (nav === 'users' && !canManageUsers) return;
    setActiveNav(nav);
    localStorage.setItem('spmt_active_nav', nav);
    // Auto refresh data whenever user switches pages
    triggerGlobalRefresh();
  }, [canManageUsers, triggerGlobalRefresh])

  const handleNewNotification = useCallback((notif) => {
    // Recovery event: optionally auto-acknowledge (mark read) prior alerts for this website
    if (notif.type === 'ONLINE') {
      if (localStorage.getItem('spmt_autoack') === 'on') {
        setNotifications(prev => prev.some(n => n.websiteId === notif.websiteId && !n.read)
          ? prev.map(n => n.websiteId === notif.websiteId && !n.read ? { ...n, read: true } : n)
          : prev)
      }
      return
    }
    if (notif.type !== 'OFFLINE' && notif.type !== 'CRITICAL' && notif.type !== 'WARNING') return
    setNotifications(prev => {
      const dupe = prev.find(n => n.websiteId === notif.websiteId && n.type === notif.type && (Date.now() - n.ts) < 300000);
      if (dupe) return prev;
      if (notif.type === 'OFFLINE') playAlarm(); // Sound ONLY when something goes offline
      showDesktopNotif(notif); // OS-level popup if enabled
      return [{ ...notif, read: false }, ...prev].slice(0, 200)
    })
  }, [playAlarm, showDesktopNotif])

  const handleMarkRead = useCallback((idx) => setNotifications(p => p.map((n, i) => i === idx ? { ...n, read: true } : n)), [])
  const handleMarkAllRead = useCallback(() => setNotifications(p => p.map(n => ({ ...n, read: true }))), [])
  const handleDelete = useCallback((idx) => setNotifications(p => p.filter((_, i) => i !== idx)), [])
  const handleClearAll = useCallback(() => setNotifications([]), [])

  useEffect(() => {
    const h = () => {
      setLoggedIn(false);
      setSummary(null);
      setWebsites([]);
      setNotifications([]);
    }
    window.addEventListener('auth:logout', h)

    // REFRESH ON TAB FOCUS - Ensuring fresh data whenever user returns
    const handleFocus = () => {
      if (loggedIn) {
        loadSummary();
        loadWebsites();
      }
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('auth:logout', h)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loggedIn, loadSummary, loadWebsites])
  const handleLogout = () => {
    setShowLogout(false);
    logout();
    setLoggedIn(false);
    localStorage.removeItem('spmt_active_nav');
    window.location.reload(); // Force full refresh for clean public state
  }

  if (!loggedIn) {
    return (
      <LoginPage
        onLogin={() => {
          setLoggedIn(true)
          showToast(t.loginSuccess)
        }}
      />
    )
  }

  const navItems = ['dashboard', 'websites', 'activity-log', ...(canManageUsers ? ['users'] : [])]

  const realtimeSnapshot = {
    online: websites.filter(w => w.status === 'ONLINE').length,
    critical: websites.filter(w => w.status === 'CRITICAL' || w.status === 'WARNING').length,
    offline: websites.filter(w => w.status === 'OFFLINE').length,
    unknown: websites.filter(w => !w.status || w.status === 'UNKNOWN').length
  }

  return (
    <div className={`${themeId} app-shell w-full h-full flex flex-col overflow-hidden bg-bg-main text-text relative`}>

      {/* Sci-Fi Ambient Glows (Light Mode) */}
      <div style={{ background: 'radial-gradient(circle, var(--accent-light) 0%, transparent 70%)' }} className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] z-0 pointer-events-none opacity-50" />
      <div style={{ background: 'radial-gradient(circle, var(--accent-light) 0%, transparent 70%)' }} className="absolute bottom-[-5%] right-[-5%] w-[30vw] h-[30vw] z-0 pointer-events-none opacity-50" />

      <TopBar
        summary={summary} activeNav={activeNav} onNavChange={navTo}
        pendingCount={canManageUsers ? users.filter(u => u.status === 'pending').length : 0}
        websites={websites} notifications={notifications}
        onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead}
        onNavigate={(nav) => { if (nav === 'notifications') setShowAllNotifs(true); else navTo(nav) }}
        onOpenDetail={(w) => setDetailWebsiteId(w.id)}
        navItems={navItems}
        isTvMode={isTvMode} onToggleTvMode={toggleTvMode}
        onProfile={() => setShowProfile(true)}
        onLogout={() => setShowLogout(true)}
        onSettings={() => setShowSettings(true)}
        onAbout={() => setShowAbout(true)}
      />
      <div className="page-fade-in app-main flex-1 flex flex-col overflow-hidden min-h-0 z-[1] relative">
        {activeNav === 'dashboard' && <DashboardPage onSummaryUpdate={setSummary} websites={websites} onWebsitesUpdate={setWebsites} onNewNotification={handleNewNotification} refreshTrigger={refreshTrigger} realtimeSnapshot={realtimeSnapshot} wsConnected={wsConnected} onOpenDetail={(w) => setDetailWebsiteId(w.id)} />}
        {activeNav === 'websites' && <WebsitesPage websites={websites} onWebsiteUpdate={handleWebsiteUpdate} />}
        {activeNav === 'activity-log' && <ActivityLogPage events={allEvents} />}
        {activeNav === 'users' && canManageUsers && <UsersPage users={users} onUserUpdate={handleUserUpdate} />}
      </div>

      {detailWebsiteId === 'spmt-server' && (
        <ServerDetailModal onClose={() => setDetailWebsiteId(null)} />
      )}
      {detailWebsiteId && detailWebsiteId !== 'spmt-server' && (
        <ServiceDetailModal 
          website={websites.find(w => w.id === detailWebsiteId)} 
          onClose={() => setDetailWebsiteId(null)} 
        />
      )}
      {showAllNotifs && <AllNotificationsPanel notifications={notifications} onDelete={handleDelete} onClearAll={handleClearAll} onClose={() => setShowAllNotifs(false)}
        onOpen={(n) => {
          setNotifications(prev => prev.map(x => x === n ? { ...x, read: true } : x))
          setDetailWebsiteId(n.websiteId)
          setShowAllNotifs(false)
        }} />}
      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}
      {showLogout && <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogout(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      <NetworkAlert isOffline={isOffline} isSlow={isSlow} />
    </div>
  )
}

export default function App() { return <ThemeProvider><AuthProvider><WebSocketProvider><AppInner /><ToastContainer /></WebSocketProvider></AuthProvider></ThemeProvider> }
