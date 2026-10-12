import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { notificationAPI } from '../../services/api'
import { useTheme } from '../../store/theme'
import { cleanReason } from '../../utils/rootCause'
import { getDomain, shouldSkipFavicon } from '../../utils/favicon'

const SC = { ONLINE: '#10b981', WARNING: '#f59e0b', CRITICAL: '#ef4444', OFFLINE: '#dc2626', UNKNOWN: '#94a3b8' }
const SI = { ONLINE: '🟢', WARNING: '🟡', CRITICAL: '🔴', OFFLINE: '🔴', UNKNOWN: '⚪' }
const DD_ID = 'spmt-notif-dd'
const LOCALE_MAP = { id: 'id-ID', en: 'en-US', zh: 'zh-CN', ja: 'ja-JP', ru: 'ru-RU' }

function NotifDetailModal({ n, onClose }) {
  const { t, tStatus, lang } = useTheme()
  const locale = LOCALE_MAP[lang] || 'en-US'
  const domain = n.url ? getDomain(n.url) : null
  const shouldSkip = n.url ? shouldSkipFavicon(n.url) : true
  return createPortal(
    <div className="fixed inset-0 bg-[rgba(30,41,59,0.45)] z-[99999] flex items-center justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-bg-card backdrop-blur-[20px] border border-border-strong rounded-[14px] w-[400px] max-w-[92vw] shadow-[0_16px_48px_rgba(0,0,0,0.2)] animate-[fadeIn_0.15s_ease]">
        <div className="flex items-center justify-between py-3.5 px-[18px] border-b border-[rgba(99,102,241,0.1)]">
          <div className="flex items-center gap-2">
            {!shouldSkip && domain && <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} width={18} height={18} alt="" onError={e => { e.target.style.display = 'none' }} className="rounded" />}
            <span className="text-[13px] font-bold text-text">{n.name}</span>
            <span style={{ background: (SC[n.type] || '#94a3b8') + '18', color: SC[n.type] || '#94a3b8', borderColor: (SC[n.type] || '#94a3b8') + '33' }} className="border rounded-[4px] py-[1px] px-[7px] text-[10px] font-bold">{tStatus(n.type)}</span>
          </div>
          <button onClick={onClose} className="bg-none border-none text-text-muted cursor-pointer text-base">✕</button>
        </div>
        <div className="pt-1.5 pb-[18px] px-[18px]">
          {[[t.statusChange, <><span style={{ color: SC[n.oldStatus] || 'var(--text-muted)' }} className="font-semibold">{n.oldStatus ? tStatus(n.oldStatus) : '—'}</span><span className="text-text-sub mx-2">→</span><span style={{ color: SC[n.type] || 'var(--text)' }} className="font-bold">{tStatus(n.type)}</span></>],
          [t.rootCause, <span className="text-[#d97706]">{cleanReason(n.reason) || '—'}</span>],
          n.ip && [t.ipLabel, <span className="text-text-muted">{n.ip}</span>],
          n.responseTime != null && [t.responseLabel, <span className={n.responseTime > 3000 ? 'text-[#d97706]' : 'text-[#059669]'}>{n.responseTime}ms</span>],
          n.url && [t.urlLabel, <span className="text-[#4f46e5] text-[11px] break-all">{n.url}</span>],
          [t.timeLabel, <span className="text-text-muted text-[11px]">{new Date(n.ts).toLocaleString(locale, { hour12: false })}</span>],
          ].filter(Boolean).map(([k, v]) => (
            <div key={k} className="flex justify-between items-center py-2 px-0 border-b border-[rgba(99,102,241,0.06)]">
              <span className="text-[10px] text-text-muted font-bold tracking-wider shrink-0">{k}</span>
              <div className="text-right text-[12px]">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

function NotifDropdown({ notifications, unread, bellRef, onMarkAll, onItemClick, onViewAll }) {
  const { t, tStatus, lang } = useTheme()
  const locale = LOCALE_MAP[lang] || 'en-US'
  const [rect, setRect] = useState(null)
  useEffect(() => { if (bellRef.current) setRect(bellRef.current.getBoundingClientRect()) }, [bellRef])
  if (!rect) return null
  const fmt = ts => new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  return createPortal(
    <div id={DD_ID} className="fixed w-[min(340px,92vw)] bg-bg-card backdrop-blur-[20px] border border-border-strong rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] z-[99990] overflow-hidden animate-[fadeIn_0.15s_ease]"
         style={{ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) }}>
      <div className="flex items-center justify-between py-2.5 px-3.5 border-b border-[rgba(99,102,241,0.1)] bg-bg-card">
        <span className="text-[12px] font-bold text-text">🔔 {t.notifTitle}</span>
        <div className="flex gap-2 items-center">
          {unread > 0 && <button className="bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] text-[#4f46e5] rounded py-[2px] px-2 text-[9px] font-bold cursor-pointer" onClick={onMarkAll}>{t.markAllReadBtn}</button>}
          <span className="text-[10px] text-text-muted">{unread > 0 ? `${unread} ${t.unreadLabel}` : t.allReadLabel}</span>
        </div>
      </div>
      <div className="max-h-[360px] overflow-y-auto">
        {notifications.length === 0 ? <div className="text-center text-text-muted text-[12px] py-7 px-0">{t.noNotifYet}</div>
          : notifications.slice(0, 50).map((n, i) => {
            const domain = n.url ? getDomain(n.url) : null
            const shouldSkip = n.url ? shouldSkipFavicon(n.url) : true
            return (
              <div key={i} className="flex items-start gap-2.5 py-2.5 px-3.5 border-b border-[rgba(99,102,241,0.06)] cursor-pointer transition-colors duration-150"
                style={{ background: !n.read ? 'rgba(79,70,229,0.05)' : 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = !n.read ? 'rgba(79,70,229,0.05)' : 'transparent'}
                onClick={() => onItemClick(n, i)}>
                {!shouldSkip && domain ? <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} width={16} height={16} alt="" onError={e => { e.target.style.display = 'none' }} className="rounded-[3px] shrink-0 mt-[1px]" /> : <span className="text-[14px] shrink-0 leading-none">{SI[n.type] || '🔔'}</span>}
                <div className="flex-1 min-w-0">
                  <div style={{ color: SC[n.type] }} className="text-[12px] font-bold flex items-center gap-1.5">
                    {n.name}{!n.read && <span className="text-[8px] bg-[#f0ededff] text-text rounded-[3px] py-[1px] px-1 font-bold">{t.newBadge}</span>}
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    {n.oldStatus && <><span style={{ color: SC[n.oldStatus] }}>{tStatus(n.oldStatus)}</span><span className="text-text-sub mx-1">→</span></>}
                    <span style={{ color: SC[n.type] }} className="font-semibold">{tStatus(n.type)}</span>
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5 tabular-nums">{fmt(n.ts)}</div>
                </div>
                <span className="text-[#cbd5e1] text-[12px] shrink-0">›</span>
              </div>
            )
          })}
      </div>
      <div className="py-2 px-3.5 bg-bg-card border-t border-[rgba(99,102,241,0.1)] text-center">
        <button className="bg-none border-none text-[#4f46e5] text-[11px] font-bold cursor-pointer" onClick={onViewAll}>{t.viewAllNotif} →</button>
      </div>
    </div>,
    document.body
  )
}

export default function NotificationBell({ notifications = [], onMarkRead, onMarkAllRead, onNavigate }) {
  const { t } = useTheme()
  const filteredNotifs = notifications.filter(n => n.type === 'ONLINE' || n.type === 'OFFLINE')
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const bellRef = useRef(null)
  const unread = filteredNotifs.filter(n => !n.read).length

  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const h = e => { if (bellRef.current && bellRef.current.contains(e.target)) return; const dd = document.getElementById(DD_ID); if (dd && dd.contains(e.target)) return; setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleMarkAll = async () => { onMarkAllRead?.(); try { await notificationAPI.markAllRead() } catch { } }
  const handleItemClick = (n, i) => { if (!n.read) onMarkRead?.(i); setDetail(n); setOpen(false) }
  const handleViewAll = () => { setOpen(false); setTimeout(() => onNavigate?.('notifications'), 50) }

  return (
    <>
      <div ref={bellRef} className="relative shrink-0">
        <button 
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`bell-btn ${isHovered ? 'vibrate-gentle' : ''} relative bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.2)] text-[#6366f1] rounded-[10px] py-2.5 px-3 cursor-pointer flex items-center transition-all duration-200`}
          style={{ 
            boxShadow: isHovered ? '0 0 15px rgba(99, 102, 241, 0.2)' : 'none'
          }}
          onClick={() => setOpen(v => !v)} title={t.notifTitle}>
          <svg 
            className={`transition-transform duration-200 ${unread > 0 && !isHovered ? 'vibrate-intense' : ''}`}
            width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unread > 0 && (
            <span className="absolute -top-2 -right-2 bg-[#ff0000] text-white text-[11px] font-black rounded-full py-0.5 px-[7px] min-w-[20px] text-center border-2 border-white shadow-[0_2px_8px_rgba(255,0,0,0.4)] z-[10]">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </div>
      {open && <NotifDropdown notifications={filteredNotifs} unread={unread} bellRef={bellRef} onMarkAll={handleMarkAll} onItemClick={handleItemClick} onViewAll={handleViewAll} />}
      {detail && <NotifDetailModal n={detail} onClose={() => setDetail(null)} />}
    </>
  )
}
