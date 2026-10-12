# Dokumentasi Database Sistem Monitoring

## 1. Deskripsi Tugas

Bagian database bertanggung jawab untuk merancang dan mengimplementasikan struktur penyimpanan data yang mendukung sistem monitoring. Database harus mampu menyimpan hasil pemeriksaan layanan secara historis, menyimpan metadata target monitoring, mengelola insiden, menampung notifikasi alert, serta menyimpan data pengguna dan hak akses.

Database juga harus memastikan konsistensi data, performa baca-tulis untuk dashboard real-time, serta kemudahan pemeliharaan dan backup.

## 2. Teknologi yang Digunakan

- PostgreSQL: sistem manajemen basis data relasional utama.
- SQL Migration Files: definisi skema database diletakkan di folder `migrations/`.
- Driver Go: backend Go mengakses database melalui driver PostgreSQL untuk query dan transaksi.
- PgBouncer (direkomendasikan): connection pooling untuk beban tinggi.
- `pg_dump` / `pg_restore`: alat backup dan restore basis data.

## 3. Hasil Kerja

### 3.1 Tabel dan Skema yang Diterapkan

Dokumentasi berikut disusun berdasarkan migrasi PostgreSQL yang ada di folder `backend/migrations/`, yaitu:
- `001_init.sql`
- `002_status_events.sql`
- `003_incident_root_causes.sql`
- `012_audit_logs.sql`
- `013_incident_management.sql`
- `014_daily_aggregates.sql`

Hal ini memastikan bahwa dokumentasi mencerminkan skema yang benar-benar diimplementasikan oleh aplikasi.

#### 1. `users`
- Menyimpan data akun pengguna.
- Kolom utama:
  - `id` UUID primary key.
  - `username` VARCHAR(50), unik.
  - `password_hash` TEXT.
  - `email` VARCHAR(255), unik.
  - `telegram_id` VARCHAR(50).
  - `role` VARCHAR(20), dengan nilai `superadmin`, `admin`, `adminpelindo`, atau `viewer`.
  - `created_at` TIMESTAMPTZ.
- Indeks: `idx_users_username`, `idx_users_role`.

#### 2. `websites`
- Menyimpan target yang dimonitor.
- Kolom utama:
  - `id` UUID primary key.
  - `name` VARCHAR(100).
  - `url` TEXT.
  - `description` TEXT.
  - `interval_seconds` INT default 60.
  - `created_at` TIMESTAMPTZ.
- Indeks: `idx_websites_created_at`, serta constraint unik `websites_url_unique` ditambahkan pada migrasi kedua.

#### 3. `monitoring_logs`
- Menyimpan hasil pemeriksaan monitoring tiap website.
- Kolom utama:
  - `id` UUID primary key.
  - `website_id` UUID foreign key ke `websites(id)`.
  - `checked_at` TIMESTAMPTZ.
  - `dns_resolved` BOOLEAN.
  - `status_code` INT.
  - `response_time_ms` INT.
  - `ssl_valid` BOOLEAN.
  - `error_message` TEXT.
  - `status` VARCHAR(20) dengan constraint status terdefinisi.
  - `tls_latency_ms` INT.
  - `ttfb_latency_ms` INT.
  - `recommendation` TEXT.
  - `health_score` INT default 100.
  - `confidence` INT default 100.
  - `is_browser_ok` BOOLEAN default TRUE.
  - `root_cause` TEXT.
- Indeks: `idx_logs_website_id`, `idx_logs_checked_at`, `idx_logs_website_checked`, `idx_logs_status`, `idx_monitoring_logs_composite`.

#### 4. `status_events`
- Mencatat perubahan status layanan.
- Kolom utama:
  - `id` UUID primary key.
  - `website_id` UUID foreign key ke `websites(id)`.
  - `website_name` VARCHAR(100).
  - `old_status` VARCHAR(20).
  - `new_status` VARCHAR(20).
  - `created_at` TIMESTAMPTZ.
- Indeks: `idx_status_events_website_id`, `idx_status_events_created_at`, `idx_status_events_website_created`.

