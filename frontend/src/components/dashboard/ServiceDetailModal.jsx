import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { websiteAPI, eventsAPI } from '../../services/api'
import { useGlobalWebSocket } from '../../store/WebSocketContext'
import { useTheme } from '../../store/theme'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getDomain, shouldSkipFavicon } from '../../utils/favicon'

const LOCALE_MAP = { id: 'id-ID', en: 'en-US', zh: 'zh-CN', ja: 'ja-JP', ru: 'ru-RU' }

const STATUS_COLORS = {
  ONLINE: '#10b981',
  WARNING: '#f59e0b',
  CRITICAL: '#ef4444',
  OFFLINE: '#dc2626',
  UNKNOWN: '#64748b'
}


import StatusBadgeIcon from '../common/StatusBadgeIcon'

const StatusBadge = ({ status }) => {
  const { tStatus } = useTheme()
  const c = {
    ONLINE: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
    WARNING: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    CRITICAL: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    OFFLINE: { bg: 'rgba(220,38,38,0.15)', color: '#dc2626', border: 'rgba(220,38,38,0.3)' },
  }[status] || { bg: 'rgba(74,85,104,0.15)', color: '#4a5568', border: 'rgba(74,85,104,0.3)' }
  return (
    <span style={{ backgroundColor: c.bg, color: c.color, borderColor: c.border }} className="inline-flex items-center gap-1 border rounded py-[2px] px-2 text-[11px] font-bold tracking-wider uppercase">
      {tStatus(status)}
      <StatusBadgeIcon status={status} />
    </span>
  )
}

const InfoRow = ({ label, value, valueColor }) => (
  <div className="flex justify-between items-center py-1.75 border-b border-border">
    <span className="text-[11px] text-text-muted tracking-wide">{label}</span>
    <span style={{ color: valueColor || 'var(--text)' }} className="text-[11px] font-bold max-w-[60%] text-right [word-break:break-all]">{value ?? '—'}</span>
  </div>
)

// ── Availability Timeline ─────────────────────────────────────

