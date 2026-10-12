import { useState } from 'react'
import { websiteAPI } from '../services/api'
import { useAuth } from '../store/auth'
import { useTheme } from '../store/theme'
import Badge from '../components/common/Badge'

const LOCALE_MAP = { id: 'id-ID', en: 'en-US', zh: 'zh-CN', ja: 'ja-JP', ru: 'ru-RU' }

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-[rgba(15,23,42,0.45)] flex items-center justify-center z-[9999] backdrop-blur-[4px]" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="bg-bg-header border border-border rounded-2xl w-[min(450px,94vw)] max-h-[90vh] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden">
      <div className="flex items-center justify-between py-4 px-5 border-b border-border bg-bg-header shrink-0">
        <span className="text-[16px] font-black text-text tracking-tight">{title}</span>
        <button className="bg-none border-none text-text-muted text-[20px] cursor-pointer" onClick={onClose}>✕</button>
      </div>
      <div className="pt-5 pb-6 px-6 overflow-y-auto">{children}</div>
    </div>
  </div>
)

const Input = ({ label, ...props }) => (
  <div className="flex flex-col gap-1.5 mb-3.5">
    <label className="text-[11px] font-extrabold text-text-sub tracking-wider mb-1">{label}</label>
    <input className="bg-bg-main border border-border rounded-lg py-2.5 px-3.5 text-text text-[13px] outline-none w-full transition-all duration-150" {...props} />
  </div>
)

const Select = ({ label, options, value, onChange, currentLabel = 'Seconds (Current)', ...props }) => {
  const exists = options.some(opt => opt.val === value)
  return (
    <div className="flex flex-col gap-1.5 mb-3.5">
      <label className="text-[11px] font-extrabold text-text-sub tracking-wider mb-1">{label}</label>
      <select
        className="bg-bg-main border border-border rounded-lg py-2.5 px-3.5 text-text text-[13px] outline-none w-full transition-all duration-150 cursor-pointer"
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        {...props}
      >
        {!exists && value && <option value={value}>{value} {currentLabel}</option>}
        {options.map(opt => <option key={opt.val} value={opt.val}>{opt.lbl}</option>)}
      </select>
    </div>
  )
}

const Textarea = ({ label, ...props }) => (
  <div className="flex flex-col gap-1.5 mb-3.5">
    <label className="text-[11px] font-extrabold text-text-sub tracking-wider mb-1">{label}</label>
    <textarea className="bg-bg-main border border-border rounded-lg py-2.5 px-3.5 text-text text-[13px] outline-none w-full transition-all duration-150 h-[70px] resize-none" {...props} />
  </div>
)

