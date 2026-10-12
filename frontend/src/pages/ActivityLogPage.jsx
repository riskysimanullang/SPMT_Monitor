import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import Badge from '../components/common/Badge'
import { useTheme } from '../store/theme'

const SC = { ONLINE: '#10b981', WARNING: '#f59e0b', CRITICAL: '#ef4444', OFFLINE: '#dc2626', SERVER_DOWN: '#dc2626', WEB_DOWN: '#f97316', DNS_ERROR: '#8b5cf6', SSL_INVALID: '#ec4899', SLOW: '#eab308' }
const LOCALE_MAP = { id: 'id-ID', en: 'en-US', zh: 'zh-CN', ja: 'ja-JP', ru: 'ru-RU' }
const FILTERS = ['ALL', 'ONLINE', 'CRITICAL', 'OFFLINE']

const pbClass = a => `border text-[10px] font-semibold py-1 px-2.5 rounded cursor-pointer transition-colors duration-150 ${a ? 'bg-[#4f46e5] border-[#4f46e5] text-white' : 'bg-[rgba(99,102,241,0.08)] border-[rgba(99,102,241,0.15)] text-[#64748b] hover:bg-[rgba(99,102,241,0.15)]'}`

export default function ActivityLogPage({ events }) {
  const { t, tStatus, lang } = useTheme()
  const locale = LOCALE_MAP[lang] || 'en-US'
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const PER = 50

  const fmt = d => d ? new Date(d).toLocaleString(locale, { hour12: false }) : '—'
  const filtered = events.filter(ev => filter === 'ALL' || ev.new_status === filter)
  const total = Math.max(1, Math.ceil(filtered.length / PER))
  const paged = filtered.slice((page - 1) * PER, page * PER)

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-2">
      <div className="bg-bg-main border border-border rounded-lg overflow-hidden flex-1 flex flex-col shadow-shadow">
        {/* Header */}
        <div className="flex items-center justify-between py-4 px-5 border-b border-border bg-bg-header shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3.5">
            <span className="text-[24px] font-black text-primary tracking-tight">📋 {t.activityLogTitle}</span>
            <span className="text-[14px] text-text-muted font-semibold">{t.completeHistory} · {events.length} {t.eventsLabel}</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {FILTERS.map(f => (
              <button key={f} onClick={() => { setFilter(f); setPage(1) }}
                className={`text-[13px] font-extrabold py-1.5 px-3.5 rounded cursor-pointer tracking-wider border transition-colors duration-150 ${filter === f ? 'bg-[rgba(79,70,229,0.12)] border-[rgba(79,70,229,0.4)] text-[#4f46e5]' : 'bg-[rgba(99,102,241,0.05)] border-[rgba(99,102,241,0.15)] text-text-muted'}`}>{f === 'ALL' ? t.allStatus : tStatus(f)}</button>
            ))}
          </div>
        </div>
        {/* Table */}
        {!events || events.length === 0 ? <div className="flex-1 flex items-center justify-center text-text-muted text-[13px]">{t.noEventsFound}</div> : (
            <>
              <div className="flex-1 overflow-y-auto overflow-x-auto [webkit-overflow-scrolling:touch]">
                <table className="w-full min-w-[560px] border-collapse text-[12px]">
                  <thead><tr>{[t.colService, t.colTransition, t.colNewStatus, t.colTime].map(h => <th key={h} className="text-left py-3.5 px-4.5 text-[13px] text-text-sub tracking-widest border-b border-[rgba(99,102,241,0.1)] font-extrabold bg-bg-card sticky top-0">{h}</th>)}</tr></thead>
                  <tbody>
                    {paged.map((ev, i) => (
                      <tr key={ev.id} className="border-b border-[rgba(99,102,241,0.06)]" style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(99,102,241,0.02)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,70,229,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(99,102,241,0.02)'}>
                        <td className="py-4 px-4.5 font-extrabold text-text text-[16px]">{ev.website_name}</td>
                        <td className="py-4 px-4.5">
                          <div className="flex items-center gap-2.5">
                            <span style={{ color: SC[ev.old_status] || 'var(--text-muted)' }} className="text-[14px] opacity-60 font-semibold">{ev.old_status ? tStatus(ev.old_status) : '—'}</span>
                            <ArrowRight size={14} className="text-text-muted" />
                            <span style={{ color: SC[ev.new_status] || 'var(--text-muted)' }} className="font-black text-[16px]">{tStatus(ev.new_status)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4.5"><Badge status={ev.new_status} /></td>
                        <td className="py-4 px-4.5 text-text-muted text-[14px] font-semibold">{fmt(ev.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {total > 1 && <div className="flex gap-1.25 justify-center p-2.5 border-t border-border bg-bg-card">
                <button className={pbClass(false)} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                {Array.from({ length: Math.min(7, total) }, (_, i) => { const p = Math.max(1, Math.min(total - 6, page - 3)) + i; return <button key={p} className={pbClass(p === page)} onClick={() => setPage(p)}>{p}</button> })}
                <button className={pbClass(false)} onClick={() => setPage(p => Math.min(total, p + 1))} disabled={page === total}>›</button>
              </div>}
            </>
          )}
      </div>
    </div>
  )
}
