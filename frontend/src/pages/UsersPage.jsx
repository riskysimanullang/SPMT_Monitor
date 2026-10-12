import { useState, useEffect } from 'react'
import { userAPI, userAdminAPI } from '../services/api'
import { useAuth } from '../store/auth'
import { useTheme } from '../store/theme'

import Badge from '../components/common/Badge'

const LOCALE_MAP = { id: 'id-ID', en: 'en-US', zh: 'zh-CN', ja: 'ja-JP', ru: 'ru-RU' }

const RoleBadge = ({ role }) => {
  const map = {
    superadmin: { color: '#8b5cf6', label: 'SUPERADMIN' },
    admin: { color: '#3b82f6', label: 'ADMIN' },
    adminpelindo: { color: '#10b981', label: 'ADMIN PELINDO' },
    viewer: { color: 'var(--text-muted)', label: 'VIEWER' },
  }
  const c = map[role] || map.viewer
  return (
    <span style={{ backgroundColor: `${c.color}15`, color: c.color, borderColor: `${c.color}33` }}
          className="border rounded-[6px] py-1.5 px-3 text-[13px] font-black tracking-wider">
      {c.label}
    </span>
  )
}

export default function UsersPage({ users, onUserUpdate }) {
  const { user: currentUser } = useAuth()
  const { t, lang } = useTheme()
  const locale = LOCALE_MAP[lang] || 'en-US'
  const [showRegister, setShowRegister] = useState(false)
  const [regForm, setRegForm] = useState({ username: '', password: '', email: '', role: 'viewer' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [approveTarget, setApproveTarget] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [regError, setRegError] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  const pendingUsers = users.filter(u => u.status === 'pending')
  const activeUsers = users.filter(u => u.status !== 'pending')
  const adminCount = users.filter(u => u.role === 'admin').length

  const handlePromote = async (userId) => {
    try {
      await userAPI.promote(userId)
      setActionMsg('User promoted to Admin')
      onUserUpdate?.()
      setTimeout(() => setActionMsg(''), 3000)
    } catch (e) {
      setActionMsg(e.response?.data?.error || 'Failed to promote')
      setTimeout(() => setActionMsg(''), 3000)
    }
  }

  const handleDemote = async (userId) => {
    try {
      await userAPI.demote(userId)
      setActionMsg('User demoted to Viewer')
      onUserUpdate?.()
      setTimeout(() => setActionMsg(''), 3000)
    } catch (e) {
      setActionMsg(e.response?.data?.error || 'Failed to demote')
      setTimeout(() => setActionMsg(''), 3000)
    }
  }

  const handleApprove = async (userId) => {
    try {
      await userAdminAPI.approve(userId)
      setApproveTarget(null)
      onUserUpdate?.()
      setActionMsg(t.userApprovedMsg || 'User approved — they can now log in')
      setTimeout(() => setActionMsg(''), 3000)
    } catch (e) {
      setActionMsg(e.response?.data?.error || 'Failed to approve')
      setTimeout(() => setActionMsg(''), 3000)
    }
  }

  const handleReject = async (userId) => {
    try {
      await userAdminAPI.reject(userId)
      setRejectTarget(null)
      onUserUpdate?.()
      setActionMsg(t.userRejectedMsg || 'Registration rejected')
      setTimeout(() => setActionMsg(''), 3000)
    } catch (e) {
      setActionMsg(e.response?.data?.error || 'Failed to reject')
      setTimeout(() => setActionMsg(''), 3000)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setSaving(true); setRegError('')
    try {
      await userAdminAPI.create(regForm)
      setShowRegister(false)
      setRegForm({ username: '', password: '', email: '', role: 'viewer' })
      onUserUpdate?.()
      setActionMsg('User created successfully')
      setTimeout(() => setActionMsg(''), 3000)
    } catch (err) {
      setRegError(err.response?.data?.error || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (userId) => {
    try {
      await userAdminAPI.delete(userId)
      setDeleteTarget(null)
      onUserUpdate?.()
      setActionMsg('User deleted')
      setTimeout(() => setActionMsg(''), 3000)
    } catch (e) {
      setActionMsg(e.response?.data?.error || 'Failed to delete')
      setTimeout(() => setActionMsg(''), 3000)
    }
  }

  return (
    <div className="flex flex-col h-full p-2 gap-2 overflow-hidden bg-bg-main">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-3 shrink-0 pb-2.5">
        <div>
          <div className="text-[26px] font-[1000] text-primary tracking-tight">{t.userManagement}</div>
          <div className="text-[14px] text-text-muted mt-1 font-semibold">
            {users.length} {t.usersLabel}
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto justify-start md:justify-end">
          <button className="bg-gradient-to-br from-[#2563eb] to-[#3b82f6] text-text border-none rounded-lg py-3 px-6 text-[16px] font-black tracking-wider cursor-pointer shadow-[0_4px_12px_rgba(59,130,246,0.3)] w-full md:w-auto" onClick={() => setShowRegister(true)}>
            {t.createUserBtn}
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] rounded-[6px] py-2.5 px-4.5 text-[15px] shrink-0 font-bold">{actionMsg}</div>
      )}

      {/* Pending Registrations — needs admin confirmation */}
      {pendingUsers.length > 0 && (
        <div className="shrink-0 bg-[rgba(245,158,11,0.07)] border border-[rgba(245,158,11,0.35)] rounded-lg py-3.5 px-4 shadow-[0_0_16px_rgba(245,158,11,0.12)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[18px]">🔔</span>
            <span className="font-black text-[#f59e0b] text-[15px] tracking-normal">
              {t.pendingApprovals || 'Pending Registrations'}
            </span>
            <span className="bg-[#f59e0b] text-white text-[12px] font-black rounded-lg py-[1px] px-[9px]">{pendingUsers.length}</span>
          </div>
          <div className="text-[12px] text-text-muted mb-3">
            {t.pendingApprovalsSub || 'New users awaiting your confirmation before they can log in.'}
          </div>
          <div className="flex flex-col gap-2">
            {pendingUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between gap-2.5 bg-bg-card border border-border rounded-lg py-2.5 px-3 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-[18px] shrink-0 bg-[rgba(245,158,11,0.18)] border border-[rgba(245,158,11,0.35)] text-[#f59e0b]">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-text font-bold text-[16px]">{u.username}</div>
                    <div className="text-[12px] text-text-muted whitespace-nowrap overflow-hidden text-ellipsis">
                      {u.email || '—'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.4)] text-[#10b981] rounded-[6px] py-2 px-3.5 text-[14px] cursor-pointer font-black" onClick={() => setApproveTarget(u)} title={t.approveTooltip || 'Approve registration'}>
                    ✓ {t.approveBtn || 'Approve'}
                  </button>
                  <button className="bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.4)] text-[#ef4444] rounded-[6px] py-2 px-3.5 text-[14px] cursor-pointer font-black" onClick={() => setRejectTarget(u)} title={t.rejectTooltip || 'Reject registration'}>
                    ✕ {t.rejectBtn || 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-auto [webkit-overflow-scrolling:touch] bg-bg-card border border-border rounded-lg shadow-shadow">
        {!activeUsers || activeUsers.length === 0 ? (
          <div className="text-center text-text-muted p-12 text-[13px]">{t.noUsersFound}</div>
        ) : (
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className="py-3.5 px-4.5 text-left text-[13px] font-bold text-text-muted tracking-widest border-b-2 border-border bg-bg-header sticky top-0">{t.thUsername}</th>
                <th className="py-3.5 px-4.5 text-left text-[13px] font-bold text-text-muted tracking-widest border-b-2 border-border bg-bg-header sticky top-0">{t.thRole}</th>
                <th className="py-3.5 px-4.5 text-left text-[13px] font-bold text-text-muted tracking-widest border-b-2 border-border bg-bg-header sticky top-0 hide-mobile">{t.thCreatedAt}</th>
                <th className="py-3.5 px-4.5 text-left text-[13px] font-bold text-text-muted tracking-widest border-b-2 border-border bg-bg-header sticky top-0">{t.thActions}</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map(u => (
                <tr key={u.id} className="border-b border-[rgba(99,102,241,0.07)]" style={{
                  background: u.id === currentUser?.id ? 'rgba(59,130,246,0.04)' : '',
                }}>
                  <td className="py-4 px-4.5 text-[17px] text-text-sub">
                    <div className="flex items-center gap-2">
                      <div className="w-11 h-11 rounded-full bg-[rgba(59,130,246,0.2)] border border-[rgba(59,130,246,0.3)] flex items-center justify-center text-[#3b82f6] font-black text-[18px] shrink-0">
                        {u.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-text font-bold text-[17px]">{u.username}</div>
                        {u.id === currentUser?.id && <div className="text-[13px] text-[#6366f1] font-bold">{t.youLabel}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4.5 text-[17px] text-text-sub"><RoleBadge role={u.role} /></td>
                  <td className="hide-mobile py-4 px-4.5 text-text-muted text-[11px]">
                    {new Date(u.created_at).toLocaleString(locale)}
                  </td>
                  <td className="py-4 px-4.5 text-[17px] text-text-sub">
                    {u.role === 'superadmin' ? (
                      <span className="text-text-muted text-[11px]">{t.protectedLabel}</span>
                    ) : u.id === currentUser?.id ? (
                      <span className="text-text-muted text-[11px]">{t.currentUserLabel}</span>
                    ) : (
                      <div className="flex gap-1.5">
                        {u.role === 'viewer' && (
                          <button
                            className="bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] rounded py-1.5 px-3.5 text-[14px] cursor-pointer font-bold"
                            onClick={() => handlePromote(u.id)}
                            title={t.promoteToAdmin}
                          >
                            {t.promoteBtn}
                          </button>
                        )}
                        {u.role === 'admin' && (
                          <button className="bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.3)] text-[#f59e0b] rounded py-1.5 px-3.5 text-[14px] cursor-pointer font-bold" onClick={() => handleDemote(u.id)}>
                            {t.demoteBtn}
                          </button>
                        )}
                        <button className="bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.3)] text-[#ef4444] rounded py-1.5 px-2.5 text-[14px] cursor-pointer" onClick={() => setDeleteTarget(u)}>
                          🗑
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-[1000] backdrop-blur-[4px]">
          <div style={{ width: 'min(320px, 94vw)' }} className="bg-bg-header border border-border rounded-xl max-h-[90vh] overflow-y-auto shadow-shadow p-6 text-center">
            <div className="text-[32px] mb-3">🗑️</div>
            <div className="text-[15px] font-bold text-text mb-2">{t.deleteUserTitle}</div>
            <div className="text-[13px] text-text-sub mb-6 leading-normal">
              {t.deleteUserConfirmPrefix} <strong className="text-text">{deleteTarget.username}</strong>{t.cannotBeUndone}
            </div>
            <div className="flex gap-2 justify-center">
              <button className="bg-bg-card border border-border text-text-sub rounded-lg py-3 px-6 text-[16px] cursor-pointer" onClick={() => setDeleteTarget(null)}>{t.cancel}</button>
              <button style={{ background: '#dc2626' }} className="border-none text-white rounded-lg py-3 px-7 text-[16px] font-black cursor-pointer" onClick={() => handleDelete(deleteTarget.id)}>{t.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirm Modal */}
      {approveTarget && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-[1000] backdrop-blur-[4px]">
          <div style={{ width: 'min(360px, 94vw)' }} className="bg-bg-header border border-border rounded-xl max-h-[90vh] overflow-y-auto shadow-shadow p-6 text-center">
            <div className="text-[32px] mb-3">✅</div>
            <div className="text-[15px] font-bold text-text mb-2">{t.approveUserTitle || 'Approve Registration'}</div>
            <div className="text-[13px] text-text-sub mb-6 leading-normal">
              {t.approveUserConfirmPrefix || 'Allow user'} <strong className="text-text">{approveTarget.username}</strong> {t.approveUserConfirmSuffix || 'to create a new account?'}
            </div>
            <div className="flex gap-2 justify-center">
              <button className="bg-bg-card border border-border text-text-sub rounded-lg py-3 px-6 text-[16px] cursor-pointer" onClick={() => setApproveTarget(null)}>{t.cancel}</button>
              <button style={{ background: '#10b981' }} className="border-none text-white rounded-lg py-3 px-7 text-[16px] font-black cursor-pointer" onClick={() => handleApprove(approveTarget.id)}>{t.approveBtn || 'Approve'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirm Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-[1000] backdrop-blur-[4px]">
          <div style={{ width: 'min(360px, 94vw)' }} className="bg-bg-header border border-border rounded-xl max-h-[90vh] overflow-y-auto shadow-shadow p-6 text-center">
            <div className="text-[32px] mb-3">🚫</div>
            <div className="text-[15px] font-bold text-text mb-2">{t.rejectUserTitle || 'Reject Registration'}</div>
            <div className="text-[13px] text-text-sub mb-6 leading-normal">
              {t.rejectUserConfirmPrefix || 'You are rejecting'} <strong className="text-text">{rejectTarget.username}</strong> {t.rejectUserConfirmSuffix || 'as a new user. Their registration will be removed.'}
            </div>
            <div className="flex gap-2 justify-center">
              <button className="bg-bg-card border border-border text-text-sub rounded-lg py-3 px-6 text-[16px] cursor-pointer" onClick={() => setRejectTarget(null)}>{t.cancel}</button>
              <button style={{ background: '#dc2626' }} className="border-none text-white rounded-lg py-3 px-7 text-[16px] font-black cursor-pointer" onClick={() => handleReject(rejectTarget.id)}>{t.rejectBtn || 'Reject'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-[1000] backdrop-blur-[4px]">
          <div className="bg-bg-header border border-border rounded-xl w-[min(400px,94vw)] max-h-[90vh] overflow-y-auto shadow-shadow">
            <div className="flex items-center justify-between py-3.5 px-5 border-b border-border">
              <span className="text-[14px] font-semibold text-text">{t.createNewUser}</span>
              <button className="bg-none border-none text-text-muted cursor-pointer text-base" onClick={() => setShowRegister(false)}>✕</button>
            </div>
            <form onSubmit={handleRegister} className="p-5">
              <div className="mb-3.5">
                <label className="block text-[13px] font-extrabold text-accent tracking-widest mb-1.5">{t.thUsername}</label>
                <input className="bg-bg-main border border-border rounded-lg py-3 px-4 text-text text-[17px] outline-none w-full" value={regForm.username} onChange={e => setRegForm(f => ({ ...f, username: e.target.value }))} placeholder="username" required />
              </div>
              <div className="mb-3.5">
                <label className="block text-[13px] font-extrabold text-accent tracking-widest mb-1.5">{t.fieldPassword}</label>
                <input className="bg-bg-main border border-border rounded-lg py-3 px-4 text-text text-[17px] outline-none w-full" type="password" value={regForm.password} onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))} placeholder={t.passwordMinPh} required />
              </div>
              <div className="mb-3.5">
                <label className="block text-[13px] font-extrabold text-accent tracking-widest mb-1.5">{t.thRole}</label>
                <select className="bg-bg-main border border-border rounded-lg py-3 px-4 text-text text-[17px] outline-none w-full cursor-pointer" value={regForm.role} onChange={e => setRegForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="viewer">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {regError && <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-[6px] py-3 px-4 text-[#ef4444] text-[15px] mb-3">{regError}</div>}
              <div className="flex gap-2 justify-end">
                <button type="button" className="bg-bg-card border border-border text-text-sub rounded-lg py-3 px-6 text-[16px] cursor-pointer" onClick={() => setShowRegister(false)}>{t.cancel}</button>
                <button type="submit" className="bg-gradient-to-br from-[#2563eb] to-[#3b82f6] border-none text-white rounded-lg py-3 px-7 text-[16px] font-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" disabled={saving}>{saving ? t.creating : t.createUserSubmit}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