export default function WebsitesPage({ websites, onWebsiteUpdate }) {
  const { isAdmin } = useAuth()
  const { t, lang } = useTheme()
  const locale = LOCALE_MAP[lang] || 'en-US'
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ name: '', url: '', description: '', interval_seconds: 60, save_screenshot: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [hoveredRow, setHoveredRow] = useState(null)

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkError, setBulkError] = useState('')
  const [confirmText, setConfirmText] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [showRecs, setShowRecs] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('a-z')

  const openAdd = () => {
    setForm({ name: '', url: '', description: '', interval_seconds: 60, save_screenshot: false })
    setError('')
    setShowAdd(true)
  }

  const openEdit = (w) => {
    setForm({ name: w.name, url: w.url, description: w.description, interval_seconds: w.interval_seconds, save_screenshot: false })
    setEditTarget(w)
    setError('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editTarget) {
        await websiteAPI.update(editTarget.id, form)
      } else {
        await websiteAPI.create(form)
      }
      setShowAdd(false)
      setEditTarget(null)
      onWebsiteUpdate?.()
    } catch (err) {
      setError(err.response?.data?.error || t.failedToSave)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await websiteAPI.delete(deleteTarget.id)
      setSelectedIds(prev => { const next = new Set(prev); next.delete(deleteTarget.id); return next })
      setDeleteTarget(null)
      onWebsiteUpdate?.()
    } catch (err) {
      console.error(err)
    }
  }

  const filteredWebsites = websites.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          w.url.toLowerCase().includes(searchTerm.toLowerCase())
    
    let matchesStatus = true
    if (statusFilter !== 'ALL') {
      matchesStatus = w.status === statusFilter
    }
    
    return matchesSearch && matchesStatus
  })

  const sortedWebsites = [...filteredWebsites].sort((a, b) => {
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

  const selectedWebsites = websites.filter(w => selectedIds.has(w.id))
  const deletingAll = websites.length > 0 && selectedWebsites.length === websites.length
  const confirmMatches = confirmText.trim().toUpperCase() === (t.bulkDeleteAllKeyword || '').toUpperCase()
  const visibleSelectedCount = sortedWebsites.filter(w => selectedIds.has(w.id)).length
  const allVisibleSelected = sortedWebsites.length > 0 && visibleSelectedCount === sortedWebsites.length
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        sortedWebsites.forEach(w => next.delete(w.id))
      } else {
        sortedWebsites.forEach(w => next.add(w.id))
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const toggleSelectMode = () => {
    setSelectMode(prev => {
      if (prev) setSelectedIds(new Set())
      return !prev
    })
  }

  const handleBulkDelete = async () => {
    const ids = selectedWebsites.map(w => w.id)
    if (ids.length === 0) return
    setBulkDeleting(true)
    setBulkError('')
    try {
      await websiteAPI.bulkDelete(ids)
      setSelectedIds(new Set())
      setShowBulkDelete(false)
      setConfirmText('')
      onWebsiteUpdate?.()
    } catch (err) {
      console.error(err)
      setBulkError(err.response?.data?.error || t.bulkDeleteFailed)
    } finally {
      setBulkDeleting(false)
    }
  }

  const openBulkDelete = () => {
    setBulkError('')
    setConfirmText('')
    setShowBulkDelete(true)
  }

  const recs = searchTerm.length > 0 
    ? websites.filter(w => 
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        w.url.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5)
    : []

  return (
    <div className="flex flex-col h-full py-4 px-5 gap-4 overflow-hidden bg-bg-main">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-3 shrink-0">
        <div>
          <div className="text-[24px] font-black text-text tracking-tight">{t.websiteManagement}</div>
          <div className="text-[12px] text-text-muted mt-0.5">{websites.length} / 100 {t.websitesConfigured}</div>
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto justify-start md:justify-end">
          <div className="relative w-[300px] max-w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] opacity-50">🔍</span>
            <input 
              className="w-full py-2.5 pr-9 pl-8 rounded-lg border border-border bg-bg-card text-text text-[12px] outline-none transition-all duration-200 [box-shadow:inset_0_1px_2px_rgba(0,0,0,0.02)]" 
              placeholder={t.searchWebsiteUrl}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowRecs(true)
              }}
              onFocus={() => setShowRecs(true)}
              onBlur={() => setTimeout(() => setShowRecs(false), 200)}
            />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-none border-none text-text-muted cursor-pointer text-[10px] p-1">✕</button>}
            
            {showRecs && recs.length > 0 && (
              <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-bg-card border border-border rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.15)] z-[1000] overflow-hidden">
                <div className="py-2 px-3 text-[8px] font-black text-accent tracking-widest bg-[rgba(99,102,241,0.03)] border-b border-border">{t.recommendations}</div>
                {recs.map(r => (
                  <div 
                    key={r.id} 
                    className="py-2 px-3 cursor-pointer transition-all duration-150 border-b border-[rgba(99,102,241,0.04)] hover:bg-[rgba(99,102,241,0.05)]"
                    onClick={() => {
                      setSearchTerm(r.name)
                      setShowRecs(false)
                    }}
                  >
                    <div className="text-[12px] font-bold text-text">
                      {r.name.toLowerCase().includes(searchTerm.toLowerCase()) ? (
                        <>
                          {r.name.substring(0, r.name.toLowerCase().indexOf(searchTerm.toLowerCase()))}
                          <mark className="bg-accent-light text-accent py-0 px-[1px] rounded-[2px]">{r.name.substring(r.name.toLowerCase().indexOf(searchTerm.toLowerCase()), r.name.toLowerCase().indexOf(searchTerm.toLowerCase()) + searchTerm.length)}</mark>
                          {r.name.substring(r.name.toLowerCase().indexOf(searchTerm.toLowerCase()) + searchTerm.length)}
                        </>
                      ) : r.name}
                    </div>
                    <div className="text-[9px] text-text-muted mt-0.5">{r.url}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-[12px] pointer-events-none">🚦</span>
            <select
              className="py-2.5 pr-3 pl-7 rounded-lg border border-border bg-bg-card text-text text-[12px] font-semibold outline-none cursor-pointer transition-all duration-200 [box-shadow:inset_0_1px_2px_rgba(0,0,0,0.02)]"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">{t.allStatus}</option>
              <option value="ONLINE">🟢 {t.online}</option>
              <option value="CRITICAL">🟡 {t.critical}</option>
              <option value="OFFLINE">🔴 {t.offline}</option>
            </select>
          </div>

          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-[12px] pointer-events-none">↕️</span>
            <select
              className="py-2.5 pr-3 pl-7 rounded-lg border border-border bg-bg-card text-text text-[12px] font-semibold outline-none cursor-pointer transition-all duration-200 [box-shadow:inset_0_1px_2px_rgba(0,0,0,0.02)]"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="a-z">{t.sortNameAz}</option>
              <option value="z-a">{t.sortNameZa}</option>
              <option value="newest">{t.sortNewestCreated}</option>
              <option value="oldest">{t.sortOldestCreated}</option>
            </select>
          </div>

          {isAdmin && (
            <button 
              style={{ 
                opacity: websites.length >= 100 ? 0.5 : 1,
                cursor: websites.length >= 100 ? 'not-allowed' : 'pointer'
              }} 
              className="bg-gradient-to-br from-[#2563eb] to-[#3b82f6] text-white border-none rounded-lg py-2.5 px-4 text-[13px] font-bold shadow-[0_4px_12px_rgba(59,130,246,0.25)] transition-all duration-150"
              onClick={websites.length >= 100 ? null : openAdd}
              title={websites.length >= 100 ? t.limitReachedTitle : t.addNewWebsiteTitle}
            >
              {websites.length >= 100 ? t.limitReached : t.addWebsiteBtn}
            </button>
          )}
        </div>
      </div>

      {isAdmin && selectMode && selectedWebsites.length > 0 && (
        <div className="flex items-center justify-between py-2.5 px-4 bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.2)] rounded-lg shrink-0">
          <div className="flex items-center gap-2.5 text-[13px] font-bold text-text">
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 bg-gradient-to-br from-[#2563eb] to-[#3b82f6] text-white rounded-[11px] text-[12px] font-black">{selectedWebsites.length}</span>
            <span>{selectedWebsites.length} {t.selectedSuffix}</span>
          </div>
          <div className="flex gap-2">
            <button className="bg-bg-card border border-border text-text-sub rounded-lg py-2 px-4 text-[12px] font-bold cursor-pointer transition-all duration-150" onClick={clearSelection}>{t.clearSelectionBtn}</button>
            <button className="bg-gradient-to-br from-[#dc2626] to-[#ef4444] border-none text-white rounded-lg py-2 px-4 text-[12px] font-bold cursor-pointer shadow-[0_4px_12px_rgba(239,68,68,0.25)] transition-all duration-150" onClick={openBulkDelete}>🗑️ {t.deleteSelectedBtn}</button>
          </div>
        </div>
      )}

      <div className="website-table-container flex-1 overflow-y-auto overflow-x-auto [webkit-overflow-scrolling:touch] bg-bg-card border border-border rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        {websites.length === 0 ? (
          <div className="text-center text-[#4a5568] py-16 px-6 text-[13px]">{t.noWebsitesConfigured} {isAdmin && t.clickAddWebsite}</div>
        ) : sortedWebsites.length === 0 ? (
          <div className="text-center text-[#4a5568] py-16 px-6 text-[13px]">
            <div className="text-[32px] mb-3">🔍</div>
            {t.noWebsitesMatch}
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setSortBy('a-z') }}
              className="block my-3 mx-auto bg-none border-none text-primary cursor-pointer font-bold"
            >
              {t.resetFilters}
            </button>
          </div>
        ) : (
          <table className="website-table w-full min-w-[820px] border-collapse">
            <thead>
              <tr>
                <th style={{ width: '16%' }} className="py-3.5 px-4 text-center text-[11px] font-black text-text-sub tracking-wider border-b border-border bg-bg-header sticky top-0 z-10">{t.thWebsite}</th>
                <th style={{ width: '16%' }} className="py-3.5 px-4 text-center text-[11px] font-black text-text-sub tracking-wider border-b border-border bg-bg-header sticky top-0 z-10">{t.thUrlEndpoint}</th>
                <th style={{ width: '7%' }} className="py-3.5 px-4 text-center text-[11px] font-black text-text-sub tracking-wider border-b border-border bg-bg-header sticky top-0 z-10">{t.thInterval}</th>
                <th style={{ width: '10%' }} className="py-3.5 px-4 text-center text-[11px] font-black text-text-sub tracking-wider border-b border-border bg-bg-header sticky top-0 z-10">{t.thStatus}</th>
                <th style={{ width: '11%' }} className="py-3.5 px-4 text-center text-[11px] font-black text-text-sub tracking-wider border-b border-border bg-bg-header sticky top-0 z-10">{t.thHealth}</th>
                <th style={{ width: '8%' }} className="py-3.5 px-4 text-center text-[11px] font-black text-text-sub tracking-wider border-b border-border bg-bg-header sticky top-0 z-10">{t.thLatency}</th>
                <th style={{ width: '6%' }} className="py-3.5 px-4 text-center text-[11px] font-black text-text-sub tracking-wider border-b border-border bg-bg-header sticky top-0 z-10">{t.thHttp}</th>
                <th style={{ width: '10%' }} className="py-3.5 px-4 text-center text-[11px] font-black text-text-sub tracking-wider border-b border-border bg-bg-header sticky top-0 z-10">{t.thSsl}</th>
                <th style={{ width: '13%' }} className="py-3.5 px-4 text-center text-[11px] font-black text-text-sub tracking-wider border-b border-border bg-bg-header sticky top-0 z-10">{t.thNetLatencies}</th>
                {isAdmin && (
                  <th style={{ width: '13%' }} className="py-3.5 px-4 text-center text-[11px] font-black text-text-sub tracking-wider border-b border-border bg-bg-header sticky top-0 z-10">
                    <div className="inline-flex items-center gap-2 justify-center">
                      {selectMode && (
                        <input
                          type="checkbox"
                          className="w-4 h-4 cursor-pointer accent-[#3b82f6] align-middle"
                          checked={allVisibleSelected}
                          ref={el => { if (el) el.indeterminate = someVisibleSelected }}
                          onChange={toggleSelectAll}
                          title={t.selectAllTitle}
                        />
                      )}
                      <span>{t.thActions}</span>
                      <button
                        className={`inline-flex items-center justify-center w-[22px] h-[22px] p-0 leading-none text-[16px] font-black bg-transparent border border-transparent rounded-[6px] text-text-sub cursor-pointer transition-all duration-150 ${selectMode ? 'bg-[rgba(59,130,246,0.1)] border-[rgba(59,130,246,0.3)] text-[#3b82f6]' : ''}`}
                        onClick={toggleSelectMode}
                        title={t.selectMode}
                      >⋮</button>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedWebsites.map(w => (
                <tr 
                  key={w.id} 
                  onMouseEnter={() => setHoveredRow(w.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className="border-b border-border transition-colors duration-200"
                  style={{
                    background: selectedIds.has(w.id)
                      ? 'rgba(59,130,246,0.08)'
                      : hoveredRow === w.id ? 'rgba(99,102,241,0.04)' : 'transparent'
                  }}
                >
                  <td className="py-3 px-3.5 text-[13px] text-text-muted align-middle">
                    <div className="flex flex-col gap-0.5">
                      <div className="font-extrabold text-text text-[15px] tracking-tight">
                        {w.name}
                      </div>
                      {w.description && (
                        <div className="text-[11px] text-text-muted mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px] italic" title={w.description}>
                          {w.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-[13px] text-text-muted align-middle">
                    <div className="flex flex-col gap-0.5">
                      <a href={w.url} target="_blank" rel="noreferrer" className="text-[#3b82f6] no-underline text-[13px] [word-break:break-all] font-semibold hover:underline" title={w.url}>
                        {w.url} ↗
                      </a>
                      <span className="text-[10px] text-text-muted">
                        IP: <strong className="font-mono">{w.ip_address || '—'}</strong>
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-[13px] text-text-muted align-middle">
                    <div className="text-center text-[13px] font-black text-text-sub">
                      {w.interval_seconds}s
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-[13px] text-text-muted align-middle">
                    <div className="flex justify-center">
                      <Badge status={w.status} />
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-[13px] text-text-muted align-middle">
                    <div className="flex flex-col items-center gap-1">
                      <span style={{ 
                        color: w.health_score >= 80 ? '#10b981' : w.health_score >= 50 ? '#f59e0b' : '#ef4444' 
                      }} className="font-black text-[13px]">
                        {w.health_score != null ? `${w.health_score}%` : '—'}
                      </span>
                      {w.health_score != null && (
                        <div className="w-[60px] h-[5px] bg-[rgba(255,255,255,0.08)] rounded-[2.5px] overflow-hidden">
                          <div style={{ 
                            width: `${w.health_score}%`, 
                            background: w.health_score >= 80 ? '#10b981' : w.health_score >= 50 ? '#f59e0b' : '#ef4444'
                          }} className="h-full rounded-[2.5px]" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-[13px] text-text-muted align-middle">
                    <div className="flex justify-center">
                      <span style={{ 
                        color: w.response_time_ms > 2500 ? '#f59e0b' : w.response_time_ms > 0 ? '#10b981' : 'var(--text-muted)',
                        background: w.response_time_ms > 2500 ? 'rgba(245,158,11,0.08)' : w.response_time_ms > 0 ? 'rgba(16,185,129,0.08)' : 'transparent',
                        border: w.response_time_ms > 0 ? `1px solid ${w.response_time_ms > 2500 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}` : 'none'
                      }} className="text-[13px] font-extrabold py-1 px-2 rounded-md">
                        {w.response_time_ms != null ? `${w.response_time_ms}ms` : '—'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-[13px] text-text-muted align-middle">
                    <div className="flex justify-center">
                      <span style={{ 
                        color: w.status_code >= 400 ? '#ef4444' : w.status_code >= 200 ? '#10b981' : 'var(--text-muted)',
                        background: w.status_code >= 400 ? 'rgba(239,68,68,0.08)' : w.status_code >= 200 ? 'rgba(16,185,129,0.08)' : 'transparent',
                        border: w.status_code > 0 ? `1px solid ${w.status_code >= 400 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}` : 'none'
                      }} className="text-[13px] font-extrabold py-1 px-2 rounded-md">
                        {w.status_code ?? '—'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-[13px] text-text-muted align-middle">
                    <div className="flex flex-col items-center gap-0.5">
                      <span style={{ 
                        color: w.ssl_valid ? '#10b981' : w.ssl_valid === false ? '#ef4444' : 'var(--text-muted)'
                      }} className="font-bold text-[13px] inline-flex items-center gap-1">
                        {w.ssl_valid ? `🔒 ${t.validLabel}` : w.ssl_valid === false ? `🔓 ${t.invalidLabel}` : '—'}
                      </span>
                      {w.ssl_expiry_date && (
                        <span className="text-text-muted text-[10px]">
                          {t.exp}: {new Date(w.ssl_expiry_date).toLocaleDateString(locale)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-[13px] text-text-muted align-middle">
                    <div className="flex flex-col items-center gap-0.5 text-[11px] text-text-muted">
                      <div className="flex gap-1.5">
                        <span>DNS: <strong>{w.dns_latency_ms ?? '0'}ms</strong></span>
                        <span>•</span>
                        <span>TLS: <strong>{w.tls_latency_ms ?? '0'}ms</strong></span>
                      </div>
                      <div>
                        <span>TTFB: <strong>{w.ttfb_latency_ms ?? '0'}ms</strong></span>
                      </div>
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-3.5 text-[13px] text-text-muted align-middle">
                      <div className="flex gap-1.5 justify-center items-center">
                        <button className="bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.2)] text-[#3b82f6] rounded-md py-1.5 px-3 text-[12px] cursor-pointer font-bold transition-all duration-150" onClick={() => openEdit(w)}>✏️ {t.editBtn}</button>
                        <button className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] rounded-md py-1.5 px-3 text-[12px] cursor-pointer font-bold transition-all duration-150" onClick={() => setDeleteTarget(w)}>🗑️ {t.deleteBtn}</button>
                        {selectMode && (
                          <input
                            type="checkbox"
                            className="w-4 h-4 cursor-pointer accent-[#3b82f6] align-middle"
                            checked={selectedIds.has(w.id)}
                            onChange={() => toggleSelect(w.id)}
                          />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(showAdd || editTarget) && (
        <Modal title={editTarget ? t.editWebsiteTitle : t.addWebsiteModalTitle} onClose={() => { setShowAdd(false); setEditTarget(null) }}>
          <form onSubmit={handleSave}>
            <Input label={t.fieldName} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t.fieldNamePh} required />
            <Input label={t.fieldUrl} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://example.com" required />
            <Textarea label={t.fieldDescription} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t.fieldDescriptionPh} />
            <Select
              label={t.fieldInterval}
              currentLabel={t.secondsCurrent}
              value={form.interval_seconds}
              onChange={val => setForm(f => ({ ...f, interval_seconds: val }))}
              options={[
                { val: 30, lbl: t.interval30 },
                { val: 60, lbl: t.interval60 },
                { val: 120, lbl: t.interval120 },
              ]}
            />
            {error && <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg py-2.5 px-3.5 text-[#ef4444] text-[11px] mb-3">{error}</div>}
            <div className="flex gap-2.5 justify-end mt-5">
              <button type="button" className="bg-bg-card border border-border text-text-sub rounded-lg py-2 px-4 text-[12px] cursor-pointer transition-all duration-150" onClick={() => { setShowAdd(false); setEditTarget(null) }}>{t.cancel}</button>
              <button type="submit" className="bg-gradient-to-br from-[#2563eb] to-[#3b82f6] border-none text-white rounded-lg py-2.5 px-[20px] text-[12px] font-bold cursor-pointer transition-all duration-150" disabled={saving}>{saving ? t.saving : t.saveBtn}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title={t.confirmDeleteTitle} onClose={() => setDeleteTarget(null)}>
          <p className="text-text-muted mb-5 text-[13px] leading-normal">
            {t.deleteConfirmPrefix} <strong className="text-text">{deleteTarget.name}</strong>{t.deleteConfirmSuffix}
          </p>
          <div className="flex gap-2.5 justify-end">
            <button className="bg-bg-card border border-border text-text-sub rounded-lg py-2 px-4 text-[12px] cursor-pointer transition-all duration-150" onClick={() => setDeleteTarget(null)}>{t.cancel}</button>
            <button style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }} className="border-none text-white rounded-lg py-2.5 px-[20px] text-[12px] font-bold cursor-pointer transition-all duration-150" onClick={handleDelete}>{t.delete}</button>
          </div>
        </Modal>
      )}

      {showBulkDelete && selectedWebsites.length > 0 && (
        <Modal title={t.bulkDeleteTitle} onClose={() => !bulkDeleting && setShowBulkDelete(false)}>
          <p className="text-text-muted mb-5 text-[13px] leading-normal">
            {t.deleteConfirmPrefix} <strong className="text-text">{selectedWebsites.length}</strong> {t.bulkDeleteUnit}{t.deleteConfirmSuffix}
          </p>
          <div className="max-h-[180px] overflow-y-auto mb-5 border border-border rounded-lg">
            {selectedWebsites.map(w => (
              <div key={w.id} className="py-2 px-3 text-[12px] text-text-sub border-b border-border flex justify-between gap-2.5 items-center">
                <strong className="text-text whitespace-nowrap">{w.name}</strong>
                <span className="text-text-muted text-[11px] overflow-hidden text-ellipsis whitespace-nowrap" title={w.url}>{w.url}</span>
              </div>
            ))}
          </div>

          {deletingAll && (
            <>
              <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg py-2.5 px-3.5 text-[#ef4444] text-[12px] font-semibold leading-normal mb-3.5">⚠️ {t.bulkDeleteAllWarning}</div>
              <label className="block text-[12px] text-text-sub mb-1.5 leading-normal">
                {t.bulkConfirmTypePrefix} <strong className="text-[#ef4444] tracking-wide">{t.bulkDeleteAllKeyword}</strong> {t.bulkConfirmTypeSuffix}
              </label>
              <input
                style={{ borderColor: confirmText && !confirmMatches ? 'rgba(239,68,68,0.5)' : 'var(--border)' }}
                className="bg-bg-main border rounded-lg py-2.5 px-3.5 text-text text-[13px] outline-none w-full transition-all duration-150 mb-1"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={t.bulkDeleteAllKeyword}
                disabled={bulkDeleting}
                autoFocus
              />
            </>
          )}

          {bulkError && <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg py-3 px-4 text-[#ef4444] text-[15px] mt-3 mb-0">{bulkError}</div>}

          <div className="flex gap-2.5 justify-end mt-5">
            <button className="bg-bg-card border border-border text-text-sub rounded-lg py-2 px-4 text-[12px] cursor-pointer transition-all duration-150" onClick={() => setShowBulkDelete(false)} disabled={bulkDeleting}>{t.cancel}</button>
            <button
              style={{
                background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                opacity: (bulkDeleting || (deletingAll && !confirmMatches)) ? 0.5 : 1,
                cursor: (bulkDeleting || (deletingAll && !confirmMatches)) ? 'not-allowed' : 'pointer',
              }}
              className="border-none text-white rounded-lg py-2.5 px-[20px] text-[12px] font-bold cursor-pointer transition-all duration-150"
              onClick={handleBulkDelete}
              disabled={bulkDeleting || (deletingAll && !confirmMatches)}
            >
              {bulkDeleting ? t.processing : (deletingAll ? t.deleteAllBtn : t.delete)}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
