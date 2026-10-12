# Arsitektur Backend Sistem Monitoring

## Tujuan
Mendesain ulang arsitektur backend SPMT agar lebih terstruktur, mudah dipelihara, dan scalable. Fokus pada: service layer, repository, worker pool, notifikasi, WebSocket, dan keamanan.

## Komponen Utama

1. **API Gateway / Router**
   - menerima request HTTP
   - menerapkan middleware (logging, recover, auth, CORS)
   - meneruskan request ke handler
   - meng-host endpoint: auth, websites, incidents, dashboards, notifications, user management, health, metrics

2. **Handler Layer**
   - bertugas menerjemahkan HTTP request menjadi panggilan service
   - validasi request body/parameter
   - menulis response JSON dan error handling
   - men-trigger audit log untuk aksi penting

3. **Service Layer**
   - berisi logika bisnis: autentikasi, manajemen user, manajemen website, status history, SLA, lifecycle insiden
   - menggabungkan validasi input, policy, dan orchestrasi repo/notif/hub
   - berfungsi sebagai boundary antara HTTP dan data persistence

4. **Repository Layer**
   - akses database PostgreSQL melalui `pgxpool`
   - melakukan query SQL dan transaksi
   - menyimpan: users, websites, monitoring_logs, status_events, incidents, incident_comments, incident_history, audit_logs, daily_aggregates
   - menyediakan method atomic seperti `DeleteWebsites` dalam transaction

5. **Worker Pool / Monitoring Engine**
   - melakukan pemeriksaan target website secara berkala
   - memproses DNS/TCP/HTTP/SSL/browser checks
   - menulis hasil ke `monitoring_logs`
   - memicu evaluasi status & incident
   - mendukung manual recheck dan chaos mode untuk testing

6. **Notification Service**
   - mengirim email dan Telegram
   - menjadwalkan report mingguan
   - memproses test email

7. **WebSocket Hub**
   - mengelola koneksi klien realtime
   - broadcast event status/incident ke dashboard
   - memisahkan update realtime dari request-response HTTP tradisional

8. **Config & Infra**
   - pengaturan berasal dari environment `.env`
   - koneksi DB dengan max pool
   - scheduler report dan graceful shutdown

## Alur Sistem Baru

### 1. Startup
- load config
- buka koneksi PostgreSQL
- inisialisasi repository, service, notification, hub, worker pool
- jalankan network service untuk monitoring jarak jauh
- jalankan hub WebSocket
- jalankan worker pool
- jalankan scheduler laporan mingguan
- start HTTP server

### 2. HTTP Request Flow
1. request masuk ke Chi router
2. middleware menjalankan auth/validation
3. handler menerima request
4. handler memanggil service method
5. service memanggil repository dan/atau notification
6. data diambil/disimpan di DB
7. response JSON dikembalikan ke klien

### 3. Monitoring Flow
1. worker pool membaca daftar website
2. setiap website di-check sesuai interval
3. hasil pemeriksaan ditulis ke `monitoring_logs`
4. status terakhir dibandingkan dengan status sebelumnya
5. jika status berubah, insert `status_events`
6. jika perlu, create/update `incidents`
7. event push ke WebSocket dan notifikasi dikirim

### 4. Realtime Update Flow
- status berubah → hub menerima event → broadcast ke semua klien aktif
- klien dashboard menerapkan perubahan tanpa refresh halaman

## Arsitektur Logika Ulang

Komponen baru yang disarankan:

- `backend/cmd/server/main.go`
  - bootstrap service di level aplikasi

- `backend/internal/handler/` (REST API handlers)
  - `auth.go`
  - `websites.go`
  - `incidents.go`
  - `dashboard.go`
  - `users.go`
  - `notifications.go`
  - `system.go`

- `backend/internal/service/` (business logic)
  - `auth.go`
  - `user.go`
  - `website.go`
  - `dashboard.go`
  - `incident.go`
  - `notification.go`
  - `status_event.go`

- `backend/internal/repository/` (DB access)
  - `user.go`
  - `website.go`
  - `monitoring_log.go`
  - `status_event.go`
  - `incident.go`
  - `audit_log.go`
  - `aggregate.go`

- `backend/internal/worker/` (monitoring engine)
  - `pool.go`
  - `task.go`
  - `network.go`

- `backend/internal/websocket/` (realtime)
  - `hub.go`
  - `client.go`

- `backend/internal/notification/`
  - `notification.go`
  - `report.go`

## Design Principles

- **Separation of concerns**: setiap layer punya tanggung jawab jelas.
- **Single source of truth**: data monitoring hanya disimpan di PostgreSQL.
- **Reusability**: service layer bisa dipakai oleh HTTP handler dan worker.
- **Observability**: metrics, health check, audit logs, status events.
- **Graceful shutdown**: worker dan server berhenti secara teratur.

## Manfaat Arsitektur Baru

- lebih mudah diuji dan dikembangkan karena codebase terpisah jelas
- lebih mudah menambahkan fitur baru (dashboard, incident actions, notifikasi)
- backend menjadi lebih robust terhadap error dan shutdown
- event realtime terpisah dari REST sehingga frontend lebih responsif
- data monitoring bisa di-query secara efisien melalui repository layer
