import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../../store/theme'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import MonitoringGraph from './MonitoringGraph'
import { Info, X, Zap } from 'lucide-react'
import { getDomain, shouldSkipFavicon } from '../../utils/favicon'

function InfoModal({ onClose }) {
  const { t, tStatus, lang } = useTheme()
  return createPortal(
    <div className="fixed inset-0 bg-[rgba(15,23,42,0.4)] backdrop-blur-[8px] z-[100000] flex items-center justify-center p-5"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-bg-card rounded-[20px] w-[560px] max-w-full max-h-[88vh] flex flex-col overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-border animate-[fadeIn_0.2s_ease]">
        <div className="py-5 px-6 bg-primary text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.2)] flex items-center justify-center"><Info size={18} /></div>
            <span className="text-[18px] font-black tracking-normal">{t.monitoringGuide}</span>
          </div>
          <button onClick={onClose} className="bg-none border-none text-white text-[24px] cursor-pointer opacity-80"><X /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6">
            <div className="text-[11px] font-black text-text-muted tracking-widest mb-3.5 uppercase">{t.statusLegendConditions}</div>
            <div className="flex flex-col gap-3">
              {[
                { s: 'ONLINE', c: '#10b981', t: t.legendOnlineCond, d: t.legendOnlineDesc },
                { s: 'WARNING', c: '#f59e0b', t: t.legendWarningCond, d: t.legendWarningDesc },
                { s: 'CRITICAL', c: '#ef4444', t: t.legendCriticalCond, d: t.legendCriticalDesc },
                { s: 'OFFLINE', c: '#dc2626', t: t.legendOfflineCond, d: t.legendOfflineDesc }
              ].map(item => (
                <div key={item.s} className="flex gap-4 p-3.5 bg-bg-main border border-border rounded-xl">
                  <div style={{ background: item.c, boxShadow: `0 0 10px ${item.c}44` }} className="w-3 h-3 rounded-full mt-1 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color: item.c }} className="text-[13px] font-black">{tStatus(item.s)}</span>
                      <span className="text-[10px] font-bold text-text-muted py-[2px] px-2 bg-bg-card border border-border rounded">{item.t}</span>
                    </div>
                    <p className="m-0 text-[12px] text-text-sub leading-normal">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 bg-[rgba(99,102,241,0.05)] rounded-xl border border-dashed border-accent">
            <div className="text-[12px] font-black text-primary mb-2 flex items-center gap-2">
              <Zap size={14} /> {t.engineMonitoring}
            </div>
            <p className="m-0 text-[12px] text-text-muted leading-relaxed">
              {t.engineDesc}
            </p>
          </div>

          <div className="mt-5 p-5 bg-bg-main rounded-xl border border-border flex flex-col gap-4">
            <div className="text-[12px] font-black text-accent uppercase tracking-wider">
              ⚙️ {lang === 'id' ? 'SISTEM FILTER & KONEKSI' : 'FILTERING & CONNECTION DETAILS'}
            </div>
            
            <div className="border-t border-border pt-3">
              <div className="text-[12px] font-extrabold text-text mb-1">
                ⏱️ {lang === 'id' ? 'Anti-Flapping / Debounce (Filter Status)' : 'Anti-Flapping / Debounce'}
              </div>
              <p className="m-0 text-[11.5px] text-text-sub leading-normal">
                {lang === 'id' 
                  ? 'Untuk menghindari alarm palsu (false alarm), perubahan status selain ONLINE harus konsisten selama 3 kali pengecekan berturut-turut pada status yang sama baru diterapkan (misal: 3 menit jika interval 60s). Pemulihan ke ONLINE langsung diterapkan instan.'
                  : 'To prevent false alarms, any status degradation (WARNING, CRITICAL, OFFLINE) must persist for 3 consecutive checks in the same status before it is confirmed. Recovery to ONLINE is instant.'}
              </p>
            </div>

            <div className="border-t border-border pt-3">
              <div className="text-[12px] font-extrabold text-text mb-1">
                📡 {lang === 'id' ? 'Deteksi Koneksi Lambat (Slow Connection)' : 'Slow Connection Detection'}
              </div>
              <p className="m-0 text-[11.5px] text-text-sub leading-normal">
                {lang === 'id'
                  ? 'Dashboard memantau performa jaringan browser Anda (RTT/Ping & Kecepatan Unduh). Jika ping browser Anda ke internet melebihi 270 ms atau kecepatan unduh di bawah 700 Kbps (setara performa 3G atau lebih lambat), peringatan koneksi lambat akan muncul.'
                  : 'The dashboard monitors your browser\'s estimated connection quality. If RTT (ping) exceeds 270 ms or download speed falls below 700 Kbps (3G speed or slower), a slow connection warning will appear.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Helpers ──────────────────────────────────────────────────
const fmtMs = ms => ms != null ? `${ms}ms` : '—'

const BADGE = {
  ONLINE: { color: '#10b981', glow: 'rgba(16,185,129,0.15)' },
  WARNING: { color: '#f59e0b', glow: 'rgba(245,158,11,0.15)' },
  CRITICAL: { color: '#ef4444', glow: 'rgba(239,68,68,0.15)' },
  OFFLINE: { color: '#dc2626', glow: 'rgba(220,38,38,0.15)' },
  UNKNOWN: { color: '#94a3b8', glow: 'none' },
}

// ── Sub-components ────────────────────────────────────────────

function Favicon({ url, name }) {
  const domain = getDomain(url)
  const shouldSkip = shouldSkipFavicon(url)

  const initial = (name || 'W')[0].toUpperCase()
  return (
    <div className="w-8 h-8 rounded-[6px] overflow-hidden shrink-0 bg-[rgba(99,102,241,0.1)] border border-border flex items-center justify-center relative">
      {!shouldSkip ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
          width={22} height={22} alt=""
          className="block"
          onError={e => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex' }}
        />
      ) : null}
      <span style={{ display: shouldSkip ? 'flex' : 'none' }} className="absolute inset-0 items-center justify-center text-[14px] font-bold text-accent">
        {initial}
      </span>
    </div>
  )
}

// ── ServiceRow (Compact List Item) ────────────────────────────

function ServiceRow({ w, isSelected, onSelect, onOpenDetail, isDark }) {
  const { t, tStatus } = useTheme()
  const c = BADGE[w.status] || BADGE.UNKNOWN
  const isOnline = w.status === 'ONLINE'
  const [hover, setHover] = useState(false)

  // Dynamic colors for dark vs light theme - user requested bright vibrant cards in dark mode
  const normalBg = isDark ? 'rgba(255, 255, 255, 0.9)' : 'var(--bg-card)'
  const hoverBg = isDark ? '#ffffff' : '#f1f5f9'
  const selectedBg = isDark ? '#ffffff' : 'rgba(59, 130, 246, 0.1)'
  const normalBorder = isDark ? 'rgba(255, 255, 255, 0.5)' : 'var(--border)'
  const selectedBorder = c.color
  
  const textColor = isDark ? '#0f172a' : 'var(--text)'
  const subTextColor = isDark ? '#334155' : 'var(--text-sub)'

  return (
    <div
      className={`glass-card hover-glow ${w.status === 'OFFLINE' || w.status === 'CRITICAL' ? 'glitch-offline' : ''} flex items-center gap-3 py-2.5 px-3.5 cursor-pointer border mb-2.5 rounded-none relative`}
      style={{
        borderColor: isSelected ? selectedBorder : (hover ? (isDark ? c.color : '#94a3b8') : normalBorder),
        background: isSelected ? selectedBg : (hover ? hoverBg : normalBg),
        boxShadow: isSelected 
          ? `0 0 12px ${c.color}50, 0 0 8px ${c.color}30 inset` 
          : (hover ? `0 4px 15px ${c.color}40` : '0 4px 12px rgba(0, 0, 0, 0.1)'),
        clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease, background-color 0.2s ease, border-color 0.2s ease'
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => {
        onSelect?.(w.id === isSelected ? null : w.id)
        onOpenDetail?.(w)
      }}
    >
      {/* Dynamic Status Vertical Line */}
      <div style={{ background: c.color, boxShadow: `0 0 8px ${c.color}` }} className="absolute left-0 top-0 bottom-0 w-1" />

      <div style={{ transform: 'scale(1.1)' }} className="shrink-0">
        <Favicon url={w.url} name={w.name} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2.5">
          <span
            style={{ color: textColor }}
            className="text-[15px] font-[1000] [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden text-ellipsis flex-1 leading-[1.1]"
            title={w.name}
          >
            {w.name}
          </span>
          <span
            style={{
              color: !w.status_code ? '#ef4444' : (isOnline ? '#10b981' : c.color),
              background: isDark ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.03)',
              borderColor: !w.status_code ? '#ef444433' : c.color + '33',
              borderWidth: '1px',
              borderStyle: 'solid'
            }}
            className="text-[14px] font-black py-[2px] px-2 rounded shrink-0"
          >
            {w.status_code ? `HTTP ${w.status_code}` : t.timeout}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2.5">
          <div
            style={{
              background: isDark ? 'rgba(0,0,0,0.05)' : `${c.color}15`,
              borderColor: `${c.color}33`
            }}
            className="flex items-center gap-1.5 py-[2px] px-2 rounded shrink-0 border"
          >
            <span style={{ background: c.color, boxShadow: `0 0 6px ${c.color}` }} className="w-2 h-2 rounded-full animate-[pulse_1.5s_infinite]" />
            <span style={{ color: c.color }} className="text-[12px] font-black tracking-wider">
              {tStatus(w.status)}
            </span>
          </div>
          <span style={{ color: w.response_time_ms > 15000 ? 'var(--status-critical)' : subTextColor }} className="text-[14px] font-[1000] shrink-0">
            {fmtMs(w.response_time_ms)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Main StatusPanel ──────────────────────────────────────────

export default function StatusPanel({ websites, selectedId, onSelect, onOpenDetail, realtimeSnapshot, activeIncidents = [] }) {
  const { themeId, t } = useTheme()
  const isDark = themeId === 'theme-dark'
  // On phones the node list lives in the topology section (with its own search/
  // filter/sort), so this duplicate Live Feed is hidden and the graph takes over.
  const { isPhone } = useBreakpoint()
  const [showInfo, setShowInfo] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('status')

  const filtered = websites.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.url.toLowerCase().includes(search.toLowerCase())

    let matchesStatus = true
    if (statusFilter !== 'ALL') {
      matchesStatus = w.status === statusFilter
    }

    return matchesSearch && matchesStatus
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'status') {
      const order = { OFFLINE: 0, CRITICAL: 1, WARNING: 2, ONLINE: 4, UNKNOWN: 5 }
      return (order[a.status] ?? 6) - (order[b.status] ?? 6)
    }
    if (sortBy === 'a-z') {
      return a.name.localeCompare(b.name)
    }
    if (sortBy === 'z-a') {
      return b.name.localeCompare(a.name)
    }
    if (sortBy === 'newest') {
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    }
    if (sortBy === 'oldest') {
      return new Date(a.created_at || 0) - new Date(b.created_at || 0)
    }
    return 0
  })

  return (
    <div className="flex flex-col bg-bg-card backdrop-blur-[10px] border border-border rounded-xl overflow-hidden flex-1">

      {/* Content Stack: Live Feed Top, Graph Bottom */}
      <div className="flex-1 overflow-y-hidden flex flex-col">

        {/* LIVE FEED SECTION (Top 60%) — hidden on phones (lives in topology there) */}
        {!isPhone && (
        <div className="h-[60%] flex flex-col border-b-2 border-border">
          <div className="py-2 px-3 bg-bg-header border-b border-border flex flex-col gap-2">

            {/* Row 1: Title and Info Button */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-text-sub tracking-wider">
                🌐 {t.liveNodesFeed} ({sorted.length}/{websites.length})
              </span>
              <button
                onClick={() => setShowInfo(true)}
                className="bg-accent-light border border-border rounded-full w-6 h-6 flex items-center justify-center cursor-pointer text-accent shrink-0"
                title={t.learnStatus}
              >
                <Info size={12} />
              </button>
            </div>

            {/* Row 2: Search (full width) */}
            <div className="flex gap-1.5 items-center">
              {/* Search input — baris penuh sendiri agar tidak terpotong/tersembunyi */}
              <div className="flex-1 relative min-w-0">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] opacity-50">🔍</span>
                <input
                  id="service-search"
                  name="service-search"
                  type="search"
                  aria-label={t.searchPlaceholder}
                  autoComplete="off"
                  className="w-full py-2 pr-3 pl-8 rounded-lg border border-border bg-bg-card text-text text-[12px] outline-none transition-all duration-200 text-ellipsis"
                  placeholder={t.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 bg-none border-none text-text-muted cursor-pointer text-[11px]">✕</button>
                )}
              </div>
            </div>

            {/* Row 3: Status & Sort controls */}
            <div className="flex gap-1.5 items-center">
              {/* Status filter */}
              <select
                id="status-filter"
                name="status-filter"
                aria-label={t.allStatus}
                className="flex-1 py-[7px] px-1.5 rounded-lg border border-border bg-bg-card text-text text-[11px] outline-none cursor-pointer font-bold min-w-0 text-ellipsis"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="ALL">{t.allStatus}</option>
                <option value="ONLINE">🟢 {t.online}</option>
                <option value="CRITICAL">🟡 {t.critical}</option>
                <option value="OFFLINE">🔴 {t.offline}</option>
              </select>

              {/* Sort by */}
              <select
                id="sort-by"
                name="sort-by"
                aria-label={t.sortLabel}
                className="flex-1 py-[7px] px-1.5 rounded-lg border border-border bg-bg-card text-text text-[11px] outline-none cursor-pointer font-bold min-w-0 text-ellipsis"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="status">{t.sortLabel}</option>
                <option value="a-z">{t.azLabel}</option>
                <option value="z-a">{t.zaLabel}</option>
                <option value="newest">{t.newestLabel}</option>
                <option value="oldest">{t.oldestLabel}</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-3 px-3.5 flex flex-col bg-bg-main">
            {sorted.length === 0 && (
              <div className="text-center text-text-muted text-[12px] py-7.5 px-0">
                {search || statusFilter !== 'ALL' ? (
                  <div>
                    {t.noMatchingNodes}
                    <button
                      onClick={() => { setSearch(''); setStatusFilter('ALL'); setSortBy('status') }}
                      className="block my-2 mx-auto bg-none border-none text-accent cursor-pointer text-[10px] font-bold"
                    >
                      {t.resetFilters}
                    </button>
                  </div>
                ) : t.noServicesConfigured}
              </div>
            )}
            {sorted.map(w => (
              <ServiceRow
                key={w.id}
                w={w}
                isSelected={selectedId === w.id}
                onSelect={onSelect}
                onOpenDetail={onOpenDetail}
                isDark={isDark}
              />
            ))}
          </div>
        </div>
        )}

        {/* GRAPH SECTION (Bottom 40%; full height on phones since the feed is hidden) */}
        <div style={{ height: isPhone ? '100%' : '40%' }} className="flex flex-col bg-bg-main">
          <div className="flex-1 flex overflow-hidden p-2.5">
            <MonitoringGraph realtimeSnapshot={realtimeSnapshot} />
          </div>
        </div>

      </div>
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
    </div>
  )
}
