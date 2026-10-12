# Backend Module Specification

Dokumen ini menjelaskan spesifikasi modul file untuk arsitektur backend yang disarankan, termasuk struktur folder dan tanggung jawab setiap modul.

## Tujuan
Menyediakan panduan implementasi ulang backend dengan pembagian modul yang jelas dan mudah dipelihara. Tujuannya adalah memisahkan concern: HTTP handling, business logic, persistence, worker monitoring, websocket, dan notifikasi.

## Struktur Folder yang Disarankan

```
backend/
  cmd/
    server/
      main.go
  internal/
    config/
      config.go
    handler/
      auth.go
      website.go
      dashboard.go
      incident.go
      user.go
      notification.go
      system.go
      websocket.go
    service/
      auth.go
      user.go
      website.go
      dashboard.go
      incident.go
      notification.go
      status_event.go
      network.go
    repository/
      user.go
      website.go
      monitoring_log.go
      status_event.go
      incident.go
      audit_log.go
      aggregate.go
      repository.go
    worker/
      pool.go
      task.go
      network.go
      retention.go
      system_metrics.go
    websocket/
      hub.go
      client.go
    notification/
      notification.go
      report.go
    middleware/
      auth.go
      logging.go
      recovery.go
    metrics/
      metrics.go
    model/
      model.go
```

## Modul dan Tanggung Jawab

### `cmd/server/main.go`
- Bootstrap aplikasi
- Load config
- Inisialisasi koneksi database
- Inisialisasi repository/service/notification/hub/worker
- Jalankan HTTP server dan graceful shutdown

### `internal/config/config.go`
- Membaca environment variables
- Menyimpan konfigurasi server, database, JWT, Turnstile, Telegram, SMTP, CORS, dsb.

### `internal/handler/` (HTTP API)
- Menerjemahkan request HTTP ke service
- Validasi input request
- Menangani error dan response JSON
- Men-trigger audit log di beberapa handler

Modul handler yang disarankan:
- `auth.go`: login, logout, Google login, token refresh
- `website.go`: CRUD website, recheck, public site list
- `dashboard.go`: summary, history, status distribution, SLA
- `incident.go`: incident list/detail/comment/history/action
- `user.go`: user management, promote/demote, approval, profile
- `notification.go`: unread count, mark read, test email
- `system.go`: health, metrics, chaos toggle, weekly report trigger
- `websocket.go`: WebSocket endpoint serve

### `internal/service/` (Business Logic)
- Validasi kompleks dan policy
- Orkestrasi antara repository, notification, hub
- Token JWT generation dan Turnstile verification
- Google OAuth login logic

Modul service yang disarankan:
- `auth.go`: Login, Google login, generateToken, password change
- `user.go`: Get users, create/suspend/approve/reject, promote/demote
- `website.go`: Get/Create/Update/Delete website, URL validation
- `dashboard.go`: dashboard summary, status history, status distribution, SLA
- `incident.go`: incident lifecycle, comments, history
- `notification.go`: mark read, unread count, test email
- `status_event.go`: status event queries
- `network.go`: network-level monitoring orchestration

### `internal/repository/` (Data Access)
- Semua query SQL dan transaksi database
- Abstraksi `pgxpool.Pool`
- Handle scanning rows ke model

Modul repository yang disarankan:
- `user.go`: user CRUD/query, role/status update
- `website.go`: website CRUD/query, website summary, website detail
- `monitoring_log.go`: insert log, latest log, log history
- `status_event.go`: insert event, query event history
- `incident.go`: incident CRUD, comments, history
- `audit_log.go`: insert audit log
- `aggregate.go`: daily aggregates, SLA queries
- `repository.go`: konstruktor dan utilitas DB umum

### `internal/worker/` (Monitoring Engine)
- Menjalankan tugas monitoring rutin
- Menyinkronkan website dengan worker yang sesuai
- Menangani chaos mode dan recheck manual

Modul worker yang disarankan:
- `pool.go`: manajemen pool worker, restart website, stop/start
- `task.go`: definisi tugas monitoring sederhana
- `network.go`: pembacaan network dan validasi target
- `retention.go`: jadwal retention/cleanup data
- `system_metrics.go`: laporan kesehatan pool