function AvailabilityTimeline({ websiteId }) {
  const { t, tStatus, lang } = useTheme()
  const tlLocale = LOCALE_MAP[lang] || 'en-US'
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async (silent = false) => {
    if (!websiteId) return
    const controller = new AbortController()
    if (!silent) setLoading(true)
    try {
      const r = await eventsAPI.getByWebsite(websiteId, 100, { signal: controller.signal })
      setEvents(r.data || [])
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'CanceledError') setEvents([])
    } finally {
      if (!silent) setLoading(false)
    }
    return () => controller.abort()
  }, [websiteId])

  useEffect(() => {
    const cleanup = fetchEvents()
    return () => { if (typeof cleanup === 'function') cleanup() }
  }, [fetchEvents])

  useGlobalWebSocket(useCallback((msg) => {
    if (msg.type === 'status_change' && (msg.payload.website_id === websiteId || msg.payload.WebsiteID === websiteId)) {
      fetchEvents(true)
    }
  }, [websiteId, fetchEvents]))

  const fmtT = (d) => new Date(d).toLocaleString(tlLocale, { hour12: false, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const fmtDuration = (fromMs, toMs) => {
    const diff = toMs - fromMs
    if (diff < 0) return '—'
    const s = Math.floor(diff / 1000)
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ${s % 60}s`
    const h = Math.floor(m / 60)
    return `${h}h ${m % 60}m`
  }

  if (loading) return <div className="text-center text-[#4a5568] p-6 text-[12px]">{t.tlLoading}</div>
  if (!events.length) return <div className="text-center text-[#4a5568] p-6 text-[12px]">{t.tlNoEvents}</div>

  // Build intervals: each event marks a transition
  // events are ordered DESC (newest first), reverse for chronological
  const sorted = [...events].reverse()

  return (
    <div>
      <div className="text-[10px] text-[#4a6fa5] mb-3 tracking-wide">
        {events.length} {t.tlEventsNewest}
      </div>

      {/* Visual timeline */}
      <div className="relative pl-5 mb-5">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-0 bottom-0 w-0.5 bg-border rounded-[1px]" />

        {[...events].slice(0, 40).map((ev, i) => {
          const prevEv = events[i + 1]
          const duration = prevEv ? fmtDuration(new Date(prevEv.created_at).getTime(), new Date(ev.created_at).getTime()) : (i === 0 ? t.tlOngoing : '—')
          const color = STATUS_COLORS[ev.new_status] || '#4a5568'

          return (
            <div key={ev.id} className="flex items-start gap-3.5 mb-3.5 relative">
              {/* Dot */}
              <div style={{
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}`,
              }} className="w-3.5 h-3.5 rounded-full shrink-0 border-2 border-bg-main z-[1]" />

              <div className="flex flex-col flex-1 gap-0.5">
                <div className="flex items-center gap-2 mb-0.5">
                  <span style={{ color }} className="text-[11px] font-bold">
                    {tStatus(ev.old_status)} → {tStatus(ev.new_status)}
                  </span>
                  <span style={{ backgroundColor: color + '22', color, borderColor: color + '44', borderWidth: 1 }} className="text-[9px] rounded py-[1px] px-1.5 font-semibold">
                    {tStatus(ev.new_status)}
                  </span>
                  <span className="text-[9px] text-[#4a5568] ml-auto">
                    {t.tlDuration}: {duration}
                  </span>
                </div>
                <div className="text-[10px] text-[#4a6fa5]">
                  {ev.website_name} · {fmtT(ev.created_at)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Status bar visual */}
      <div className="mb-2">
        <div className="text-[10px] text-[#4a6fa5] mb-1.5 tracking-wide">{t.tlDurationBar}</div>
        <div className="flex h-5 rounded overflow-hidden gap-[1px]">
          {sorted.slice(-30).map((ev, i) => {
            const color = STATUS_COLORS[ev.new_status] || '#4a5568'
            const nextEv = sorted[i + 1]
            const from = new Date(ev.created_at).getTime()
            const to = nextEv ? new Date(nextEv.created_at).getTime() : Date.now()
            const width = Math.max(3, Math.min(100 / sorted.length, 100))
            return (
              <div
                key={ev.id}
                title={`${ev.new_status}: ${fmtT(ev.created_at)}`}
                style={{ backgroundColor: color }}
                className="flex-1 opacity-80 hover:opacity-100 transition-opacity duration-200 min-w-[3px]"
              />
            )
          })}
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-[#4a5568]">
          <span>{t.tlOldest}</span>
          <span>{t.tlNewest}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-2">
        {['ONLINE', 'WARNING', 'CRITICAL', 'OFFLINE'].map(s => (
          <div key={s} className="flex items-center gap-1.25">
            <div style={{ backgroundColor: STATUS_COLORS[s] }} className="w-2.5 h-2.5 rounded-[2px]" />
            <span className="text-[10px] text-text-muted">{tStatus(s)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


const getDnsStatus = (status, resolved) => {
  if (resolved) {
    return '🟢 Terhubung ke IP'
  }
  if (status === 'OFFLINE') {
    return '❌ Gagal (Domain Tidak Terurai)'
  }
  return '🟢 Sukses (Normal)'
}

// classifyOfflineCause — SATU sumber kebenaran untuk menjelaskan penyebab OFFLINE
// secara presisi dari pesan error transport (l.http_error). Tanpa ini, semua narasi
// selalu menyebut "timeout" walau penyebab sebenarnya koneksi di-reset, ditolak, atau
// DNS gagal — mis. server yang memutus koneksi (EOF/reset) pada 2.9 detik bukanlah
// "batas waktu tunggu". Dipakai di label HTTP Code, narasi Response Time, deskripsi
// Status, dan kesimpulan OFFLINE agar semuanya konsisten dengan kenyataan.
const classifyOfflineCause = (httpError = '', dnsResolved = undefined) => {
  const e = String(httpError || '').toLowerCase()
  if (dnsResolved === false || e.includes('no such host') || e.includes('dns')) {
    return {
      kind: 'dns',
      codeLabel: '— (DNS Gagal)',
      timeLabel: () => 'Waktu respon tidak terukur karena domain gagal diterjemahkan ke alamat IP (DNS gagal) — koneksi tidak pernah terbentuk.',
      sentence: 'domainnya tidak bisa diterjemahkan ke alamat IP (DNS gagal)',
    }
  }
  if (e.includes('refused')) {
    return {
      kind: 'refused',
      codeLabel: '— (Connection Refused)',
      timeLabel: (t) => `Angka ${t} ms ini BUKAN kecepatan respon: koneksi DITOLAK server (port tertutup / layanan mati) setelah ${t} ms. Itulah sebabnya status OFFLINE.`,
      sentence: 'koneksi ditolak server (port tertutup atau layanan mati)',
    }
  }
  if (e.includes('reset') || e.includes('forcibly closed') || e.includes('wsarecv') || e.includes('eof')) {
    return {
      kind: 'reset',
      codeLabel: '— (Connection Reset)',
      timeLabel: (t) => `Angka ${t} ms ini BUKAN kecepatan respon: server/jaringan MEMUTUS koneksi secara paksa (reset) pada ${t} ms sebelum respon lengkap terkirim. Itulah sebabnya status OFFLINE.`,
      sentence: 'koneksi diputus paksa oleh server atau jaringan (reset) sebelum respon lengkap terkirim',
    }
  }
  if (e.includes('no route') || e.includes('unreachable')) {
    return {
      kind: 'unreachable',
      codeLabel: '— (Host Unreachable)',
      timeLabel: (t) => `Angka ${t} ms ini BUKAN kecepatan respon: server tidak dapat dijangkau dari jaringan (no route / unreachable).`,
      sentence: 'server tidak dapat dijangkau dari jaringan (tidak ada rute ke host)',
    }
  }
  if (e.includes('timeout') || e.includes('timed out') || e.includes('deadline')) {
    return {
      kind: 'timeout',
      codeLabel: '— (Request Time Out)',
      timeLabel: (t) => `Angka ${t} ms ini adalah BATAS WAKTU TUNGGU (timeout) — server tidak menjawab sampai waktu tunggu habis, jadi BUKAN kecepatan respon nyata. Itulah sebabnya status OFFLINE.`,
      sentence: 'server tidak menjawab sama sekali hingga batas waktu tunggu habis (timeout)',
    }
  }
  return {
    kind: 'generic',
    codeLabel: '— (Koneksi Gagal)',
    timeLabel: (t) => `Angka ${t} ms ini BUKAN kecepatan respon nyata — koneksi ke server gagal sebelum respon diterima. Itulah sebabnya status OFFLINE.`,
    sentence: 'server tidak menjawab atau koneksi gagal sebelum respon diterima',
  }
}

const getHttpCodeValue = (status, code, rootCause = '', botBlocked = false) => {
  const rc = String(rootCause || '').toUpperCase()
  if (rc.includes('BLOKIR') || rc.includes('POSITIF') || rc.includes('ISP') || rc.includes('ADUAN')) {
    return '— (Akses Diblokir / Koneksi Diintersepsi)'
  }
  if (status === 'OFFLINE') {
    return classifyOfflineCause(rootCause).codeLabel
  }
  if (!code) return classifyOfflineCause(rootCause).codeLabel
  if (botBlocked && (code === 403 || code === 429)) {
    return `${code} ${code === 429 ? 'Too Many Requests' : 'Forbidden'} (Proteksi Bot/WAF)`
  }
  if (code === 200) return '200 OK'
  if (code === 201) return '201 Created'
  if (code === 301) return '301 Moved Permanently'
  if (code === 302) return '302 Found'
  if (code === 400) return '400 Bad Request'
  if (code === 401) return '401 Unauthorized'
  if (code === 403) return '403 Forbidden'
  if (code === 404) return '404 Not Found'
  if (code === 500) return '500 Internal Server Error'
  if (code === 502) return '502 Bad Gateway'
  if (code === 503) return '503 Service Unavailable'
  if (code === 504) return '504 Gateway Timeout'
  return `${code}`
}

const getLatencyDesc = (ms) => {
  if (!ms) return 'Tidak Terdeteksi'
  if (ms < 300) return 'Sangat Cepat'
  if (ms < 1000) return 'Normal (Standar)'
  if (ms < 3000) return 'Lambat'
  return 'Sangat Lambat'
}

const getSslStatusText = (status, valid, expiryStr, rootCause = '') => {
  const rc = String(rootCause || '').toUpperCase()

  // 1. Deteksi Intersepsi atau Proksi Kantor (Priority)
  if (rc.includes('PROKSI') || rc.includes('PROXY') || rc.includes('INTERSEPSI') || rc.includes('UNTRUSTED') || rc.includes('DIINTERSEPSI') || rc.includes('DIINTIP')) {
    return '🟠 Peringatan (Keamanan Dipantau Jaringan / Proksi)'
  }

  // 2. Deteksi Mixed Content
  if (rc.includes('MIXED CONTENT')) {
    return '🟡 Peringatan (Mixed Content / Tidak Sepenuhnya Aman)'
  }

  // 3. Deteksi Redirect Loop
  if (rc.includes('REDIRECTS') || rc.includes('REDIRECT_LOOP')) {
    return '❌ Gagal (Too Many Redirects)'
  }

  if (rc.includes('BLOKIR') || rc.includes('POSITIF') || rc.includes('ISP') || rc.includes('ADUAN')) {
    return '❌ Gagal (Keamanan Diintersepsi ISP)'
  }
  if (status === 'OFFLINE') {
    return '— (Tidak Dapat Diperiksa)'
  }
  if (valid === false) {
    return '❌ Tidak Aktif (Kadaluarsa / Hostname Mismatch)'
  }
  if (!expiryStr) {
    return '— (Tidak Dicek / Non-HTTPS)'
  }

  try {
    const expiry = new Date(expiryStr)
    if (isNaN(expiry.getTime())) return '— (Tidak Dicek / Non-HTTPS)'

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expiry.setHours(0, 0, 0, 0)

    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const day = String(expiry.getDate()).padStart(2, '0')
    const month = String(expiry.getMonth() + 1).padStart(2, '0')
    const year = expiry.getFullYear()
    const formattedDate = `${day}/${month}/${year}`

    if (diffDays < 0) {
      return `❌ Tidak Aktif (Kadaluarsa pada ${formattedDate} — ${Math.abs(diffDays)} Hari yang Lalu)`
    } else if (diffDays === 0) {
      return `🟢 Aktif (Kadaluarsa Hari Ini — valid s.d ${formattedDate})`
    } else {
      return `🟢 Aktif (Valid s.d ${formattedDate} — ${diffDays} Hari Lagi)`
    }
  } catch (err) {
    return valid ? '🟢 Aktif (Sertifikat Valid)' : '— (Tidak Dicek / Non-HTTPS)'
  }
}


const isPrivateIP = (ip) => {
  if (!ip) return false
  // 192.168.x.x
  if (/^192\.168\./.test(ip)) return true
  // 10.x.x.x
  if (/^10\./.test(ip)) return true
  // 172.16-31.x.x
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip)) return true
  // 127.x.x.x (loopback)
  if (/^127\./.test(ip)) return true
  return false
}

function AnalisisKondisi({ website, sysHealth }) {
  return null
}

// ── Evidence Collection Viewer ───────────────────────────────────────

function EvidenceViewer({ website }) {
  return null
}


// ── Root Cause Section ────────────────────────────────────────

function RootCauseSection({ website }) {
  return null
}

// ── Main Modal ────────────────────────────────────────────────

export default function ServiceDetailModal({ website, onClose }) {
  const { t, tStatus, lang } = useTheme()
  const mdLocale = LOCALE_MAP[lang] || 'en-US'
  const [tab, setTab] = useState('overview')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [sla, setSla] = useState(null)
  const [slaLoading, setSlaLoading] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [chartMounted, setChartMounted] = useState(false)

  useEffect(() => {
    setChartMounted(true)
  }, [])

  const latestLog = logs[0]
  const rootCauseStr = latestLog?.root_cause || website.root_cause
  let ev = null
  try { ev = JSON.parse(rootCauseStr || '') } catch (_) {}

  const fetchLogs = useCallback(async (silent = false) => {
    if (!website?.id) return
    const controller = new AbortController()
    if (!silent) setLoading(true)
    try {
      const r = await websiteAPI.getLogs(website.id, 100, { signal: controller.signal })
      setLogs(r.data || [])
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'CanceledError') setLogs([])
    } finally {
      if (!silent) setLoading(false)
    }
    return () => controller.abort()
  }, [website?.id])

  const fetchSLA = useCallback(async () => {
    if (!website?.id) return
    setSlaLoading(true)
    try {
      const r = await websiteAPI.getSLA(website.id)
      setSla(r.data)
    } catch (err) {
      console.error("Failed to fetch SLA data:", err)
    } finally {
      setSlaLoading(false)
    }
  }, [website?.id])

  useEffect(() => {
    fetchLogs()
    fetchSLA()
  }, [fetchLogs, fetchSLA])

  // WebSocket Sync for Logs
  useGlobalWebSocket(useCallback((msg) => {
    if ((msg.type === 'monitor_update' || msg.type === 'status_change') && msg.payload.website_id === website?.id) {
      fetchLogs(true) // Silent update
      fetchSLA()
    }
  }, [website?.id, fetchLogs, fetchSLA]))

  if (!website) return null

  const fmt = (ms) => {
    if (ms === null || ms === undefined) return '—'
    if (ms === 0) return '< 1ms'
    return `${ms}ms`
  }
  const fmtTime = (d) => d ? new Date(d).toLocaleString(mdLocale, { hour12: false }) : '—'

  const { avgRT, maxRT, minRT, uptime, alerts, perfData, upLogsCount } = useMemo(() => {
    const rtSeries = logs.filter(l => l.response_time_ms != null).map(l => l.response_time_ms)
    const avg = rtSeries.length ? Math.round(rtSeries.reduce((a, b) => a + b, 0) / rtSeries.length) : null
    const max = rtSeries.length ? Math.max(...rtSeries) : null
    const min = rtSeries.length ? Math.min(...rtSeries) : null
    const upLogs = logs.filter(l => l.status === 'ONLINE')
    const ut = logs.length > 0 ? ((upLogs.length / logs.length) * 100).toFixed(2) : '—'
    const al = logs.filter(l => l.status === 'OFFLINE' || l.status === 'CRITICAL')

    const pd = [...logs].reverse().slice(-60).map((l, i) => ({
      i,
      rt: l.response_time_ms,
      status: l.status,
      time: fmtTime(l.checked_at),
    }))

    return { avgRT: avg, maxRT: max, minRT: min, uptime: ut, alerts: al, perfData: pd, upLogsCount: upLogs.length }
  }, [logs])

  const domain = getDomain(website.url)
  const shouldSkip = shouldSkipFavicon(website.url)

  const faviconUrl = shouldSkip ? null : `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  const initial = (website.name || 'W')[0].toUpperCase()

  const TABS = [
    { key: 'OVERVIEW', label: t.tabOverview },
    { key: 'PERFORMANCE', label: t.tabPerformance },
    { key: 'TIMELINE', label: t.tabTimeline },
    { key: 'HISTORY', label: t.tabHistory },
  ]

  return (
    <div className="fixed inset-0 z-[9998] bg-[rgba(30,41,59,0.45)] flex items-center justify-center backdrop-blur-[2px]" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-[min(800px,95%)] h-[min(720px,85vh)] bg-bg-header border border-border rounded-2xl flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.15)] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between py-3.5 px-4.5 border-b border-border bg-bg-header shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent-light border border-border rounded-lg flex items-center justify-center overflow-hidden shrink-0">
              {faviconUrl ? (
                <img src={faviconUrl} width={24} height={24} alt=""
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
              ) : null}
              <div style={{ display: shouldSkip ? 'flex' : 'none' }} className="w-9 h-9 items-center justify-center text-[16px] font-bold text-[#3b82f6]">{initial}</div>
            </div>
            <div>
              <div className="text-[16px] font-extrabold text-text">{website.name}</div>
              <a href={website.url} target="_blank" rel="noopener noreferrer"
                className="text-[11px] mt-0.5 text-accent cursor-pointer block hover:underline no-underline"
              >
                {website.url} ↗
              </a>
            </div>
            <StatusBadge status={website.status} />
          </div>
          <button className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#ef4444] rounded-md py-1.5 px-2.5 cursor-pointer text-[12px]" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="flex bg-bg-header border-b border-border shrink-0">
          {TABS.map(tb => {
            const isActive = tab === tb.key.toLowerCase()
            return (
              <button
                key={tb.key}
                className={`flex-1 bg-transparent border-none text-text-muted text-[10px] font-bold tracking-widest py-2.5 px-1 cursor-pointer border-b-2 border-transparent transition-all duration-150 ${
                  isActive ? 'text-[#2563eb] border-[#2563eb] bg-[rgba(59,130,246,0.06)]' : ''
                }`}
                onClick={() => setTab(tb.key.toLowerCase())}
              >
                {tb.label}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overflow-x-auto [webkit-overflow-scrolling:touch] py-4 px-4.5">

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (() => {
            const ipClass = ev?.ip_classification
            const ipColor = ipClass === 'PRIVATE' ? '#f59e0b' : ipClass === 'PUBLIC' ? '#10b981' : 'var(--text-muted)'
            const sslOk = ev?.tls_handshake_ok
            const sslColor = sslOk === false ? '#ef4444' : sslOk ? '#10b981' : 'var(--text-muted)'
            const code = ev?.http_status_code
            const codeColor = !code ? 'var(--text-muted)' : code >= 500 ? '#ef4444' : code >= 400 ? '#f59e0b' : '#10b981'
            // Bot-block: a 403/429 from a site behind a WAF/CDN = our monitor
            // fingerprinted as a bot, NOT a genuine application 4xx.
            const wafName = (ev?.waf_detected && ev.waf_detected !== 'Not Detected')
              ? ev.waf_detected
              : (ev?.is_cdn ? (ev?.cdn_provider || '') : '')
            const botBlocked = ev?.investigation_report?.bot_blocked === true
              || ((code === 403 || code === 429) && !!wafName)
            const rt = ev?.response_time_ms ?? website.response_time_ms
            // Pakai ?? (bukan ||) agar DNS lookup 0 ms (cache) tidak dianggap "tidak ada".
            const dnsLat = ev?.dns_latency_ms ?? latestLog?.dns_latency_ms
            // Permintaan gagal / timeout: server tidak menjawab sama sekali, jadi angka rt
            // yang muncul (mis. 30000–40000 ms) adalah BATAS WAKTU TUNGGU (timeout) — bukan
            // kecepatan respon nyata. Jangan diberi warna/label "lambat" seakan masih hidup.
            const reqFailed = !!ev?.http_error || (!code && (latestLog?.status || website.status) === 'OFFLINE')
            const rtColor = (reqFailed || !rt) ? 'var(--text-muted)' : rt > 4000 ? '#ef4444' : rt > 2500 ? '#f59e0b' : '#10b981'
            // Debounce hold: backend menahan status lama sambil mengonfirmasi perubahan
            // (final_decision_source berakhiran _DEBOUNCE_PENDING). Narasi harus jujur soal
            // ini — bukan menghitung "lambat/dll" dari telemetri yang belum dikonfirmasi.
            const isDebouncePending = String(latestLog?.final_decision_source || '').includes('DEBOUNCE_PENDING')
            const indikasiPending = code ? `HTTP ${code}` : 'gangguan koneksi'

            const fmtTimeOnly = (d) => {
              if (!d) return '—'
              try {
                return new Date(d).toLocaleTimeString('id-ID', { hour12: false })
              } catch {
                return '—'
              }
            }

            const fmtDateLong = (dateStr) => {
              if (!dateStr) return '—'
              try {
                const d = new Date(dateStr)
                if (isNaN(d.getTime())) return '—'
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                const day = String(d.getDate()).padStart(2, '0')
                const month = months[d.getMonth()]
                const year = d.getFullYear()
                return `${day} ${month} ${year}`
              } catch {
                return '—'
              }
            }

            const getRemainingDays = (dateStr) => {
              if (!dateStr) return '—'
              try {
                const expiry = new Date(dateStr)
                if (isNaN(expiry.getTime())) return '—'
                const today = new Date()
                today.setHours(0,0,0,0)
                expiry.setHours(0,0,0,0)
                const diff = expiry - today
                const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
                return days > 0 ? `${days} ${t.valDays}` : (days === 0 ? t.valToday : t.valExpired)
              } catch {
                return '—'
              }
            }

            const CardBox = ({ title, children }) => (
              <div className="bg-bg-main border border-border rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-col">
                <div className="bg-[rgba(30,41,59,0.02)] border-b border-border py-2 px-3.5 text-[10px] font-black text-text-strong tracking-widest uppercase">
                  {title}
                </div>
                <div className="py-2.5 px-3.5 flex flex-col gap-1.5">
                  {children}
                </div>
              </div>
            )

            const CardRow = ({ label, value, valueColor, desc }) => (
              <div className="py-1.5 px-0 border-b border-border flex flex-col gap-0.75">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-text-strong text-[11px] tracking-normal font-semibold">{label}</span>
                  <span style={{ color: valueColor || 'var(--text-strong)' }} className="font-bold text-right text-[12px]">{value ?? '—'}</span>
                </div>
                {desc && (
                  <div className="text-[10.5px] text-text-strong leading-normal bg-accent-light py-1.25 px-2.25 rounded-[5px] border-l-2 border-accent mt-0.75 text-left">
                    {desc}
                  </div>
                )}
              </div>
            )

            const status = latestLog?.status || website.status || 'UNKNOWN';
            const isOnline = status === 'ONLINE';
            const isWarn = status === 'WARNING';
            const isCrit = status === 'CRITICAL';

            const boxColor = isOnline
              ? '#10b981'
              : isWarn
                ? '#f59e0b'
                : isCrit
                  ? '#ef4444'
                  : '#dc2626';

            // Derive translucent bg/border from the chosen status color.
            const boxBg = boxColor + '0d';     // ~5% alpha
            const boxBorder = boxColor + '26'; // ~15% alpha

            let statusText = 'ONLINE (Normal)';
            if (isWarn) statusText = 'WARNING (Perlu Perhatian)';
            else if (isCrit) statusText = 'CRITICAL (Bermasalah)';
            else if (status === 'OFFLINE') statusText = 'OFFLINE (Terputus)';

            // ── Kesadaran IP internal / intranet ───────────────────────
            // Sebagian target di-resolve ke alamat IP privat (RFC1918, mis.
            // 192.168.x.x): aplikasi internal/intranet yang hanya bisa diakses
            // dari dalam jaringan yang sama. Bila server monitoring berada di
            // jaringan berbeda, koneksi gagal → probe melaporkan OFFLINE
            // padahal situsnya normal bagi pengguna di jaringan yang benar.
            // Deteksi kondisi ini agar dijelaskan apa adanya, bukan menuduh
            // situsnya rusak ("SSL rusak", "server crash").
            const ipAddr = ev?.ip_address || website.ip_address
            const isInternalIP = isPrivateIP(ipAddr) || ev?.ip_classification === 'PRIVATE'
            // "Tak terjangkau" = mengarah ke IP privat tetapi monitor tidak bisa
            // benar-benar terhubung (tidak ada kode HTTP / timeout / ditolak).
            const internalUnreachable = isInternalIP && status !== 'ONLINE' && !code

            const getStatusDesc = (status) => {
              if (isDebouncePending) return `Status ${statusText} dipertahankan sementara — pemeriksaan terakhir menemukan indikasi perubahan (${indikasiPending}), dan sistem sedang mengonfirmasi beberapa kali sebelum mengubah status (mekanisme anti-flapping agar gangguan sesaat tidak langsung mengubah status).`
              if (internalUnreachable) return 'Website ini mengarah ke jaringan internal (intranet) atau alamat URL yang dimasukkan salah (typo), sehingga tidak dapat dijangkau dari lokasi server monitoring.'
              if (status === 'ONLINE') return 'Website berjalan normal dan dapat diakses publik dengan lancar.'
              if (code >= 300 && code < 400) return 'Website ini dialihkan (redirect). Kemungkinan alamat URL/domain yang Anda masukkan salah atau mengalami typo.'
              if (status === 'WARNING') {
                if (code >= 400 && code < 500) {
                  return `Website masih dapat diakses, namun mengembalikan kode status ${code} (client error).`
                }
                if (rt > 2500) {
                  return `Website masih dapat diakses, namun responnya lambat (${rt} ms).`
                }
                return 'Website masih dapat diakses, namun ada indikator yang kurang optimal.'
              }
              if (status === 'CRITICAL') {
                if (code >= 500) {
                  return `Server mengembalikan error status ${code} (gangguan di sisi aplikasi/server).`
                }
                // CRITICAL hanya dari kode HTTP (5xx / 403), bukan dari lambat —
                // backend tidak pernah menaikkan kelambatan ke CRITICAL.
                return 'Server mengembalikan error status atau mengalami gangguan berat.'
              }
              if (status === 'OFFLINE') return `Website terputus: ${classifyOfflineCause(ev?.http_error, ev?.dns_resolved).sentence}.`
              return 'Kondisi operasional website belum dapat ditentukan.'
            }

            // Narasi lengkap kondisi website. PENTING: setiap baris detail di
            // sini memakai fungsi penjelasan yang SAMA PERSIS dengan yang dipakai
            // di kartu masing-masing parameter (getStatusDesc, getDnsDesc,
            // getPingDesc, getHttpDesc, getResponseTimeDesc, getSslDesc). Dengan
            // begitu penjelasan di atas dan di bawah parameter dijamin sejalan /
            // tidak berbeda-beda. Tidak ada logika penentuan status yang diubah.
            const getKondisiNarasi = () => {
              const nama = website?.name || 'Website ini'
              const st = latestLog?.status || website.status
              const dnsVal = ev?.dns_resolved
              const pingStatus = latestLog?.icmp_status ?? ev?.icmp_status
              const pingLat = latestLog?.icmp_latency_ms ?? ev?.icmp_latency_ms
              const tcpLat = ev?.tcp_latency_ms
              const sslVal = ev?.tls_handshake_ok

              const garis = '──────────────────────────────'

              // Kalimat pembuka = ringkasan status keseluruhan (teks status sama
              // persis dengan kartu "Status").
              const pembuka = `${nama} saat ini berstatus ${statusText}. ${getStatusDesc(st)}`

              // Rincian per parameter — teks diambil dari fungsi yang sama dengan
              // yang tampil di bawah tiap parameter, jadi pasti konsisten.
              const detail = [
                `• Domain (DNS): ${getDnsDesc(dnsVal)}`,
                `• Ping ke server: ${getPingDesc(pingStatus, pingLat, tcpLat)}`,
                `• Respon server (HTTP): ${getHttpDesc(code, ev?.http_error, nama)}`,
                `• Kecepatan respon: ${getResponseTimeDesc(rt)}`,
                `• Keamanan (SSL): ${getSslDesc(sslVal)}`,
              ]

              // Penutup naratif sesuai status.
              let penutup
              if (isDebouncePending) {
                penutup = `Kesimpulannya, status ${nama} untuk sementara ditahan di ${statusText} karena sistem mendeteksi indikasi perubahan (${indikasiPending}) namun belum mengonfirmasinya beberapa kali berturut-turut. Status akan otomatis diperbarui begitu hasil pemeriksaan konsisten — ini mencegah status berubah hanya karena gangguan sesaat.`
              } else if (isOnline) {
                penutup = `Kesimpulannya, semua indikator dalam kondisi normal sehingga ${nama} dapat diakses pengunjung dengan lancar. Tidak ada tindakan yang perlu dilakukan.`
              } else if (internalUnreachable) {
                penutup = `Kesimpulannya, ${nama} mengarah ke alamat IP internal (${ipAddr}). Hal ini bisa disebabkan karena alamat URL/domain yang Anda masukkan salah (typo), atau website ini berada di jaringan privat/intranet yang tidak dapat dijangkau dari lokasi server monitoring saat ini. Periksa kembali ejaan URL Anda. Jika URL sudah benar, pastikan server monitoring terhubung ke jaringan internal yang sama atau menggunakan VPN agar dapat memantau dengan akurat.`
              } else if (isCrit) {
                penutup = `Kesimpulannya, server dapat dihubungi namun aplikasi di dalamnya mengembalikan error, sehingga halaman gagal ditampilkan dengan benar. Masalah berada di sisi server/aplikasi dan perlu ditangani oleh tim teknis pemilik website.`
              } else if (st === 'OFFLINE') {
                const cause = classifyOfflineCause(ev?.http_error, dnsVal)
                penutup = cause.kind === 'dns'
                  ? `Kesimpulannya, ${nama} terputus karena ${cause.sentence}. Pastikan domain masih aktif dan konfigurasi DNS benar.`
                  : `Kesimpulannya, ${nama} terputus karena ${cause.sentence}. Pastikan server dalam keadaan menyala dan jaringannya normal.`
              } else if (isWarn) {
                let alasan = 'ada indikator yang kurang optimal'
                if (code >= 400 && code < 500) {
                  alasan = `mengembalikan kode status ${code} (client error)`
                } else if (rt > 2500) {
                  alasan = `respon lambat (${rt} ms)`
                }
                penutup = `Kesimpulannya, ${nama} masih dapat diakses namun ${alasan}. Sebaiknya dipantau agar gangguannya tidak bertambah parah.`
              } else {
                penutup = `Sistem masih mengumpulkan data pemeriksaan untuk ${nama}. Mohon tunggu sejenak hingga pengecekan pertama selesai.`
              }

              return {
                pembuka,
                detail,
                penutup
              }
            }


            const getHttpDesc = (code, error, websiteName) => {
              const w = websiteName || 'Website ini'
              if (error) return `Koneksi gagal dilakukan: ${error}.`
              if (!code) return 'Tidak menerima respon HTTP dari server (koneksi ditolak atau RTO).'
              if (botBlocked && (code === 403 || code === 429)) {
                return `HTTP ${code}: Akses bot kami diblokir oleh ${wafName || 'sistem keamanan (WAF/CDN)'} milik ${w}. Bukan gangguan situs — untuk pengunjung biasa kemungkinan tetap normal.`
              }
              if (code >= 100 && code < 200) return `HTTP ${code}: Informasi sementara dari server ${w}. Proses permintaan masih berlangsung — ini normal dan biasanya tidak terlihat oleh pengguna biasa.`
              if (code === 200) return `HTTP 200: ${w} merespons dengan sukses. Semua berjalan lancar — halaman berhasil dimuat seperti yang diharapkan.`
              if (code === 201) return `HTTP 201: ${w} berhasil membuat data baru. Permintaan sukses diproses.`
              if (code === 204) return `HTTP 204: ${w} berhasil menerima permintaan, tapi tidak ada konten yang perlu dikirimkan kembali. Ini normal untuk beberapa jenis permintaan.`
              if (code === 301) return `HTTP 301: ${w} sudah pindah alamat secara permanen. Website ini telah bermigrasi ke URL baru — pengguna dan mesin pencari otomatis akan diarahkan ke alamat yang baru.`
              if (code === 302) return `HTTP 302: ${w} untuk sementara waktu dialihkan ke halaman lain. Ini biasanya bersifat sementara, mungkin karena pemeliharaan atau pengalihan musiman.`
              if (code === 304) return `HTTP 304: Konten ${w} tidak berubah sejak terakhir dikunjungi. Server menghemat bandwidth dengan menyuruh kita pakai data yang sudah tersimpan.`
              if (code === 307) return `HTTP 307: ${w} mengalihkan permintaan ke alamat lain, tapi metode permintaannya tetap sama. Ini pengalihan sementara.`
              if (code === 308) return `HTTP 308: ${w} sudah pindah permanen ke alamat baru — sama seperti 301, tapi metode permintaan dipertahankan.`
              if (code >= 300 && code < 400) return `HTTP ${code}: ${w} mengalihkan (redirect) ke halaman lain. Biasanya ini terjadi kalau website pindah alamat atau sedang mengarahkan pengguna ke versi terbaru halaman.`
              if (code === 400) return `HTTP 400: ${w} menolak permintaan dari alat pemantau kami (Bad Request). Ini bisa terjadi karena pemblokiran bot/otomasi oleh server atau kesalahan format permintaan.`
              if (code === 401) return `HTTP 401: ${w} seperti pintu rumah yang terkunci dan kamu tidak punya kuncinya. Server bilang: 'Kamu harus login dulu, kasih tau siapa kamu, baru saya kasih lihat isinya.' Ini wajar untuk website yang punya halaman khusus anggota atau admin — artinya website hidup, cuma perlu password dulu.`
              if (code === 403) return `HTTP 403: ${w} menolak akses (Forbidden). Server mengenali permintaan tapi memblokirnya — biasanya karena hak akses atau konfigurasi rute yang dibatasi.`
              if (code === 404) return `HTTP 404: ${w} seperti kamu datang ke alamat rumah seseorang, tapi rumahnya tidak ada di sana — mungkin sudah pindah atau alamatnya salah. Server bilang: 'Maaf, halaman yang kamu cari tidak ada di sini.' Bisa karena URL-nya salah, halaman sudah dihapus, atau website belum selesai dibangun.`
              if (code === 405) return `HTTP 405: ${w} tidak mengizinkan metode permintaan yang kita gunakan. Seperti kamu mau masuk pintu tapi kamu malah coba lewat jendela — cara minta aksesnya tidak sesuai dengan yang server harapkan.`
              if (code === 408) return `HTTP 408: ${w} kehabisan waktu menunggu permintaan dari kita. Koneksi terlalu lambat atau terputus di tengah jalan — server sudah capek nunggu.`
              if (code === 409) return `HTTP 409: ${w} mendeteksi adanya konflik — seperti kamu mau menyimpan data yang sama dua kali, atau ada bentrokan antara data baru dan lama di server.`
              if (code === 410) return `HTTP 410: ${w} dulunya punya halaman ini, tapi sekarang sudah hilang dan tidak akan kembali. Beda dengan 404 yang 'tidak ditemukan', 410 ini 'sudah dihapus permanen'.`
              if (code === 429) return `HTTP 429: ${w} seperti kamu pencet tombol bel rumah terlalu keras dan terlalu cepat — penghuni rumahnya bilang: 'Woy sabar dikit, jangan ngebell terus!' Server merasa kita minta akses terlalu banyak dalam waktu singkat, jadi dia minta kita jeda dulu. Biasanya sementara, setelah beberapa saat bisa akses lagi.`
              if (code >= 400 && code < 500) return `HTTP ${code}: ${w} menolak permintaan — ada yang salah dari sisi pengirim. Ini bukan berarti server mati, tapi server menolak permintaan kita karena suatu alasan. Bisa karena akses diblokir, halaman tidak ditemukan, atau metode permintaan yang tidak sesuai.`
              if (code === 500) return `HTTP 500: ${w} aplikasi-nya lagi error dari dalam — seperti mesin yang tiba-tiba mati karena ada komponen yang rusak. Bukan masalah koneksi atau jaringan, tapi perangkat lunak server-nya sendiri yang sedang bermasalah. Butuh dicek dan diperbaiki oleh tim teknis.`
              if (code === 502) return `HTTP 502: ${w} seperti kamu menelepon seseorang, tapi yang angkat telepon bukan dia, malah orang lain yang juga bingung dan bilang: 'Maaf, yang kamu cari sedang tidak bisa dihubungi.' Server kita minta data ke server lain, tapi server lain itu tidak memberikan jawaban yang benar.`
              if (code === 503) return `HTTP 503: ${w} seperti toko yang tutup sementara karena lagi sibuk atau lagi bersih-bersih. Servernya bilang: 'Hari ini lagi sibuk banget, coba lagi nanti ya.' Bisa karena website lagi maintenance, atau memang lagi kebanjiran pengunjung. Biasanya sementara dan akan normal lagi.`
              if (code === 504) return `HTTP 504: ${w} seperti kamu nungguin temen yang janjian tapi tidak kunjung datang — setelah menunggu lama, kamu akhirnya pergi. Server kita sudah menunggu jawaban dari server lain tapi tidak kunjung dapat, akhirnya waktu habis dan kita anggap gagal.`
              if (code >= 500 && code < 600) return `HTTP ${code}: ${w} mengalami kendala atau error dari dalam server. Ada komponen yang rusak atau crash di sisi server — perlu ditangani tim teknis.`
              return `HTTP ${code}: Server ${w} merespons dengan kode status ini.`
            }

            const getResponseTimeDesc = (time) => {
              if (internalUnreachable) return `Angka ini (${time || 0} ms) adalah batas waktu tunggu (timeout) — server internal tidak menjawab dari lokasi monitoring, bukan berarti servernya lambat.`
              // Permintaan gagal: angka yang muncul BUKAN kecepatan respon nyata. Penyebab
              // persisnya (timeout / reset / ditolak / DNS) ditentukan dari pesan error asli
              // lewat classifyOfflineCause, bukan diasumsikan selalu "timeout".
              if (reqFailed) {
                const cause = classifyOfflineCause(ev?.http_error, ev?.dns_resolved)
                if (time && time >= 1000) return cause.timeLabel(time)
                return cause.kind === 'dns'
                  ? 'Waktu respon tidak terukur karena domain gagal diterjemahkan ke alamat IP (DNS gagal).'
                  : 'Waktu respon tidak terukur karena server gagal merespons (koneksi gagal sebelum respon diterima).'
              }
              if (!time) return 'Waktu respon tidak terukur karena koneksi ke server gagal.'
              // CATATAN: deskripsi ini menilai KECEPATAN saja, bukan status keseluruhan.
              // Status akhir bisa CRITICAL/WARNING karena kode HTTP (mis. 500) walau
              // responnya cepat — jadi jangan klaim "status ONLINE" di sini.
              if (time < 300) return `Respon sangat cepat (${time} ms). Kecepatan server prima.`
              if (time <= 1000) return `Respon normal (${time} ms). Kecepatan muat memenuhi standar.`
              if (time <= 2500) return `Respon baik (${time} ms). Di bawah ambang 2,5 detik — dari sisi kecepatan tergolong sehat.`
              if (time <= 4000) return `Respon lambat (${time} ms). Di atas ambang 2,5 detik — dari sisi kecepatan tergolong WARNING (degraded).`
              return `Respon sangat lambat (${time} ms). Di atas 4 detik — kecepatan sangat di bawah standar (situs masih menjawab, jadi bukan OFFLINE).`
            }

            const getTtfbDesc = (time) => {
              if (!time) return 'TTFB tidak terukur karena server gagal merespons.'
              return `TTFB (${time} ms) adalah kecepatan server memproses instruksi awal halaman sebelum mengirim data.`
            }

            const getPingDesc = (status, latency, tcpLat) => {
              if (internalUnreachable && status === false) return 'Ping gagal — server internal (intranet) tidak menjawab dari jaringan tempat monitoring berjalan saat ini.'
              if (status === false) return 'Ping gagal (Request Time Out). Protokol ICMP diblokir firewall server/hosting.'
              const latVal = latency || tcpLat
              if (!latVal) return 'Ping tidak terukur.'
              return `Ping sukses (${latVal} ms). Sinyal jaringan dasar ke server terhubung dengan baik.`
            }

            const getDnsDesc = (resolved) => {
              if (resolved) return 'Penerjemahan nama domain ke alamat IP angka server berhasil.'
              return 'Gagal menerjemahkan domain. Konfigurasi DNS bermasalah atau domain mati.'
            }

            const getDnsTimeDesc = (time) => {
              // 0 ms = resolusi instan dari cache DNS (BUKAN gagal). Bedakan dari
              // null/undefined yang berarti memang tidak terukur.
              if (time == null) return 'DNS Lookup tidak terukur.'
              if (time === 0) return 'Domain diterjemahkan ke alamat IP secara instan (dari cache DNS).'
              return `Nama domain diterjemahkan ke alamat IP dalam waktu ${time} ms. Makin cepat makin baik.`
            }

            const getIpDesc = (ip) => {
              if (!ip) return 'IP Address tidak ditemukan.'
              const isV6 = ip.includes(':')
              return `Alamat IP server: ${ip} (${isV6 ? 'menggunakan IPv6 terbaru' : 'menggunakan IPv4 biasa'}).`
            }

            const getSslDesc = (valid) => {
              if (internalUnreachable) return 'SSL tidak dapat diperiksa karena koneksi ke server tidak tercapai dari lokasi monitoring — ini bukan berarti sertifikatnya rusak.'
              if (valid) return 'Sertifikat SSL valid. Jalur data aman & terenkripsi (melindungi informasi sensitif).'
              if (valid === false) return 'SSL tidak valid/rusak. Browser pengguna akan menampilkan peringatan bahaya.'
              return 'Website menggunakan HTTP biasa (tidak aman, rentan penyadapan).'
            }

            const getExpiryDesc = (dateStr) => {
              if (!dateStr) return 'Masa aktif sertifikat tidak terdeteksi.'
              return `Sertifikat SSL website ini berlaku secara legal hingga tanggal ${fmtDateLong(dateStr)}.`
            }

            const getRemainingDesc = (dateStr) => {
              const days = getRemainingDays(dateStr)
              if (days === '—') return 'Tidak terdeteksi.'
              if (days === 'Expired') return 'Sertifikat SSL sudah kedaluwarsa! Harap segera diperbarui.'
              if (days === 'Today') return 'Sertifikat SSL kedaluwarsa hari ini! Perbarui segera.'
              return `Sertifikat SSL aman untuk ${days} berikutnya sebelum masa berlaku habis.`
            }

            const getServerDesc = (server) => {
              if (!server || server === 'Unknown') return 'Jenis perangkat lunak server tidak diumumkan ke publik (untuk keamanan).'
              return `Website dilayani oleh aplikasi web server ${server}.`
            }

            const narasi = getKondisiNarasi()

            return (
              <div>
                {/* 1. KONDISI WEBSITE */}
                <div style={{
                  backgroundColor: boxBg,
                  borderColor: boxBorder,
                }} className="mb-5 py-4 px-5 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.02)] border">
                  <div className="flex justify-between items-center mb-2.5">
                    <div style={{ color: boxColor }} className="text-[11px] font-black tracking-widest uppercase">
                      📋 {t.conditionWebsite}
                    </div>
                    <span style={{ 
                      color: boxColor, 
                      backgroundColor: `${boxColor}15`, 
                      borderColor: `${boxColor}33`, 
                    }} className="text-[10px] font-extrabold border py-[2px] px-2 rounded tracking-wide uppercase">
                      {statusText}
                    </span>
                  </div>
                  <div style={{ 
                    color: boxColor, 
                  }} className="text-[16px] font-extrabold leading-normal whitespace-pre-wrap mb-2">
                    {(() => {
                      if (code >= 300 && code < 400) {
                        return 'Periksa kembali alamat URL/domain yang dimasukkan (kemungkinan typo atau dialihkan).'
                      }
                      if (ev?.dns_resolved === false || (latestLog && latestLog.dns_resolved === false)) {
                        return 'Nama domain tidak ditemukan. Periksa kembali ejaan URL/domain (kemungkinan typo atau domain kedaluwarsa).'
                      }
                      return latestLog?.recommendation || website.recommendation || 'Halo! Sistem sedang menyiapkan penjelasan kondisi website Anda. Mohon tunggu sejenak.'
                    })()}
                  </div>

                  {/* Penjelasan "mengapa" status seperti ini + analogi toko (untuk awam) */}
                  <div style={{
                    borderTopColor: boxBorder,
                  }} className="mt-3.5 pt-3.5 border-t border-dashed flex flex-col gap-3">
                    {/* Pembuka - diperbesar dan dibold */}
                    <div className="text-[15px] font-extrabold text-text-strong leading-relaxed">
                      {narasi.pembuka}
                    </div>

                    <div className="text-[12.5px] font-semibold text-text-strong leading-relaxed flex flex-col gap-1">
                      <div className="text-[11px] font-black text-text-strong tracking-wide uppercase mb-0.5">
                        Rincian hasil pemeriksaan:
                      </div>
                      {narasi.detail.map((d, i) => (
                        <div key={i}>{d}</div>
                      ))}
                    </div>

                    <div className="text-[12.5px] font-semibold text-text-strong leading-relaxed">
                      {narasi.penutup}
                    </div>
                  </div>

                  {/* Catatan jaringan internal / intranet (IP privat RFC1918) */}
                  {isInternalIP ? (
                    <div className="mt-3 py-2.5 px-3.5 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] rounded-lg text-[12px] text-[#f59e0b] leading-relaxed font-semibold">
                      🏢 <strong>Jaringan Internal:</strong> Domain ini diterjemahkan ke alamat IP privat <strong>{ipAddr}</strong> (jaringan lokal/intranet). Situs seperti ini hanya bisa diakses dari dalam jaringan yang sama.{' '}
                      {internalUnreachable
                        ? 'Periksa kembali ejaan URL (kemungkinan typo). Jika URL sudah benar, ini menunjukkan website berada di jaringan internal yang tidak dapat dijangkau dari lokasi server monitoring saat ini. Untuk hasil akurat, pantau dari jaringan yang sama atau gunakan VPN.'
                        : 'Status di sini mencerminkan jangkauan dari lokasi server monitoring.'}
                    </div>
                  ) : null}
                </div>

                {/* 3. FOUR CARDS (Service Health Overview, Connectivity, Security, Infrastructure) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <CardBox title={t.cardServiceHealth}>
                    <CardRow label={t.rowStatus} value={statusText} valueColor={boxColor} desc={getStatusDesc(latestLog?.status || website.status)} />
                    <CardRow label={t.rowHttpCode} value={getHttpCodeValue(latestLog?.status || website.status, code, ev?.http_error, botBlocked)} valueColor={codeColor} desc={getHttpDesc(code, ev?.http_error, website?.name)} />
                    <CardRow label={t.rowResponseTime} value={rt ? `${rt} ms` : '—'} valueColor={rtColor} desc={getResponseTimeDesc(rt)} />
                    <CardRow label={t.rowTtfb} value={ev?.ttfb_ms ? `${ev.ttfb_ms} ms` : (latestLog?.ttfb_latency_ms ? `${latestLog.ttfb_latency_ms} ms` : '—')} desc={getTtfbDesc(ev?.ttfb_ms || latestLog?.ttfb_latency_ms)} />
                    <CardRow label={t.rowLastCheck} value={fmtTimeOnly(latestLog?.checked_at || website.last_checked)} desc={fmtTimeOnly(latestLog?.checked_at || website.last_checked) !== '—' ? 'Waktu terakhir sistem memvalidasi keadaan website ini.' : 'Pengecekan belum dilakukan.'} />
                  </CardBox>

                  <CardBox title={t.cardConnectivity}>
                    <CardRow
                      label={t.rowIcmpPing}
                      value={latestLog?.icmp_status === false ? t.valFailed : (latestLog?.icmp_latency_ms ? `${latestLog.icmp_latency_ms} ms` : (ev?.icmp_latency_ms ? `${ev.icmp_latency_ms} ms` : '—'))}
                      valueColor={latestLog?.icmp_status === false ? '#ef4444' : '#10b981'}
                      desc={getPingDesc(latestLog?.icmp_status ?? ev?.icmp_status, latestLog?.icmp_latency_ms ?? ev?.icmp_latency_ms, ev?.tcp_latency_ms)}
                    />
                    <CardRow label={t.rowDnsStatus} value={ev?.dns_resolved ? t.valResolved : t.valFailed} valueColor={ev?.dns_resolved ? '#10b981' : '#ef4444'} desc={getDnsDesc(ev?.dns_resolved)} />
                    <CardRow label={t.rowDnsLookup} value={dnsLat == null ? '—' : dnsLat === 0 ? '< 1 ms' : `${dnsLat} ms`} desc={getDnsTimeDesc(dnsLat)} />
                    <CardRow label={t.rowIpAddress} value={ev?.ip_address || website.ip_address || '—'} desc={getIpDesc(ev?.ip_address || website.ip_address)} />
                  </CardBox>

                  <CardBox title={t.cardSecurity}>
                    <CardRow label={t.rowSslStatus} value={internalUnreachable ? '—' : (ev?.tls_handshake_ok ? t.valValid : (ev?.tls_handshake_ok === false ? t.valInvalid : '—'))} valueColor={internalUnreachable ? 'var(--text-muted)' : sslColor} desc={getSslDesc(ev?.tls_handshake_ok)} />
                    <CardRow label={t.rowExpiration} value={ev?.tls_cert_expiry ? fmtDateLong(ev.tls_cert_expiry) : (website.ssl_expiry_date ? fmtDateLong(website.ssl_expiry_date) : '—')} desc={getExpiryDesc(ev?.tls_cert_expiry || website.ssl_expiry_date)} />
                    <CardRow label={t.rowRemainingDays} value={ev?.tls_cert_expiry ? getRemainingDays(ev.tls_cert_expiry) : (website.ssl_expiry_date ? getRemainingDays(website.ssl_expiry_date) : '—')} desc={getRemainingDesc(ev?.tls_cert_expiry || website.ssl_expiry_date)} />
                  </CardBox>

                  <CardBox title={t.cardInfrastructure}>
                    <CardRow label={t.rowServer} value={ev?.server_header || t.valUnknown} desc={getServerDesc(ev?.server_header)} />
                    {botBlocked && wafName && (
                      <CardRow label={t.rowBotDetector} value={wafName} valueColor="#f59e0b" desc={`Sistem keamanan (WAF/CDN) yang dipakai ${website?.name || 'situs ini'} untuk memblokir akses otomatis/bot.`} />
                    )}
                  </CardBox>
                </div>

                {/* 3.5 PANDUAN PARAMETER UNTUK AWAM */}
                <div className="bg-bg-main border border-border rounded-xl py-3 px-4 mb-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
                  <div 
                    onClick={() => setShowGuide(!showGuide)}
                    className="flex justify-between items-center cursor-pointer text-[12px] font-extrabold text-text-strong tracking-wide"
                  >
                    <span>💡 PENJELASAN PARAMETER JARINGAN & WEB (UNTUK AWAM)</span>
                    <span className="text-[10px]">{showGuide ? 'SEMBUNYIKAN ▲' : 'TAMPILKAN ▼'}</span>
                  </div>
                  
                  {showGuide && (
                    <div className="mt-3 flex flex-col gap-2.5 border-t border-border pt-3">
                      <div className="text-[11px] leading-normal text-text-strong">
                        <strong className="text-accent">Service Health (Kesehatan Layanan):</strong>
                        <ul className="mt-1 ml-4 p-0 list-disc">
                          <li><strong>Status:</strong> Kondisi operasional website saat ini (Normal/Bermasalah/Terputus).</li>
                          <li><strong>HTTP Code:</strong> Kode respon server. 200 berarti sukses. 403 berarti akses ditolak sistem keamanan (Forbidden). 404 berarti halaman tidak ditemukan. 500-504 berarti server aplikasi crash/rusak.</li>
                          <li><strong>Response Time:</strong> Seberapa cepat server mengirim balasan halaman web (dalam milidetik). Makin kecil makin responsif.</li>
                          <li><strong>TTFB (Time to First Byte):</strong> Waktu tunggu sampai server mengirimkan bit data pertama. Mengukur kecepatan server memproses instruksi.</li>
                        </ul>
                      </div>
                      <div className="text-[11px] leading-normal text-text-strong">
                        <strong className="text-accent">Connectivity (Konektivitas):</strong>
                        <ul className="mt-1 ml-4 p-0 list-disc">
                          <li><strong>ICMP Ping:</strong> Tes ketukan pintu jaringan ke server untuk mengecek apakah server aktif merespons sinyal dasar. Menggunakan data ping asli.</li>
                          <li><strong>DNS Status & Lookup Time:</strong> Status dan kecepatan menerjemahkan alamat web (misal: google.com) menjadi koordinat IP angka server.</li>
                          <li><strong>IP Address:</strong> Alamat unik server di jaringan internet (seperti nomor rumah/telepon).</li>
                        </ul>
                      </div>
                      <div className="text-[11px] leading-normal text-text-strong">
                        <strong className="text-accent">Security (Keamanan):</strong>
                        <ul className="mt-1 ml-4 p-0 list-disc">
                          <li><strong>SSL Status:</strong> Status keamanan enkripsi koneksi. Jika aktif (Valid), menjamin lalu lintas data aman dan tidak bisa diintip orang lain.</li>
                          <li><strong>Expiration & Remaining:</strong> Batas masa berlaku sertifikat keamanan website. Jika kedaluwarsa, browser akan memblokir akses pengguna.</li>
                        </ul>
                      </div>
                      <div className="text-[11px] leading-normal text-text-strong">
                        <strong className="text-accent">Infrastructure (Infrastruktur):</strong>
                        <ul className="mt-1 ml-4 p-0 list-disc">
                          <li><strong>Server:</strong> Perangkat lunak web server yang memproses website (misal: Nginx, Apache, IIS).</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. VISIT WEBSITE */}
                <div className="mt-5">
                  <a href={website.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2.5 w-full p-4 bg-primary text-white rounded-xl text-[16px] font-black no-underline shadow-[0_4px_12px_var(--primary-glow)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_var(--primary-glow)]"
                  >
                    🌐 {t.visitWebsite} ↗
                  </a>
                </div>
              </div>
            )
          })()}



          {/* ── PERFORMANCE ── */}
          {tab === 'performance' && (
            <div>
              {/* Performance mini cards */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: t.perfAvgResponse, value: fmt(avgRT), color: '#3b82f6' },
                  { label: t.perfSlowest, value: fmt(maxRT), color: '#ef4444' },
                  { label: t.perfFastest, value: fmt(minRT), color: '#10b981' },
                ].map(item => (
                  <div key={item.label} className="bg-[rgba(255,255,255,0.97)] border border-[rgba(99,102,241,0.12)] rounded-lg py-2.5 px-3.5">
                    <div className="text-[9px] text-[#4a6fa5] tracking-widest">{item.label.toUpperCase()}</div>
                    <div style={{ color: item.color }} className="text-[20px] font-black mt-1 tabular-nums">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Response time chart */}
              <div className="text-[10px] text-[#4a6fa5] mb-2 tracking-wide font-semibold">
                {t.perfResponseLast} {perfData.length} {t.perfChecks}
              </div>
              <div className="h-[160px]">
                {chartMounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 400, height: 160 }}>
                    <LineChart data={perfData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,45,74,0.8)" />
                      <XAxis dataKey="i" tick={false} axisLine={{ stroke: 'var(--border)' }} />
                      <YAxis tick={{ fill: '#4a6fa5', fontSize: 9 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                      <Tooltip
                        content={({ active, payload }) => active && payload?.length ? (
                          <div className="bg-bg-header border border-[rgba(99,102,241,0.12)] rounded-md py-2 px-3 text-[11px]">
                            <div className="text-[#3b82f6] font-semibold">{payload[0].value}ms</div>
                            <div className="text-[#4a5568] text-[9px]">{payload[0].payload.time}</div>
                          </div>
                        ) : null}
                      />
                      <Line type="monotone" dataKey="rt" stroke="#3b82f6" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Stats */}
              <div className="mt-3.5">
                {[
                  { label: t.perfTotalChecks, value: logs.length },
                  { label: t.perfSuccessfulChecks, value: upLogsCount },
                  { label: t.perfSampleUptime, value: `${uptime}%` },
                ].map(item => (
                  <InfoRow key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </div>
          )}

          {/* ── TIMELINE ── */}
          {tab === 'timeline' && (
            <AvailabilityTimeline websiteId={website.id} />
          )}

          {/* ── HISTORY ── */}
          {tab === 'history' && (
            loading ? (
              <div className="text-center text-[#4a5568] py-6 px-0 text-[12px]">{t.loading}</div>
            ) : logs.length === 0 ? (
              <div className="text-center text-[#4a5568] py-6 px-0 text-[12px]">{t.noHistory}</div>
            ) : (
              <table className="w-full min-w-[520px] border-collapse text-[11px]">
                <thead>
                  <tr>{[t.colTime, t.colStatus, t.colHttp, t.thLatency, t.colHealth, t.colSsl].map(h => <th key={h} className="text-left py-2 px-2.5 text-[9px] text-text-sub tracking-widest border-b border-border font-bold bg-bg-header">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={i} className="border-b border-border" style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums">{fmtTime(log.checked_at)}</td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums"><span style={{ color: STATUS_COLORS[log.status] || '#4a5568' }} className="font-semibold text-[10px]">{log.status ? tStatus(log.status) : '—'}</span></td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums">{log.status_code ?? '—'}</td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums">{fmt(log.response_time_ms)}</td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums"><span style={{ color: log.health_score > 80 ? '#10b981' : '#f59e0b' }}>{log.health_score}%</span></td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums">{log.ssl_valid == null ? '—' : log.ssl_valid ? '✓' : '✗'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {/* ── ALERTS ── */}
          {tab === 'alerts' && (
            alerts.length === 0 ? (
              <div className="text-center text-[#4a5568] py-6 px-0 text-[12px]">{t.noAlertsService}</div>
            ) : (
              <table className="w-full min-w-[520px] border-collapse text-[11px]">
                <thead>
                  <tr>{[t.colTime, t.colStatus, t.colIssue, t.colHttp, t.colResponse].map(h => <th key={h} className="text-left py-2 px-2.5 text-[9px] text-text-sub tracking-widest border-b border-border font-bold bg-bg-header">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {alerts.map((log, i) => (
                    <tr key={i} className="border-b border-border" style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums">{fmtTime(log.checked_at)}</td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums"><span style={{ color: { CRITICAL: '#f59e0b', OFFLINE: '#ef4444' }[log.status] || '#4a5568' }} className="font-semibold text-[10px]">{tStatus(log.status)}</span></td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums">{log.status === 'OFFLINE' ? t.issueUnreachable : log.status === 'CRITICAL' ? t.issueCriticalFail : t.issueStability}</td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums">{log.status_code ?? '—'}</td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums">{fmt(log.response_time_ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

        </div>
      </div>

    </div>
  )
}
