import { useState, useEffect, useRef, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { historyAPI } from '../../services/api'
import { useTheme } from '../../store/theme'

// ── Ranges: LIVE (1min), 1H (1min buckets), 3H (2min buckets)
const RANGES = [
  { label:'LIVE', value:'live', bucket:60,  desc:'Real-time per menit' },
]

// ── Safe date formatter — TIDAK PERNAH return Invalid Date / tahun 2000
function safeLabel(timeVal, bucket) {
  if (!timeVal) return ''
  let d
  // Handle berbagai format dari backend: ISO string, epoch number, timestamp
  if (typeof timeVal === 'number') {
    // Jika epoch dalam detik (< 1e10), konversi ke ms
    d = new Date(timeVal < 1e10 ? timeVal * 1000 : timeVal)
  } else {
    d = new Date(timeVal)
  }
  // Validasi — jika invalid atau tahun < 2020, pakai waktu sekarang
  if (isNaN(d.getTime()) || d.getFullYear() < 2020) return ''
  return d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', hour12:false })
}

// ── Build empty live frame: 60 slot @1 menit = pengecekan per menit selama 1 jam
function buildLiveFrame(slots=60) {
  const now = new Date()
  return Array.from({length:slots},(_,i)=>{
    const d = new Date(now.getTime() - (slots-1-i)*60000)
    return { label:d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',hour12:false}), online:null, critical:null, offline:null, unknown:null }
  })
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0)
  return (
    <div className="bg-bg-card border border-border-strong rounded-xl py-2.5 px-3.5 text-[13px] min-w-[150px] shadow-[0_12px_40px_rgba(0,0,0,0.32)] backdrop-blur-[14px]">
      <div className="text-text mb-2 text-[12px] font-extrabold tracking-wide flex justify-between gap-4">
        <span>🕒 {label}</span>
        <span className="text-text-muted">Σ {total}</span>
      </div>
      {payload.map(p=>(
        <div key={p.dataKey} className="font-bold mb-1 flex justify-between items-center gap-5">
          <span style={{ color: p.color }} className="flex items-center gap-1.5">
            <span style={{ background: p.color }} className="w-2 h-2 rounded-full inline-block shrink-0" />
            {p.name}
          </span>
          <span className="text-text tabular-nums">{p.value??'—'}</span>
        </div>
      ))}
    </div>
  )
}

const MAX_LIVE = 60

export default function MonitoringGraph({ realtimeSnapshot }) {
  const { t } = useTheme()
  const [range,    setRange]   = useState('live')
  const [data,     setData]    = useState([])
  const [loading,  setLoading] = useState(false)
  const [mounted,  setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const liveRef   = useRef(buildLiveFrame(MAX_LIVE))
  const bucketRef = useRef({})

  // ── Init: backfill live dari DB (1h history) ──
  useEffect(()=>{
    const init = async () => {
      try {
        const res = await historyAPI.getStatusHistory('1h')
        const pts = res.data || []
        const frame = buildLiveFrame(MAX_LIVE)
        pts.forEach(p => {
          const lbl = safeLabel(p.time, 60)
          if (!lbl) return
          const idx = frame.findIndex(f=>f.label===lbl)
          if (idx !== -1) {
            frame[idx] = { label:lbl, online:p.online??0, critical:p.critical??0, offline:p.offline??0, unknown:p.unknown??0 }
          }
        })
        liveRef.current = frame
        setData([...frame])
      } catch { setData([...liveRef.current]) }
    }
    init()
  },[])

  // ── Fetch 1H / 3H dari DB ──
  const fetchHistory = useCallback(async (r) => {
    setLoading(true)
    try {
      const res = await historyAPI.getStatusHistory(r)
      const pts = (res.data||[])
        .map(p => ({ label:safeLabel(p.time, r==='3h'?120:60), online:p.online??0, critical:p.critical??0, offline:p.offline??0, unknown:p.unknown??0 }))
        .filter(p => p.label) // buang yang labelnya kosong/invalid
      setData(pts)
    } catch { setData([]) }
    finally { setLoading(false) }
  },[])

  // ── Switch range ──
  useEffect(()=>{
    if (range==='live') setData([...liveRef.current])
    else fetchHistory(range)
  },[range, fetchHistory])

  // ── Live update dari WebSocket snapshot ──
  useEffect(()=>{
    if (!realtimeSnapshot) return
    const now  = new Date()
    const lbl  = now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',hour12:false})
    const snap = { online:realtimeSnapshot.online??0, critical:realtimeSnapshot.critical??0, offline:realtimeSnapshot.offline??0, unknown:realtimeSnapshot.unknown??0 }
    bucketRef.current[lbl] = snap

    let frame = liveRef.current.map(p => p.label===lbl ? {...p,...snap} : p)
    if (!frame.find(p=>p.label===lbl)) {
      frame = [...frame.slice(1), {label:lbl,...snap}]
    }
    liveRef.current = frame
    if (range==='live') setData([...frame])
  },[realtimeSnapshot, range])

  // ── Sumbu Y: default 0–300 (garis tiap 50). Jika data >300, otomatis 0–500 (garis tiap 100) ──
  const dataPeak = data.reduce((m, d) => Math.max(m, d.online ?? 0, d.critical ?? 0, d.offline ?? 0), 0)
  const yMax  = dataPeak > 300 ? 500 : 300
  const yStep = dataPeak > 300 ? 100 : 50
  const yTicks = Array.from({ length: yMax / yStep + 1 }, (_, i) => i * yStep)

  // ── Keterangan garis grafik (ikut bahasa terpilih) ──
  const LEGEND = [
    { label: t.online,   color: '#10b981' },
    { label: t.critical, color: '#d97706' },
    { label: t.offline,  color: '#dc2626' },
  ]

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-transparent">
      {/* Header */}
      <div className="flex items-center justify-between py-2 px-4 border-b border-border bg-bg-header shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="stroke-accent" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <span className="text-[13px] font-black text-text tracking-wider whitespace-nowrap">{t.monitoringStatus}</span>
          {loading && <span className="text-accent text-[11px] font-bold animate-[pulse_1.5s_infinite]">{t.loadingCaps}</span>}
          {range==='live' && !loading && <span className="text-[10px] font-black text-[#10b981] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] rounded-[6px] py-[2px] px-2.5 flex items-center gap-1.25 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-[#10b981] inline-block animate-[pulse_1.5s_infinite]" />{t.liveCaps}</span>}
        </div>
      </div>

      {/* Chart — dipusatkan dengan jarak di semua sisi */}
      <div className="flex-1 min-h-0 py-3.5 px-4">
        {data.length===0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted">
            <span className="text-2xl">📊</span>
            <span className="text-[11px]">{t.waitingData}</span>
          </div>
        ) : (
          mounted && (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 400, height: 200 }}>
              <AreaChart data={data} margin={{ top:6, right:12, left:-6, bottom:4 }}>
                <defs>
                  <linearGradient id="gOn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.45}/><stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/></linearGradient>
                  <linearGradient id="gCr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d97706" stopOpacity={0.4}/><stop offset="95%" stopColor="#d97706" stopOpacity={0.02}/></linearGradient>
                  <linearGradient id="gOf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#dc2626" stopOpacity={0.45}/><stop offset="95%" stopColor="#dc2626" stopOpacity={0.02}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" vertical={false}/>
                <XAxis dataKey="label" tick={{ fill:'var(--text-muted)', fontSize:11, fontWeight:600 }} tickLine={false} axisLine={{ stroke:'var(--border)' }} interval="preserveStartEnd" minTickGap={40}/>
                <YAxis domain={[0, yMax]} ticks={yTicks} tick={{ fill:'var(--text-muted)', fontSize:11, fontWeight:600 }} tickLine={false} axisLine={{ stroke:'var(--border)' }} allowDecimals={false} width={34}/>
                <Tooltip content={<CustomTooltip/>} cursor={{ stroke:'var(--accent)', strokeWidth:1, strokeDasharray:'4 4' }}/>
                <Area type="monotone" dataKey="online"   name={t.online}   stroke="#10b981" strokeWidth={2.6} fill="url(#gOn)" dot={false} activeDot={{ r:5, strokeWidth:2, stroke:'var(--bg-card)' }} connectNulls={false} isAnimationActive={false}/>
                <Area type="monotone" dataKey="critical" name={t.critical} stroke="#d97706" strokeWidth={2.4} fill="url(#gCr)" dot={false} activeDot={{ r:5, strokeWidth:2, stroke:'var(--bg-card)' }} connectNulls={false} isAnimationActive={false}/>
                <Area type="monotone" dataKey="offline"  name={t.offline}  stroke="#dc2626" strokeWidth={2.6} fill="url(#gOf)" dot={false} activeDot={{ r:5, strokeWidth:2, stroke:'var(--bg-card)' }} connectNulls={false} isAnimationActive={false}/>
              </AreaChart>
            </ResponsiveContainer>
          )

        )}
      </div>

      {/* Keterangan garis: tiap warna mewakili jumlah node pada status tsb */}
      <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1.5 pt-1.5 pb-2.5 px-3.5 shrink-0">
        {LEGEND.map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span style={{ background: l.color }} className="w-4 h-[3px] rounded-[2px] inline-block shrink-0" />
            <span className="text-[11px] font-bold text-text-sub">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
