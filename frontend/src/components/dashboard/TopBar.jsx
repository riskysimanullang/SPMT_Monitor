import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../store/auth'
import { useTheme } from '../../store/theme'
import NotificationBell from './NotificationBell'
import MetricDetailModal from './MetricDetailModal'
import { publicAPI } from '../../services/api'

const fmtSLA = v => v == null ? '0.00' : Number(v).toFixed(2)
const DROPDOWN_ID = 'profile-dd'
const LOCALE_MAP = { id: 'id-ID', en: 'en-US', zh: 'zh-CN', ja: 'ja-JP', ru: 'ru-RU' }

function ProfileDropdown({ user, avatar, onProfile, onLogout, onSettings, onAbout, onClose, rect, telegramLink }) {
  if (!rect) return null
  const { themeId, setTheme, THEME_OPTIONS, t } = useTheme()
  const rc = { superadmin: '#7c3aed', admin: '#3b82f6', adminpelindo: '#10b981', viewer: '#64748b' }[user?.role] || '#64748b'
  const rl = { superadmin: 'SuperAdmin', admin: 'Admin', adminpelindo: 'Admin Pelindo', viewer: 'Viewer' }[user?.role] || 'User'

  const lightThemes = THEME_OPTIONS.filter(t => t.dark === false)
  const darkThemes = THEME_OPTIONS.filter(t => t.dark === true)

  return createPortal(
    <div id={DROPDOWN_ID} className="fixed w-[280px] bg-bg-card backdrop-blur-[24px] border border-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[99995] overflow-hidden animate-[fadeIn_0.15s_ease]"
         style={{ top: rect.bottom + 8, right: window.innerWidth - rect.right }}>

      <div className="p-4 border-b border-border bg-accent-light">
        <div className="flex items-center gap-3">
          <div style={{ background: avatar ? 'transparent' : `linear-gradient(135deg,${rc}22,${rc}44)`, border: `2px solid ${rc}88`, color: rc }}
               className="w-11 h-11 rounded-full flex items-center justify-center text-[18px] font-extrabold overflow-hidden">
            {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="" /> : (user?.username || '?')[0].toUpperCase()}
          </div>
          <div>
            <div className="text-[15px] font-extrabold text-text">{user?.username}</div>
            <div style={{ color: rc }} className="text-[11px] font-bold tracking-wider">{rl.toUpperCase()}</div>
          </div>
        </div>
      </div>

      <div className="p-1">
        {[{ icon: '👤', label: t.profile, action: onProfile }, { icon: '⚙️', label: t.settings, action: onSettings }, { icon: 'ℹ️', label: t.about, action: onAbout }].map(item => (
          <button key={item.label} onClick={() => { item.action(); onClose() }}
            className="w-full flex items-center gap-2.5 py-2.5 px-3 bg-transparent border-none cursor-pointer text-left text-text text-[14px] font-semibold rounded-lg transition-all duration-200"
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span className="text-[16px]">{item.icon}</span>{item.label}
          </button>
        ))}
        <button 
          title={t.telegramJoinTooltip || "Gabung ke grup Telegram untuk mendapatkan notifikasi real-time"}
          onClick={() => {
            window.open(telegramLink || 'https://t.me/spmt_monitoring_group', '_blank', 'noopener,noreferrer');
            onClose();
          }}
          className="w-full flex items-center gap-2.5 py-2.5 px-3 bg-transparent border-none cursor-pointer text-left text-text text-[14px] font-semibold rounded-lg transition-all duration-200"
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="#229ED9" className="shrink-0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.62.15-.15 2.7-2.48 2.75-2.7.01-.03.01-.14-.06-.2-.07-.06-.17-.04-.25-.02-.11.02-1.78 1.14-5.06 3.35-.48.33-.91.49-1.3.48-.43-.01-1.26-.24-1.88-.45-.76-.25-1.37-.39-1.31-.83.03-.23.35-.46.96-.7 3.76-1.63 6.27-2.7 7.54-3.21 3.58-1.43 4.32-1.68 4.81-1.69.11 0 .35.03.5.15.13.1.16.24.18.33.02.1.04.31.02.47z"/></svg>Telegram
        </button>
        <div className="h-[1px] bg-border my-1 mx-2" />
        <button onClick={() => { onLogout(); onClose() }}
          className="w-full flex items-center gap-2.5 py-2.5 px-3 bg-transparent border-none cursor-pointer text-left text-status-offline text-[14px] font-bold rounded-lg transition-all duration-200"
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <span className="text-[16px]">🚪</span>{t.logout}
        </button>
      </div>
    </div>,
    document.body
  )
}

