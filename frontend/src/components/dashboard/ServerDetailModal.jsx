import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { systemAPI } from '../../services/api'
import { useGlobalWebSocket } from '../../store/WebSocketContext'
import { useTheme } from '../../store/theme'

const LOCALE_MAP = { id: 'id-ID', en: 'en-US', zh: 'zh-CN', ja: 'ja-JP', ru: 'ru-RU' }

// Format a throughput rate (in Mbps) into a human-friendly string with adaptive units.
function formatRate(mbps) {
  if (mbps == null || isNaN(mbps)) return '—'
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(1)} Gbps`
  if (mbps >= 1) return `${mbps.toFixed(1)} Mbps`
  if (mbps > 0) return `${(mbps * 1000).toFixed(0)} Kbps`
  return '0 Kbps'
}

// ── Animated gauge bar ─────────────────────────────────────────
function GaugeBar({ label, value, max = 100, warnAt, critAt, unit = '%', color = '#6366f1' }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const isCrit = critAt != null && value >= critAt
  const isWarn = warnAt != null && value >= warnAt && !isCrit
  const barColor = isCrit ? '#ef4444' : isWarn ? '#f59e0b' : color
  const textColor = isCrit ? '#ef4444' : isWarn ? '#f59e0b' : '#f1f5f9'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] text-white/45 font-extrabold tracking-wider">{label}</span>
        <span style={{ color: textColor }} className="text-[20px] font-black tabular-nums">
          {value != null ? `${typeof value === 'number' && unit === '%' ? Math.round(value) : value}${unit}` : '—'}
        </span>
      </div>
      <div className="h-1.5 rounded bg-white/7 overflow-hidden">
        <div style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${barColor}aa, ${barColor})`,
          boxShadow: (isCrit || isWarn) ? `0 0 10px ${barColor}88` : 'none',
        }} className="h-full rounded transition-[width] duration-600 ease-[cubic-bezier(0.34,1.56,0.64,1)]" />
      </div>
      {isCrit && (
        <span className="text-[10px] text-[#ef4444] font-extrabold">
          ● CRITICAL — Exceeds {critAt}{unit} threshold
        </span>
      )}
      {isWarn && (
        <span className="text-[10px] text-[#f59e0b] font-extrabold">
          ● WARNING — Exceeds {warnAt}{unit} threshold
        </span>
      )}
    </div>
  )
}

// ── Stat chip ─────────────────────────────────────────────────
function StatChip({ icon, label, value, color = '#94a3b8' }) {
  return (
    <div className="bg-white/4 border border-white/8 rounded-xl py-3.5 px-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.75">
        <span className="text-[16px]">{icon}</span>
        <span className="text-[10px] text-white/40 font-extrabold tracking-wider">{label}</span>
      </div>
      <div style={{ color }} className="text-[22px] font-black tabular-nums">{value ?? '—'}</div>
    </div>
  )
}

// ── Network row ───────────────────────────────────────────────
function NetRow({ label, value, mono = false }) {
  return (
    <div className="flex justify-between items-center py-2.25 border-b border-white/5">
      <span className="text-[12px] text-white/40 font-bold">{label}</span>
      <span style={{ fontFamily: mono ? 'monospace' : 'inherit' }} className="text-[13px] font-extrabold text-[#e2e8f0] max-w-[60%] text-right [word-break:break-all]">
        {value || '—'}
      </span>
    </div>
  )
}

