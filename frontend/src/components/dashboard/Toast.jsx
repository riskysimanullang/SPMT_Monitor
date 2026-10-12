import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

// ── Global toast trigger function ──
// Call this from anywhere: showToast('Message', 'success')
// Types: 'success', 'error', 'info', 'warning'
export function showToast(message, type = 'success', duration = 3500) {
  window.dispatchEvent(new CustomEvent('spmt:toast', { detail: { message, type, duration } }))
}

const ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
}

const COLORS = {
  success: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.4)', text: '#059669', bar: '#10b981' },
  error: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.4)', text: '#dc2626', bar: '#ef4444' },
  warning: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.4)', text: '#d97706', bar: '#f59e0b' },
  info: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.4)', text: '#2563eb', bar: '#3b82f6' },
}

function ToastItem({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false)
  const c = COLORS[toast.type] || COLORS.info

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), toast.duration - 400)
    const removeTimer = setTimeout(() => onRemove(toast.id), toast.duration)
    return () => { clearTimeout(timer); clearTimeout(removeTimer) }
  }, [toast, onRemove])

  return (
    <div
      className="flex items-center gap-3 py-3.5 px-5 min-w-[300px] max-w-[480px] backdrop-blur-[20px] border-l-4 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] overflow-hidden relative cursor-pointer border"
      style={{
        background: c.bg,
        borderColor: c.border,
        borderLeftColor: c.bar,
        animation: exiting ? 'toastOut 0.35s ease forwards' : 'toastIn 0.35s ease forwards',
      }}
      onClick={() => { setExiting(true); setTimeout(() => onRemove(toast.id), 350) }}
    >
      <span className="text-xl shrink-0">{ICONS[toast.type]}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-text leading-[1.4]">
          {toast.message}
        </div>
      </div>
      <button className="bg-none border-none text-text-muted cursor-pointer text-[14px] shrink-0 px-0.5">✕</button>

      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-[3px] rounded-bl-xl"
        style={{
          background: c.bar,
          animation: `toastProgress ${toast.duration}ms linear forwards`,
        }}
      />
    </div>
  )
}

let toastIdCounter = 0

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((e) => {
    const { message, type, duration } = e.detail
    const id = ++toastIdCounter
    setToasts(prev => [...prev, { id, message, type, duration }].slice(-5))
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    window.addEventListener('spmt:toast', addToast)
    return () => window.removeEventListener('spmt:toast', addToast)
  }, [addToast])

  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed top-5 right-5 z-[999999] flex flex-col gap-2.5 pointer-events-none">
      <style>{`
        @keyframes toastIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toastOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={removeToast} />
        </div>
      ))}
    </div>,
    document.body
  )
}
