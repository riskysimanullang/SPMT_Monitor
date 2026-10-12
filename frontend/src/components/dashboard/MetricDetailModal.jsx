import { useState } from 'react'
import { useTheme } from '../../store/theme'

const LOCALE_MAP = { id: 'id-ID', en: 'en-US', zh: 'zh-CN', ja: 'ja-JP', ru: 'ru-RU' }

const StatusBadge = ({ status }) => {
  const { tStatus } = useTheme()
  const c = {
    ONLINE: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
    WARNING: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    CRITICAL: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    OFFLINE: { bg: 'rgba(220,38,38,0.15)', color: '#dc2626', border: 'rgba(220,38,38,0.3)' },
  }[status] || { bg: 'rgba(74,85,104,0.15)', color: '#4a5568', border: 'rgba(74,85,104,0.3)' }
  return (
    <span style={{ backgroundColor: c.bg, color: c.color, borderColor: c.border }}
          className="border rounded py-[2px] px-2 text-[10px] font-bold tracking-wider">
      {tStatus(status)}
    </span>
  )
}

const fmt = (ms) => ms != null ? `${ms}ms` : '—'

// Panel penjelasan ringkas — tampil terpisah di bawah tabel/daftar
function Legend({ title, items }) {
  return (
    <div className="shrink-0 border-t-2 border-border bg-bg-header pt-2.5 pb-3 px-4.5">
      <div className="text-[12px] font-black text-text-sub tracking-widest uppercase mb-2">ℹ️ {title}</div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-x-4.5 gap-y-2.5">
        {items.map(item => (
          <div key={item.k} className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[12px] font-extrabold text-text tracking-wide">{item.title}</span>
            <span className="text-[11.5px] text-text-muted leading-normal">{item.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MetricDetailModal({ type, websites, summary, onOpenDetail, onClose }) {
  if (!type) return null
  const { t, lang } = useTheme()
  const locale = LOCALE_MAP[lang] || 'en-US'
  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString(locale, { hour12: false }) : '—'

  const [sortKey, setSortKey] = useState(type === 'avg-rt' ? 'response_time_ms' : (type === 'sla' ? 'sla' : 'name'))
  const [sortDirection, setSortDirection] = useState(type === 'avg-rt' || type === 'sla' ? 'desc' : 'asc')

  const handleRowClick = (w) => {
    onOpenDetail?.(w)
  }

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      const defaultDesc = ['response_time_ms', 'sla', 'last_checked', 'status_code'].includes(key)
      setSortDirection(defaultDesc ? 'desc' : 'asc')
    }
  }

  const filtered = {
    online: websites.filter(w => w.status === 'ONLINE'),
    critical: websites.filter(w => w.status === 'CRITICAL' || w.status === 'WARNING'),
    offline: websites.filter(w => w.status === 'OFFLINE'),
    total: websites,
    alerts: websites.filter(w => w.status !== 'ONLINE' && w.status !== 'UNKNOWN'),
    'avg-rt': websites,
    sla: websites,
  }[type] || websites

  const getSlaValue = w => {
    return w.status === 'ONLINE' ? 100 : w.status === 'WARNING' ? 90 : w.status === 'CRITICAL' ? 80 : 0
  }

  const sortedList = [...filtered].sort((a, b) => {
    let aVal, bVal
    if (sortKey === 'name') {
      aVal = a.name || ''
      bVal = b.name || ''
    } else if (sortKey === 'url') {
      aVal = a.url || ''
      bVal = b.url || ''
    } else if (sortKey === 'status') {
      aVal = a.status || ''
      bVal = b.status || ''
    } else if (sortKey === 'status_code') {
      aVal = a.status_code ?? 0
      bVal = b.status_code ?? 0
    } else if (sortKey === 'response_time_ms') {
      aVal = a.response_time_ms ?? 0
      bVal = b.response_time_ms ?? 0
    } else if (sortKey === 'ssl_valid') {
      aVal = a.ssl_valid === true ? 1 : (a.ssl_valid === false ? -1 : 0)
      bVal = b.ssl_valid === true ? 1 : (b.ssl_valid === false ? -1 : 0)
    } else if (sortKey === 'last_checked') {
      aVal = a.last_checked ? new Date(a.last_checked).getTime() : 0
      bVal = b.last_checked ? new Date(b.last_checked).getTime() : 0
    } else if (sortKey === 'sla') {
      aVal = getSlaValue(a)
      bVal = getSlaValue(b)
    }

    if (aVal === bVal) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    if (typeof aVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal)
    } else {
      return sortDirection === 'asc'
        ? aVal - bVal
        : bVal - aVal
    }
  })

  const renderHeader = (label, key) => {
    const isSorted = sortKey === key
    return (
      <th 
        key={key} 
        className="text-left py-2 px-2.5 text-[9px] text-text-sub tracking-widest border-b border-border font-bold bg-bg-header cursor-pointer select-none transition-colors duration-200"
        onClick={() => handleSort(key)}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-sub)'}
      >
        <div className="flex items-center gap-1">
          {label}
          <span style={{ opacity: isSorted ? 1 : 0.3 }} className="text-[9px]">
            {isSorted ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
          </span>
        </div>
      </th>
    )
  }

  const titles = {
    online: `🟢 ${t.mdOnline}`,
    critical: `🚨 ${t.mdCritical}`,
    offline: `🔴 ${t.mdOffline}`,
    total: `📋 ${t.mdAll}`,
    alerts: `🚨 ${t.mdAlerts}`,
    'avg-rt': `⚡ ${t.mdRtRank}`,
    sla: `📈 ${t.mdSla}`,
  }

  return (
    <div className="fixed inset-0 z-[9997] bg-[rgba(30,41,59,0.45)] flex items-center justify-center backdrop-blur-[2px]" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-[min(900px,95%)] h-[min(720px,85vh)] bg-bg-main border border-border rounded-2xl flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.2)] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div className="flex items-center justify-between py-3.5 px-4.5 border-b border-border bg-bg-header shrink-0">
          <span className="text-[14px] font-bold text-text">{titles[type]}</span>
          <button className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#ef4444] rounded-md py-1.25 px-2.25 cursor-pointer text-[12px]" onClick={onClose}>✕</button>
        </div>

        {type === 'sla' ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-auto py-4 px-4.5">
              <div className="bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.2)] rounded-lg p-6 text-center">
                <div className="text-[48px] font-bold text-[#3b82f6] tabular-nums">{Number(summary?.sla_percent ?? 0).toFixed(3)}%</div>
                <div className="text-[11px] text-text-muted mt-1 tracking-widest">{t.overallSla}</div>
              </div>
              <div className="flex justify-between pt-3 pb-1.5 px-3.5 border-b border-border mt-5">
                <span 
                  className="text-[10px] font-black cursor-pointer select-none flex items-center gap-1"
                  style={{ color: sortKey === 'name' ? 'var(--accent)' : 'var(--text-muted)' }}
                  onClick={() => handleSort('name')}
                >
                  {t.serviceNameCol} {sortKey === 'name' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </span>
                <span 
                  className="text-[10px] font-black cursor-pointer select-none flex items-center gap-1"
                  style={{ color: sortKey === 'sla' ? 'var(--accent)' : 'var(--text-muted)' }}
                  onClick={() => handleSort('sla')}
                >
                  {t.slaValueCol} {sortKey === 'sla' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </span>
              </div>
              <div className="mt-2">
                {sortedList.map((w, i) => {
                  const sla = getSlaValue(w)
                  return (
                    <div key={w.id} className="flex items-center gap-2.5 py-1.5 px-0 border-b border-border cursor-pointer py-2 px-3.5" onClick={() => handleRowClick(w)}>
                      <span className="text-[11px] text-text-muted w-[140px] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap">{w.name}</span>
                      <div className="flex-1 h-1.5 bg-bg-header rounded-full overflow-hidden">
                        <div style={{ width: `${sla}%`, background: sla > 99 ? '#10b981' : sla > 80 ? '#f59e0b' : '#f43f5e' }} className="h-full rounded-full transition-[width] duration-500" />
                      </div>
                      <span className="text-[11px] text-text w-[50px] text-right tabular-nums">{sla}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <Legend title={t.mdLegendTitle} items={[
              { k: 'sla', title: t.legSlaTitle, desc: t.legSlaDesc },
              { k: 'slaval', title: t.legSlaValueTitle, desc: t.legSlaValueDesc },
              { k: 'slaoverall', title: t.legSlaOverallTitle, desc: t.legSlaOverallDesc },
            ]} />
          </div>
        ) : type === 'avg-rt' ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-auto py-4 px-4.5">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-2.5 text-[9px] text-text-sub tracking-widest border-b border-border font-bold bg-bg-header">#</th>
                    {renderHeader(t.colService, 'name')}
                    {renderHeader(t.colUrl, 'url')}
                    {renderHeader(t.colResponseTime, 'response_time_ms')}
                    {renderHeader(t.colStatus, 'status')}
                  </tr>
                </thead>
                <tbody>
                  {sortedList.map((w, i) => (
                    <tr 
                      key={w.id} 
                      onClick={() => handleRowClick(w)}
                      className="border-b border-border cursor-pointer transition-colors duration-200"
                      style={{ 
                        background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)'}
                    >
                      <td style={{ color: i < 3 ? '#f59e0b' : '#4a5568' }} className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums font-bold">{i + 1}</td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums"><span className="text-text font-semibold">{w.name}</span></td>
                      <td style={{ maxWidth: 180 }} className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums overflow-hidden text-ellipsis whitespace-nowrap">{w.url}</td>
                      <td style={{ color: w.response_time_ms > 10000 ? '#f43f5e' : w.response_time_ms > 3000 ? '#f59e0b' : '#10b981' }} className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums font-semibold">
                        {fmt(w.response_time_ms)}
                      </td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums"><StatusBadge status={w.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Legend title={t.mdLegendTitle} items={[
              { k: 'avg', title: t.legAvgTitle, desc: t.legAvgDesc },
              { k: 'rt', title: t.legRtTitle, desc: t.legRtDesc },
              { k: 'rtcolor', title: t.legRtColorTitle, desc: t.legRtColorDesc },
              { k: 'rtrank', title: t.legRtRankTitle, desc: t.legRtRankDesc },
            ]} />
          </div>
        ) : type === 'alerts' ? (
          <div className="flex-1 overflow-auto py-4 px-4.5">
            {sortedList.length === 0 ? (
              <div className="text-center text-[#10b981] text-[14px] py-12 px-0 font-semibold">{t.noActiveAlerts}</div>
            ) : (
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    {renderHeader(t.colWebsite, 'name')}
                    {renderHeader(t.colStatus, 'status')}
                    {renderHeader(t.colIssue, 'status')}
                    {renderHeader(t.colResponse, 'response_time_ms')}
                    {renderHeader(t.colLastCheck, 'last_checked')}
                  </tr>
                </thead>
                <tbody>
                  {sortedList.map((w, i) => (
                    <tr 
                      key={w.id} 
                      onClick={() => handleRowClick(w)}
                      className="border-b border-border cursor-pointer transition-colors duration-200"
                      style={{ 
                        background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)'}
                    >
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums"><span className="text-text font-semibold">{w.name}</span></td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums"><StatusBadge status={w.status} /></td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums">
                        {w.status === 'OFFLINE' ? t.issueUnreachable :
                         w.status === 'CRITICAL' ? t.issueCriticalFail :
                         t.issueStability}
                      </td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums">{fmt(w.response_time_ms)}</td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums">{fmtTime(w.last_checked)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-auto py-4 px-4.5">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    {renderHeader(t.colService, 'name')}
                    {renderHeader(t.colUrl, 'url')}
                    {renderHeader(t.colStatus, 'status')}
                    {renderHeader(t.colHttp, 'status_code')}
                    {renderHeader(t.colResponse, 'response_time_ms')}
                    {renderHeader(t.colSsl, 'ssl_valid')}
                    {renderHeader(t.colLastCheck, 'last_checked')}
                  </tr>
                </thead>
                <tbody>
                  {sortedList.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-6 px-0 text-text-muted text-[12px]">{t.noServicesFound}</td></tr>
                  ) : sortedList.map((w, i) => (
                    <tr 
                      key={w.id} 
                      onClick={() => handleRowClick(w)}
                      className="border-b border-border cursor-pointer transition-colors duration-200"
                      style={{ 
                        background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)'}
                    >
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums"><span className="text-text font-semibold">{w.name}</span></td>
                      <td style={{ maxWidth: 160 }} className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums overflow-hidden text-ellipsis whitespace-nowrap">{w.url}</td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums"><StatusBadge status={w.status} /></td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums">{w.status_code ?? '—'}</td>
                      <td style={{ color: w.response_time_ms > 10000 ? '#f43f5e' : w.response_time_ms > 3000 ? '#f59e0b' : '#10b981' }} className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums">
                        {fmt(w.response_time_ms)}
                      </td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums">{w.ssl_valid == null ? '—' : w.ssl_valid ? '✓' : '✗'}</td>
                      <td className="py-1.75 px-2.5 text-text-sub border-b border-border tabular-nums">{fmtTime(w.last_checked)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Legend title={t.mdLegendTitle} items={[
              { k: 'status', title: t.legStatusTitle, desc: t.legStatusDesc },
              { k: 'http', title: t.legHttpTitle, desc: t.legHttpDesc },
              { k: 'ssl', title: t.legSslTitle, desc: t.legSslDesc },
              { k: 'check', title: t.legCheckTitle, desc: t.legCheckDesc },
            ]} />
          </div>
        )}
      </div>
    </div>
  )
}