// ── Recommendation card ───────────────────────────────────────
function RecommendationCard({ cpu, ram }) {
  const tips = []
  if (cpu >= 80) {
    tips.push({
      icon: '🔥',
      title: 'CPU Tinggi',
      body: 'Monitor sedang memproses banyak job secara bersamaan. Pertimbangkan mengurangi interval cek atau meningkatkan jumlah worker pool untuk membagi beban.',
    })
  }
  if (ram >= 85) {
    tips.push({
      icon: '💾',
      title: 'RAM Tinggi',
      body: 'Konsumsi memori mendekati batas. Hal ini dapat disebabkan oleh cache favicon, antrian job yang besar, atau goroutine yang tidak dilepas. Restart server jika berlanjut.',
    })
  }
  if (tips.length === 0) {
    tips.push({
      icon: '✅',
      title: 'Performa Normal',
      body: 'CPU dan RAM dalam batas aman. Sistem berjalan optimal. Tidak ada tindakan yang diperlukan saat ini.',
      ok: true,
    })
  }
  return (
    <div className="flex flex-col gap-2.5">
      {tips.map((t, i) => (
        <div key={i} style={{
          backgroundColor: t.ok ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
          borderColor: t.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
        }} className="rounded-lg py-3 px-4 border">
          <div style={{ color: t.ok ? '#10b981' : '#f87171' }} className="text-[13px] font-black mb-1.25">
            {t.icon} {t.title}
          </div>
          <div className="text-[12px] text-white/60 leading-relaxed">{t.body}</div>
        </div>
      ))}
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────
export default function ServerDetailModal({ onClose }) {
  const { t, lang } = useTheme()
  const locale = LOCALE_MAP[lang] || 'en-US'
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchHealth = useCallback(async () => {
    try {
      const res = await systemAPI.getHealth()
      if (res.data) setHealth(res.data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchHealth()
    const timer = setInterval(fetchHealth, 4000)
    return () => clearInterval(timer)
  }, [fetchHealth])

  useGlobalWebSocket(useCallback((msg) => {
    if (msg.type === 'system_health') setHealth(msg.payload)
  }, []))

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const cpu = health?.backend_cpu ?? 0
  const ram = health?.backend_ram ?? 0
  const overallStatus = (cpu >= 80 || ram >= 85) ? 'KRITIS' : (cpu >= 60 || ram >= 70) ? 'PERINGATAN' : 'NORMAL'
  const statusColor = overallStatus === 'KRITIS' ? '#ef4444' : overallStatus === 'PERINGATAN' ? '#f59e0b' : '#10b981'
  const overallStatusLabel = overallStatus === 'KRITIS' ? t.critical : overallStatus === 'PERINGATAN' ? t.warning : t.srvNormal

  const updatedAt = health?.updated_at ? new Date(health.updated_at).toLocaleTimeString(locale, { hour12: false }) : null

  return createPortal(
    <div
      id="server-detail-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-[2000] bg-[rgba(5,10,25,0.85)] backdrop-blur-md flex items-center justify-center animate-[srvFadeIn_0.25s_ease]"
    >
      <style>{`
        @keyframes srvFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes srvSlideUp { from { opacity: 0; transform: translateY(28px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .srv-scroll::-webkit-scrollbar { width: 4px; }
        .srv-scroll::-webkit-scrollbar-track { background: transparent; }
        .srv-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>

      <div
        id="server-detail-modal"
        style={{
          borderColor: `${statusColor}33`,
          boxShadow: `0 0 0 1px ${statusColor}22, 0 40px 80px rgba(0,0,0,0.7), 0 0 60px ${statusColor}18`,
        }}
        className="w-full max-w-[720px] max-h-[90vh] bg-gradient-to-br from-[rgba(15,23,42,0.99)] to-[rgba(10,15,35,0.99)] border rounded-3xl flex flex-col overflow-hidden animate-[srvSlideUp_0.35s_cubic-bezier(0.16,1,0.3,1)] m-4"
      >
        {/* ── Header ── */}
        <div style={{
          background: `linear-gradient(135deg, ${statusColor}12 0%, transparent 60%)`,
        }} className="pt-5 pb-4.5 px-4 md:px-7 border-b border-white/7 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4">
            {/* Pulsing status dot */}
            <div className="relative w-4 h-4">
              <div style={{ backgroundColor: statusColor }} className="absolute inset-0 rounded-full opacity-30 animate-[pulse-ring_1.8s_ease-out_infinite]" />
              <div style={{ backgroundColor: statusColor }} className="absolute inset-0.75 rounded-full" />
            </div>
            <div>
              <div className="text-[20px] font-black text-white tracking-wider">SPMT SERVER MONITOR</div>
              <div className="text-[11px] text-white/40 mt-0.5">
                {t.srvLocalSystem} · {updatedAt ? `${t.srvUpdated} ${updatedAt}` : `${t.loading}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {health?.net_rx_mbps != null && (
              <span className="text-[12px] font-black bg-[rgba(56,189,248,0.1)] border border-[rgba(56,189,248,0.32)] py-1.5 px-3 rounded-lg tracking-normal flex items-center gap-2 whitespace-nowrap tabular-nums relative cursor-default">
                <span className="text-[13px]">📶</span>
                <span className="text-[#38bdf8]">↓ {formatRate(health.net_rx_mbps)}</span>
                <span className="text-[#a78bfa]">↑ {formatRate(health.net_tx_mbps)}</span>
              </span>
            )}
            <span style={{
              color: statusColor,
              backgroundColor: `${statusColor}18`,
              borderColor: `${statusColor}40`,
            }} className="text-[12px] font-black py-1.5 px-3.5 rounded-lg tracking-widest border">{overallStatusLabel}</span>
            <button
              id="server-modal-close"
              onClick={onClose}
              className="bg-white/6 border border-white/10 text-white/60 w-8.5 h-8.5 rounded-lg cursor-pointer text-[18px] flex items-center justify-center transition-all duration-200 hover:bg-white/12 hover:text-white"
            >×</button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="srv-scroll overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-[200px] text-white/30 text-[14px]">
              {t.srvLoading}
            </div>
          ) : (
            <div className="py-6 px-7 flex flex-col gap-6">

              {/* ── CPU & RAM ── */}
              <section>
                <div className="text-[11px] text-white/35 font-extrabold tracking-widest mb-3.5">{t.srvResourceUsage}</div>
                <div className="flex flex-col gap-4.5">
                  <GaugeBar label={t.cpuUsage} value={cpu} warnAt={60} critAt={80} color="#6366f1" />
                  <GaugeBar label={t.ramUsage} value={ram} warnAt={70} critAt={85} color="#8b5cf6" />
                </div>
              </section>

              {/* ── Worker stats ── */}
              <section>
                <div className="text-[11px] text-white/35 font-extrabold tracking-widest mb-3.5">{t.srvWorkerRuntime}</div>
                <div className="grid grid-cols-2 gap-3">
                  <StatChip icon="⚙️" label={t.srvActiveWorkers} value={health?.active_workers} color="#38bdf8" />
                  <StatChip icon="📋" label={t.srvQueueSize} value={health?.worker_queue_size} color="#a78bfa" />
                  <StatChip icon="🔀" label={t.srvGoroutines} value={health?.active_goroutines} color="#34d399" />
                  <StatChip icon="🔌" label={t.srvWsConn} value={health?.ws_connections} color="#fb923c" />
                </div>
              </section>

              {/* ── Network ── */}
              <section>
                <div className="text-[11px] text-white/35 font-extrabold tracking-widest mb-3.5">{t.srvNetworkInfo}</div>
                <div className="bg-white/3 border border-white/7 rounded-2xl py-1 px-4">
                  <NetRow label={t.srvConnType} value={health?.network_type} />
                  <NetRow label={t.srvNetName} value={health?.network_name} />
                  <NetRow label={t.srvLinkSpeed} value={health?.link_speed} mono />
                  <NetRow label={t.srvInterface} value={health?.interface_alias} mono />
                  <NetRow label={t.rowIpAddress} value={health?.public_ip} mono />
                  <NetRow label={t.srvGateway} value={health?.local_gateway} mono />
                  <NetRow label={t.srvDnsResolver} value={health?.dns_resolver} mono />
                </div>
              </section>

              {/* ── Recommendations ── */}
              <section>
                <div className="text-[11px] text-white/35 font-extrabold tracking-widest mb-3.5">{t.srvAnalysis}</div>
                <RecommendationCard cpu={cpu} ram={ram} />
              </section>

              {/* ── Network Speed Threshold Info ── */}
              <section className="animate-[srvFadeIn_0.3s_ease-out]">
                <div className="text-[11px] text-white/35 font-extrabold tracking-widest mb-3.5">AMBANG BATAS & INDIKATOR JARINGAN</div>
                <div className="bg-white/2 border border-white/6 rounded-2xl py-4 px-5 flex flex-col gap-3.5">
                  {/* Arrow Explanations */}
                  <div className="flex flex-col gap-2.5 border-b border-white/6 pb-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[12px] font-black text-[#38bdf8]">↓ Panah Bawah (Download / Rx)</span>
                      <span className="text-[11px] text-white/55 leading-normal">
                        Kecepatan unduh server monitor saat menerima data/respons dari target.
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[12px] font-black text-[#a78bfa]">↑ Panah Atas (Upload / Tx)</span>
                      <span className="text-[11px] text-white/55 leading-normal">
                        Kecepatan unggah server monitor saat mengirimkan permintaan cek ke target.
                      </span>
                    </div>
                  </div>

                  {/* Status List */}
                  <div className="flex flex-col gap-3">
                    {/* Safe */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <div style={{ boxShadow: '0 0 6px #10b981' }} className="w-2 h-2 rounded-full bg-[#10b981]" />
                        <span className="text-[12px] font-black text-[#10b981]">AMAN (&gt; 1 Mbps)</span>
                      </div>
                      <span className="text-[11px] text-white/55 leading-normal pl-4">
                        Koneksi optimal. Pengecekan website berjalan lancar secara paralel tanpa antrean job.
                      </span>
                    </div>

                    {/* Slow */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <div style={{ boxShadow: '0 0 6px #fbbf24' }} className="w-2 h-2 rounded-full bg-[#fbbf24]" />
                        <span className="text-[12px] font-black text-[#fbbf24]">LELET / LAMBAT (&le; 512 Kbps)</span>
                      </div>
                      <span className="text-[11px] text-white/55 leading-normal pl-4">
                        Kinerja menurun. Pengecekan rentan mengalami penundaan, antrean bertumpuk, atau pemicuan false alarm (timeout palsu).
                      </span>
                    </div>

                    {/* Offline */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <div style={{ boxShadow: '0 0 6px #ef4444' }} className="w-2 h-2 rounded-full bg-[#ef4444]" />
                        <span className="text-[12px] font-black text-[#ef4444]">OFFLINE / MATI (0 Kbps / —)</span>
                      </div>
                      <span className="text-[11px] text-white/55 leading-normal pl-4">
                        Koneksi terputus total. Server monitor kehilangan akses internet. Semua status target akan dianggap terputus (Offline) oleh sistem.
                      </span>
                    </div>
                  </div>
                </div>
              </section>

            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="py-3 px-7 border-t border-white/7 flex items-center justify-between shrink-0 bg-black/20">
          <span className="text-[11px] text-white/25">{t.srvAutoRefresh}</span>
          <div className="flex items-center gap-1.5">
            <div style={{ boxShadow: '0 0 6px #10b981' }} className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            <span className="text-[11px] font-extrabold text-[#10b981]">{t.liveCaps}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