### `internal/websocket/`
- Hub WebSocket dengan broadcast
- Client connection management
- Event routing untuk update realtime

Modul yang disarankan:
- `hub.go`: core WebSocket hub, register/unregister, broadcast
- `client.go`: client lifecycle dan message handling

### `internal/notification/`
- Pengiriman email, Telegram, report scheduler
- Test email dan weekly report

Modul yang disarankan:
- `notification.go`: email/Telegram send, helper message
- `report.go`: jadwal dan rendering laporan mingguan

### `internal/middleware/`
- Middleware HTTP reusable
- Auth JWT validation, role enforcement, logging, recovery

Modul yang disarankan:
- `auth.go`: JWT parsing, role checks
- `logging.go`: request logging
- `recovery.go`: panic recovery

### `internal/metrics/`
- Mengumpulkan dan expose Prometheus metrics
- HTTP metrics, request counters, worker health

### `internal/model/`
- Definisi struktur data bersama
- DTO, entity model, response model, request payload

## Mapping ke Kode Saat Ini

Beberapa file saat ini sudah cocok dengan struktur ini dan dapat dipisah menjadi modul:

- `internal/handler/handler.go` → bisa dipecah menjadi `auth.go`, `website.go`, `dashboard.go`, `incident.go`, `user.go`, `notification.go`, `system.go`, `websocket.go`
- `internal/service/service.go` → bisa dipecah menjadi `auth.go`, `user.go`, `website.go`, `dashboard.go`, `incident.go`, `notification.go`, `status_event.go`
- `internal/repository/repository.go` → bisa dipecah menjadi `user.go`, `website.go`, `monitoring_log.go`, `status_event.go`, `incident.go`, `audit_log.go`, `aggregate.go`
- `internal/websocket/hub.go` → sudah sesuai, bisa tambahkan `client.go`
- `internal/worker/pool.go` → sudah sesuai, bisa ditambah `task.go` dan `network.go`

## Detail Modul Baru

### `handler/auth.go`
- `Login`
- `GoogleLogin`
- `Logout`
- `UpdateProfile`
- `ChangePassword`

### `handler/website.go`
- `GetWebsites`
- `CreateWebsite`
- `UpdateWebsite`
- `DeleteWebsite`
- `BulkDeleteWebsites`
- `GetPublicWebsites`
- `RecheckWebsites`
- `GetWebsiteSLA`

### `handler/dashboard.go`
- `GetDashboardSummary`
- `GetSystemHealth`
- `GetStatusHistory`
- `GetWebsiteEvents`
- `GetAllStatusEvents`
- `GetStatusDistribution`

### `handler/incident.go`
- `GetIncidents`
- `GetIncident`
- `GetIncidentComments`
- `AddIncidentComment`
- `GetIncidentHistory`
- `AcknowledgeIncident`
- `AssignIncident`
- `ResolveIncident`
- `ReopenIncident`
- `CloseIncident`

### `handler/user.go`
- `GetUsers`
- `GetPendingUserCount`
- `CreateUser`
- `ApproveUser`
- `RejectUser`
- `PromoteUser`
- `DemoteUser`
- `DeleteUser`

### `handler/notification.go`
- `GetUnreadNotificationCount`
- `MarkAllNotificationsRead`
- `TestEmail`

### `handler/system.go`
- `ToggleChaos`
- `SendWeeklyReportNow`
- `GetTelegramLink`

### `handler/websocket.go`
- `ServeWS`

## Rencana Implementasi

1. Buat folder/file baru sesuai spesifikasi di atas.
2. Pindahkan kode dari file besar `handler.go` ke submodul masing-masing.
3. Pindahkan fungsi service dari `service.go` ke file service spesifik.
4. Pindahkan query dari `repository.go` ke file repository spesifik.
5. Tambah `client.go` di websocket jika diperlukan untuk handling klien.
6. Pastikan semua import di `cmd/server/main.go` diperbarui.

---

Dokumen ini bisa digunakan sebagai blueprint refactor bersama tim, atau sebagai bagian proposal arsitektur backend baru.