#### 5. `incident_root_causes`
- Menyimpan data penyebab insiden per status.
- Kolom utama:
  - `id` UUID primary key.
  - `website_id` UUID foreign key ke `websites(id)`.
  - `status` VARCHAR(20).
  - `cause` TEXT.
  - `detail` TEXT.
  - `created_at` TIMESTAMPTZ.
- Indeks: `idx_incident_root_causes_website_id`, `idx_incident_root_causes_created_at`.

#### 6. `incidents`
- Menyimpan insiden dan siklus lifecycle-nya.
- Kolom utama:
  - `id` UUID primary key.
  - `website_id` UUID foreign key ke `websites(id)`.
  - `title` VARCHAR(255).
  - `status` VARCHAR(50) dengan nilai: `TRIGGERED`, `ACKNOWLEDGED`, `INVESTIGATING`, `RESOLVED`, `CLOSED`.
  - `severity` VARCHAR(20)` default `WARNING`.
  - `assigned_user_id` UUID foreign key ke `users(id)`.
  - `created_at` TIMESTAMPTZ.
  - `resolved_at` TIMESTAMPTZ.
  - `closed_at` TIMESTAMPTZ.
- Indeks: `idx_incidents_website_id`, `idx_incidents_status`, `idx_incidents_created_at`.

#### 7. `maintenance_windows`
- Menyimpan jadwal pemeliharaan untuk website.
- Kolom utama:
  - `id` UUID primary key.
  - `website_id` UUID foreign key.
  - `start_time` TIMESTAMPTZ.
  - `end_time` TIMESTAMPTZ.
  - `description` TEXT.
  - `created_by` UUID foreign key ke `users(id)`.
  - `created_at` TIMESTAMPTZ.
- Indeks: `idx_maintenance_windows_range`.

#### 8. `incident_comments`
- Menyimpan komentar pengguna pada insiden.
- Kolom utama:
  - `id` UUID primary key.
  - `incident_id` UUID foreign key ke `incidents(id)`.
  - `user_id` UUID foreign key ke `users(id)`.
  - `username` VARCHAR(50).
  - `comment` TEXT.
  - `created_at` TIMESTAMPTZ.
- Indeks: `idx_incident_comments_incident_id`.

#### 9. `incident_history`
- Menyimpan riwayat aksi pada insiden.
- Kolom utama:
  - `id` UUID primary key.
  - `incident_id` UUID foreign key.
  - `user_id` UUID foreign key.
  - `username` VARCHAR(50).
  - `action` VARCHAR(50).
  - `details` TEXT.
  - `created_at` TIMESTAMPTZ.
- Indeks: `idx_incident_history_incident_id`.

#### 10. `audit_logs`
- Menyimpan header aktivitas pengguna dalam sistem.
- Kolom utama:
  - `id` UUID primary key.
  - `user_id` UUID foreign key.
  - `username` VARCHAR(50).
  - `action` VARCHAR(50).
  - `target` VARCHAR(100).
  - `details` TEXT.
  - `ip_address` VARCHAR(45).
  - `created_at` TIMESTAMPTZ.
- Indeks: `idx_audit_logs_user_id`, `idx_audit_logs_action`, `idx_audit_logs_created_at`.

#### 11. `daily_aggregates`
- Menyimpan agregat harian monitoring untuk tiap website.
- Kolom utama:
  - `website_id` UUID foreign key.
  - `day` DATE.
  - `total_checks` INT.
  - `online_checks` INT.
  - `avg_response_time_ms` INT.
- Primary key: `(website_id, day)`.
- Indeks: `idx_daily_aggregates_day`.

### 3.2 Integrasi dengan Backend dan Frontend

- Backend Go mengakses tabel ini untuk menyajikan data ke dashboard.
- Frontend memanggil endpoint REST API untuk:
  - ringkasan status layanan (`dashboard/summary`)
  - histori monitoring (`dashboard/history`)
  - daftar website (`/websites`)
  - daftar insiden (`/incidents`)
  - catatan status (`/status-events` jika ada endpoint terkait)
- WebSocket digunakan untuk mengirim update realtime ketika backend menerima perubahan status dari monitoring engine.

### 3.3 Alur Penyimpanan dan Pembaruan Data

1. Monitoring engine memeriksa target website.
2. Hasil pemeriksaan disimpan di tabel `monitoring_logs`.
3. Perubahan status tercatat di tabel `status_events`.
4. Jika terjadi insiden, `incidents` akan dikelola dengan lifecycle `TRIGGERED` → `ACKNOWLEDGED` → `INVESTIGATING` → `RESOLVED` → `CLOSED`.
5. Aksi pengguna, komentar insiden, dan histori insiden dicatat pada `incident_comments` dan `incident_history`.
6. Audit operasional disimpan di `audit_logs`.
7. Agregat harian disimpan di `daily_aggregates` untuk laporan performa.

## 4. Operasi Backup, Restore, dan Migrasi

### 4.1 Migrasi Database

- Semua definisi skema database ditempatkan di folder `migrations/`.
- Migrasi dijalankan saat deployment untuk memastikan struktur database terbaru.
- Skema saat ini diimplementasikan dengan migrasi berurutan `001_init.sql` hingga `014_daily_aggregates.sql`.
- Contoh perintah migrasi:

```powershell
migrate -path migrations -database "%DATABASE_URL%" up
```

### 4.2 Backup Database

- Backup harian direkomendasikan untuk mencegah kehilangan data.
- Contoh backup file:

```powershell
pg_dump -Fc -h localhost -U appuser -d spmt_monitor -f backups/spmt_monitor-$(Get-Date -Format yyyy-MM-dd).dump
```

### 4.3 Restore Database

- Jika restore diperlukan, gunakan `pg_restore`:

```powershell
pg_restore -h localhost -U appuser -d spmt_monitor_restored backups/spmt_monitor-2026-07-07.dump
```

- Validasi hasil restore dengan menjalankan query dasar seperti `SELECT count(*) FROM websites;`.

### 4.4 Retention dan Arsip

- Log monitoring lama dapat diarsipkan atau dihapus secara berkala untuk menjaga performa.
- Contoh kebijakan: simpan `monitoring_logs` 90–180 hari, lalu pindahkan ke sistem arsip atau data warehouse.

## 5. Keamanan dan Kontrol Akses

- Gunakan role database terbatas untuk aplikasi, tidak menggunakan superuser.
- Simpan kredensial database dalam environment variable, tidak di-commit ke repository.
- Gunakan hash password (`bcrypt` atau `argon2`), bukan password plaintext.
- Batasi akses tabel pengguna, insiden, dan log dengan permission yang sesuai.
- Aktifkan TLS pada koneksi database jika aplikasi dijalankan di lingkungan terdistribusi.

## 6. Skalabilitas dan Performa

- Indeks yang penting:
  - `monitoring_logs(website_id, checked_at DESC)`
  - `status_events(website_id, created_at DESC)`
  - `incidents(status, created_at DESC)`
- Penggunaan PgBouncer, read replica, atau partitioning adalah rekomendasi future work, bukan implementasi saat ini.
- Jika volume log sangat besar, pertimbangkan future work berupa partitioning tabel `monitoring_logs` berdasarkan rentang waktu.

## 7. Monitoring dan Pemeliharaan Database

- Pantau metrik PostgreSQL penting seperti:
  - jumlah koneksi aktif
  - penggunaan cache
  - fragmentasi indeks
  - write-ahead log (WAL)
- Jalankan `VACUUM` dan `ANALYZE` secara berkala.
- Lakukan `REINDEX` jika indeks mengalami bloat.
- Uji restore backup secara rutin untuk memastikan prosedur recovery berjalan.

## 8. Dokumentasi Pendukung

- ERD untuk struktur tabel tersedia di `frontend/docs/diagrams/erd.md`.
- Migrasi skema tersimpan di folder `migrations/`.
- Panduan operasi backup/restore dapat disesuaikan ke dalam runbook deployment atau SOP administrasi.

---

Dokumentasi ini dirancang untuk membantu tim pengembang dan operator memahami desain database, alur data monitoring, serta prosedur pemeliharaan yang dibutuhkan agar sistem monitoring berjalan stabil, aman, dan dapat diskalakan.
