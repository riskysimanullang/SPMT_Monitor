import { useEffect, useRef, useCallback } from 'react'

// Tombol resmi "Sign in with Google" memakai Google Identity Services (GIS).
// Skrip GIS dimuat langsung dari Google (tanpa dependency npm). Komponen ini
// merender tombol Google dan memanggil `onCredential(idToken)` saat user memilih
// akunnya. Bila VITE_GOOGLE_CLIENT_ID belum diset, komponen tidak menampilkan
// apa pun — sehingga aplikasi tetap berjalan normal tanpa konfigurasi Google.

const GSI_SRC = 'https://accounts.google.com/gsi/client'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()

    const existing = document.querySelector(`script[src="${GSI_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('GSI load error')))
      return
    }

    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('GSI load error'))
    document.head.appendChild(script)
  })
}

export default function GoogleSignInButton({ onCredential, text = 'continue_with' }) {
  const ref = useRef(null)
  // Simpan callback di ref agar tidak memicu re-init tombol setiap render.
  const cbRef = useRef(onCredential)
  cbRef.current = onCredential

  const handleResponse = useCallback((response) => {
    if (response?.credential) cbRef.current?.(response.credential)
  }, [])

  useEffect(() => {
    if (!CLIENT_ID) return
    let cancelled = false

    loadGsiScript()
      .then(() => {
        if (cancelled || !ref.current || !window.google?.accounts?.id) return

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: handleResponse,
        })

        // Lebar tombol mengikuti lebar kontainer (form), dibatasi 200–400px
        // sesuai batas GSI agar pas di HP maupun desktop.
        const w = Math.max(200, Math.min(400, Math.floor(ref.current.offsetWidth || 300)))

        ref.current.innerHTML = ''
        window.google.accounts.id.renderButton(ref.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text, // 'signin_with' | 'signup_with' | 'continue_with'
          shape: 'pill',
          logo_alignment: 'left',
          width: w,
        })
      })
      .catch(() => {
        /* gagal memuat GSI (mis. offline) — abaikan, tombol tidak tampil */
      })

    return () => { cancelled = true }
  }, [handleResponse, text])

  if (!CLIENT_ID) return null
  return <div ref={ref} style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: 44 }} />
}
