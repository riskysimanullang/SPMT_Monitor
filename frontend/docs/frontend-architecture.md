# Arsitektur Frontend SPMT Monitoring

## Gambaran Umum
Frontend sistem monitoring dibangun menggunakan React + Vite dengan pendekatan component-based architecture. Struktur ini memisahkan halaman, komponen UI, state management, layanan API, dan utilitas agar aplikasi lebih mudah dikembangkan dan dipelihara.

## Struktur Folder Frontend

```text
frontend/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── public/
│   └── images/
│       ├── background/
│       └── logos/
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── pages/
    │   ├── LoginPage.jsx
    │   ├── DashboardPage.jsx
    │   ├── WebsitesPage.jsx
    │   ├── UsersPage.jsx
    │   └── ActivityLogPage.jsx
    ├── components/
    │   ├── common/
    │   │   ├── Badge.jsx
    │   │   ├── GoogleSignInButton.jsx
    │   │   ├── StatusBadgeIcon.jsx
    │   │   └── VideoBackground.jsx
    │   ├── dashboard/
    │   │   ├── TopBar.jsx
    │   │   ├── StatusPanel.jsx
    │   │   ├── MonitoringGraph.jsx
    │   │   ├── ServiceDetailModal.jsx
    │   │   ├── ServerDetailModal.jsx
    │   │   ├── MetricDetailModal.jsx
    │   │   ├── NotificationBell.jsx
    │   │   └── Toast.jsx
    │   └── topology/
    │       └── NetworkTopology.jsx
    ├── store/
    │   ├── auth.jsx
    │   ├── theme.jsx
    │   └── WebSocketContext.jsx
    ├── services/
    │   └── api.js
    ├── hooks/
    │   └── useBreakpoint.js
    └── utils/
        ├── favicon.js
        └── rootCause.js
```

## Komponen Utama

### 1. Entry Point
- `src/main.jsx` → bootstrap aplikasi React.
- `src/App.jsx` → mengatur routing halaman dan provider global.

### 2. Halaman (Pages)
- `LoginPage.jsx` → halaman login, otentikasi user.
- `DashboardPage.jsx` → halaman utama monitoring, menampilkan status layanan real-time.
- `WebsitesPage.jsx` → manajemen data website yang dimonitor.
- `UsersPage.jsx` → manajemen akun pengguna dan role.
- `ActivityLogPage.jsx` → histori aktivitas monitoring.

### 3. Komponen UI
- `components/common/` → komponen reusable umum.
- `components/dashboard/` → elemen dashboard seperti top bar, status panel, grafik, modal detail, notifikasi.
- `components/topology/` → visualisasi hubungan antar layanan/website.

### 4. State Management
- `store/auth.jsx` → autentikasi user dan token JWT.
- `store/theme.jsx` → tema dan bahasa UI.
- `store/WebSocketContext.jsx` → koneksi realtime dan event broadcast.

### 5. Layanan API
- `services/api.js` → wrapper request HTTP ke backend menggunakan Axios.
- Menangani request REST, token JWT, dan endpoint WebSocket.

### 6. Hook dan Utilitas
- `hooks/useBreakpoint.js` → responsive layout berdasarkan ukuran layar.
- `utils/favicon.js` → pengaturan favicon.
- `utils/rootCause.js` → membantu menampilkan penyebab masalah secara lebih rapi.

## Alur Kerja Frontend

1. Aplikasi dimulai dari `main.jsx`.
2. `App.jsx` menginisialisasi provider global dan menentukan halaman aktif.
3. Halaman memanggil data melalui `services/api.js`.
4. Data hasil API ditampilkan oleh komponen dashboard yang terpisah.
5. Jika ada perubahan status realtime, `WebSocketContext` menerima event dan mengupdate UI tanpa refresh halaman.

## Kelebihan Struktur Ini
- modular dan terorganisir
- komponen mudah digunakan ulang
- memisahkan tampilan, state, API, dan utilitas
- cocok untuk pengembangan fitur monitoring realtime

## Kesimpulan
Arsitektur frontend SPMT Monitoring didesain agar pengguna dapat melihat data monitoring secara interaktif, cepat, dan real-time, dengan pemisahan concern yang jelas antara halaman, komponen, state, dan layanan data.