export default function TopBar({
  summary, activeNav, onNavChange, onLogout,
  websites, notifications, onMarkRead, onMarkAllRead, navItems = ['dashboard', 'websites', 'activity-log'], onNavigate,
  isTvMode, onToggleTvMode, onProfile, onSettings, onAbout, onOpenDetail, pendingCount = 0
}) {
  const { user } = useAuth()
  const { themeId, setTheme, t, lang } = useTheme()
  const locale = LOCALE_MAP[lang] || 'en-US'
  const [clock, setClock] = useState(new Date())
  const [showLogout, setShowLogout] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showTheme, setShowTheme] = useState(false)
  const [profileRect, setProfileRect] = useState(null)
  const [activeMetric, setActiveMetric] = useState(null)
  const [hoveredMetric, setHoveredMetric] = useState(null)
  const [hoveredNav, setHoveredNav] = useState(null)
  const [isClockHovered, setIsClockHovered] = useState(false)
  const [avatar, setAvatar] = useState(() => localStorage.getItem(`spmt_avatar_${user?.username}`) || null)
  const profileRef = useRef(null)
  const [telegramLink, setTelegramLink] = useState('https://t.me/spmt_monitoring_group')

  useEffect(() => {
    let active = true
    publicAPI.getTelegramLink()
      .then(res => {
        if (active && res.data && res.data.link) {
          setTelegramLink(res.data.link)
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    const h = () => setAvatar(localStorage.getItem(`spmt_avatar_${user?.username}`) || null)
    window.addEventListener('AvatarUpdated', h)
    return () => window.removeEventListener('AvatarUpdated', h)
  }, [user?.username])

  useEffect(() => { const iv = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(iv) }, [])
  useEffect(() => {
    const h = (e) => {
      if (profileRef.current && profileRef.current.contains(e.target)) return
      const dd = document.getElementById(DROPDOWN_ID)
      if (dd && dd.contains(e.target)) return
      setShowProfile(false)
    }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  const alertCount = summary?.active_alerts ?? 0
  const onlineCount = websites.filter(w => w.status === 'ONLINE').length
  const warningCount = websites.filter(w => w.status === 'WARNING').length
  const criticalCount = websites.filter(w => w.status === 'CRITICAL').length
  const offlineCount = websites.filter(w => w.status === 'OFFLINE').length
  const unknownCount = websites.filter(w => !w.status || w.status === 'UNKNOWN').length
  const totalCount = websites.length

  const metrics = [
    { id: 'online', label: t?.online || 'ONLINE', value: onlineCount, color: '#10b981' },
    { id: 'critical', label: t?.critical || 'CRITICAL', value: criticalCount + warningCount, color: '#d97706' },
    { id: 'offline', label: t?.offline || 'OFFLINE', value: offlineCount, color: '#ef4444' },
    { id: 'sla', label: 'SLA', value: `${fmtSLA(summary?.sla_percent)}%`, color: '#0ea5e9' },
    { id: 'total', label: t?.total || 'TOTAL', value: totalCount, color: '#64748b' },
    { id: 'avg-rt', label: t?.avgRt || 'AVG RT', value: `${Math.round(summary?.avg_response_time ?? 0)}ms`, color: '#8b5cf6' },
  ]

  const slaPct = Number(summary?.sla_percent || 100);

  const rc = { superadmin: '#8b5cf6', admin: '#3b82f6', adminpelindo: '#10b981', viewer: '#64748b' }[user?.role] || '#64748b'
  const rl = { superadmin: 'SA', admin: 'AD', adminpelindo: 'AP', viewer: 'VW' }[user?.role] || '??'
  const navIcon = tab => {
    if (tab === 'dashboard') return '📊'
    if (tab === 'websites') return '🌐'
    if (tab === 'incidents') return '🚨'
    if (tab === 'activity-log') return '📋'
    if (tab === 'notifications') return '🔔'
    if (tab === 'users') return '👥'
    return '📄'
  }
  const navTitle = tab => {
    if (tab === 'dashboard') return t?.dashboard || 'Dashboard'
    if (tab === 'websites') return t?.websites || 'Websites'
    if (tab === 'incidents') return t?.incidents || 'Incident Center'
    if (tab === 'activity-log') return t?.activity || 'Activity'
    if (tab === 'notifications') return t?.notifications || 'Notifications'
    if (tab === 'users') return t?.users || 'Users'
    return tab
  }

  return (
    <>
      <div className="topbar flex items-center justify-between lg:justify-start gap-1.5 md:gap-3 shrink-0 px-3 md:px-6 h-[72px] min-h-[72px] relative z-[100] border-b border-border bg-bg-header">

        {/* ── BRANDING SECTION (Logo Only) ── */}
        <div className="topbar-branding flex items-center h-full shrink-0">
          <div className="flex items-center bg-[rgba(255,255,255,0.6)] backdrop-blur-[10px] py-1.5 px-2 md:px-3.5 rounded-xl border border-border shadow-shadow">
            <img src="/images/logos/lo.png" alt="Logo"
              className="h-9 md:h-12 w-auto object-contain [filter:drop-shadow(0_0_8px_rgba(0,31,63,0.1))]" />
          </div>
        </div>

        {/* ── METRICS SECTION (Single Row) ──
            Rendered only on the dashboard so other pages don't reserve an empty
            metrics row (matters on phones, where it wraps to its own line). */}
        {activeNav === 'dashboard' && (
        <div className="topbar-metrics hidden lg:flex flex-nowrap gap-2">
          {metrics.map(m => {
            const active = activeMetric === m.id
            const isAlert = (m.id === 'alerts') && m.value > 0
            const isDark = themeId === 'theme-dark'

            // Generate clean class names for each metric type using the stable id
            const statusClass = m.id;

            return (
              <div key={m.id} title={`${t?.detail || 'Detail'} ${m.label}`}
                className={`metric-card m-${statusClass} hover-float cursor-pointer select-none flex flex-col items-center border min-w-0 w-full rounded-lg transition-all duration-300`}
                onMouseEnter={() => setHoveredMetric(m.id)}
                onMouseLeave={() => setHoveredMetric(null)}
                style={{
                  background: active ? m.color : (isDark ? m.color : `${m.color}22`),
                  borderColor: m.color,
                  color: isDark ? '#000000' : (active ? '#ffffff' : m.color),
                  zIndex: hoveredMetric === m.id ? 100 : 1
                }}
                onClick={() => setActiveMetric(active ? null : m.id)}>

                {/* Bubble Animation */}
                {hoveredMetric === m.id && (
                  <div className="bubble-wrap">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bubble-anim" style={{
                        left: `${Math.random() * 80 + 10}%`,
                        width: `${Math.random() * 10 + 4}px`,
                        height: `${Math.random() * 10 + 4}px`,
                        animationDelay: `${Math.random() * 1}s`
                      }} />
                    ))}
                  </div>
                )}

                {isAlert && <span className="absolute top-[1px] right-[2px] w-1 h-1 rounded-full bg-[#ff4d4f] animate-[pulse_1s_infinite]" />}

                <span className="text-[28px] font-black leading-none mb-[2px]">{m.value}</span>
                <span className="text-[11px] font-bold leading-none uppercase opacity-90">{m.label}</span>
              </div>
            )
          })}
        </div>
        )}

        {/* ── NAVIGATION SECTION (Pill Style) ── */}
        <div className="topbar-nav-container mx-auto">
          <div className="topbar-nav flex gap-0.5 bg-[#24411762] rounded-[25px] p-1 h-[54px] shrink-0 shadow-[0_4px_12px_rgba(53,188,218,0.73)]">
            {navItems.map(tab => (
              <button key={tab} title={navTitle(tab)}
                className={`nav-btn-custom ${activeNav === tab ? 'active' : ''} border-none text-[22px] px-5 rounded-[20px] cursor-pointer h-full flex items-center justify-center relative`}
                onMouseEnter={() => setHoveredNav(tab)}
                onMouseLeave={() => setHoveredNav(null)}
                style={{
                  background: activeNav === tab ? 'var(--primary)' : 'transparent',
                  color: activeNav === tab ? '#fff' : 'rgba(255,255,255,0.6)',
                  transform: hoveredNav === tab ? 'scale(1.2) translateY(-5px)' : 'scale(1)'
                }}
                onClick={() => onNavChange(tab)}>
                {navIcon(tab)}
                <span className="nav-label">{navTitle(tab)}</span>
                {tab === 'users' && pendingCount > 0 && (
                  <span title={`${pendingCount} registrasi menunggu konfirmasi`}
                        className="absolute top-[2px] right-[2px] min-w-[18px] h-[18px] px-[5px] rounded-[9px] bg-[#ef4444] text-white text-[11px] font-bold flex items-center justify-center border-2 border-bg-header shadow-[0_0_8px_rgba(239,68,68,0.7)]">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="topbar-actions flex items-center gap-2 shrink-0">
          <button onClick={onToggleTvMode} title={isTvMode ? t.exitFullScreen : t.enterFullScreen}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 0 12px var(--accent)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 0 4px rgba(0,0,0,0.1)';
            }}
            className="fixed top-1 right-1.5 z-[99999] flex items-center justify-center w-5 h-5 rounded-[5px] bg-[rgba(228,235,241,1)] backdrop-blur-[8px] border border-accent text-accent cursor-pointer shadow-[0_0_4px_rgba(0,0,0,0.1)] transition-all duration-300">
            {isTvMode ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            )}
          </button>

          <NotificationBell notifications={notifications} onMarkRead={onMarkRead} onMarkAllRead={onMarkAllRead} onNavigate={onNavigate} />

          <div
            onMouseEnter={() => setIsClockHovered(true)}
            onMouseLeave={() => setIsClockHovered(false)}
            className="hover-float topbar-clock hidden lg:flex shrink-0 px-4 xl:px-6 border-l border-r border-border text-right flex flex-col justify-center min-w-[140px] xl:min-w-[160px] transition-all duration-300">
            <div className={`topbar-clock-time ${isClockHovered ? 'rainbow-text' : ''} text-primary text-[32px] font-mono font-black tracking-normal leading-[1.1] transition-colors duration-300`}>
              {clock.toLocaleTimeString(locale, { hour12: false })}
            </div>
            <div className="text-text-muted text-[12px] font-bold tracking-wider mt-0.5 uppercase">
              {clock.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })}
            </div>
          </div>

          {/* Profile avatar */}
          <div ref={profileRef} className="relative shrink-0">
            <button onClick={() => { setShowProfile(v => !v); if (profileRef.current) setProfileRect(profileRef.current.getBoundingClientRect()) }}
              className="hover-glow flex items-center gap-1.5 md:gap-2.5 bg-accent-light border border-border rounded-[25px] py-1 md:py-1.5 pr-2 md:pr-4 pl-1 md:pl-1.5 cursor-pointer">
              <div style={{ background: avatar ? 'transparent' : `linear-gradient(135deg,${rc}22,${rc}44)`, border: `2px solid ${rc}`, color: rc }}
                   className="w-10 h-10 rounded-full flex items-center justify-center text-base font-extrabold shrink-0 overflow-hidden">
                {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="" /> : (user?.username || '?')[0].toUpperCase()}
              </div>
              <div className="topbar-username hidden sm:flex flex-col items-start min-w-0">
                <span className="text-text text-[14px] font-bold whitespace-nowrap max-w-[100px] overflow-hidden text-ellipsis">{user?.username}</span>
              </div>
              <span className="topbar-username hidden sm:inline text-text-muted text-[12px]">▾</span>
            </button>
            {showProfile && <ProfileDropdown user={user} avatar={avatar} rect={profileRect} onProfile={onProfile} onLogout={onLogout} onSettings={onSettings} onAbout={onAbout} onClose={() => setShowProfile(false)} telegramLink={telegramLink} />}
          </div>
        </div>
      </div>

      {activeMetric && <MetricDetailModal type={activeMetric} websites={websites} summary={summary} onOpenDetail={onOpenDetail} onClose={() => setActiveMetric(null)} />}
    </>
  )
}
