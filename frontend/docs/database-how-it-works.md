# Cara Kerja Database Sistem Monitoring

Dokumen ini menjelaskan secara ringkas namun teknis bagaimana basis data (PostgreSQL) berperan dalam sistem monitoring SPMT: aliran data, operasi tulis-baca, pemicu insiden, dan tindakan pendukung operasi.

## Gambaran Umum
- DB utama: PostgreSQL, skema diimplementasikan melalui migrasi SQL pada folder `backend/migrations/`.
- Peran utama: menyimpan metadata target (`websites`), hasil pemeriksaan (`monitoring_logs`), pencatatan perubahan status (`status_events`), manajemen insiden (`incidents` dan tabel terkait), audit (`audit_logs`), dan agregat harian (`daily_aggregates`).

## Alur Data (End-to-End)
1. Monitoring Engine (Go) menjalankan rangkaian pemeriksaan (DNS, TCP, HTTP, SSL, browser checks).
2. Setelah tiap pemeriksaan selesai, Engine menulis satu baris ke tabel `monitoring_logs` dengan hasil pemeriksaan (kolom: `checked_at`, `status_code`, `response_time_ms`, `ssl_valid`, `error_message`, `status`, `root_cause`, dst.).
3. Berdasarkan hasil dan log historis, Engine/Backend menentukan apakah status agregat `websites` perlu diperbarui. Jika perlu, backend mengupdate baris pada tabel `websites` (contoh: `last_checked` atau `interval_seconds`).
4. Saat ada perubahan status (contoh: dari `ONLINE` → `CRITICAL`), backend membuat entri pada `status_events` (mencatat `old_status` dan `new_status`).
5. Jika perubahan status memenuhi aturan insiden (policy yang diimplementasikan di backend), sebuah `incidents` dibuat/diupdate. Lifecycle insiden mengikuti status: `TRIGGERED` → `ACKNOWLEDGED` → `INVESTIGATING` → `RESOLVED` → `CLOSED`.
6. Aksi pengguna (menugaskan, menambahkan komentar) dicatat pada `incident_comments` dan `incident_history`. Semua aksi operasional juga terekam di `audit_logs` untuk kepatuhan.
7. Backend dapat menghitung dan menulis agregat harian ke `daily_aggregates` (digunakan untuk laporan SLA dan tampilan ringkasan di dashboard).
8. Setelah perubahan penting (status change, new incident), backend mem-push notifikasi realtime ke frontend melalui WebSocket; frontend menampilkan notifikasi dan memperbarui tampilan.

## Alur Tulis (Writers) vs Baca (Readers)
- Writers: Monitoring Engine, Backend API endpoints, tugas-tugas batch (agregasi harian).
- Readers: Frontend dashboard (via REST endpoints), proses reporting, admin queries.
- Untuk menghindari beban tulis/multi-connection contention, aplikasi menulis log granuler (satu record per check) dan backend mengupdate agregat pada `websites`/`daily_aggregates` secara terpisah.

## Konsistensi dan Transaksi
- Operasi yang berhubungan (mis. membuat `monitoring_logs` lalu menulis `status_events` dan `incidents`) harus dijalankan dalam transaksi atomik di sisi backend bila konsistensi antar-tabel diperlukan.
- Contoh: saat status berubah → buka transaksi: insert `monitoring_logs`, insert `status_events`, insert/update `incidents`, commit. Jika salah satu gagal, rollback agar tidak ada data setengah jadi.

## Indeks dan Optimisasi Query
- Indeks utama yang digunakan:
  - `idx_logs_website_id` dan `idx_logs_checked_at` untuk histori per-website.
  - `idx_monitoring_logs_composite` untuk query dashboard yang mengambil data terbaru per website.
  - `idx_status_events_website_id` untuk timeline perubahan status.
  - index pada `incidents(status)` untuk mengambil insiden aktif.
- Query pembacaan dashboard biasanya mengambil ringkasan (count per status) dan snapshot terakhir tiap website menggunakan indeks composite.

## Pengelolaan Volume Data
- `monitoring_logs` dapat tumbuh cepat; praktik yang direkomendasikan:
  - partitioning berdasarkan waktu (per-bulan) untuk memudahkan purge/arsip.
  - memindahkan log lama ke storage arsip atau data warehouse jika diperlukan retensi panjang.
  - menulis agregat harian ke `daily_aggregates` agar query laporan tidak meng-scan tabel log besar.

## Backup & Restore (Operasional Singkat)
- Backup biasa menggunakan `pg_dump -Fc` untuk full logical backup.
- Restore menggunakan `pg_restore` pada database kosong atau temporary untuk validasi.
- Untuk recovery lebih cepat di produksi, gunakan snapshot storage atau PITR (WAL archiving) jika infrastruktur mendukung.

## Ketersediaan Koneksi & Pooling
- Pada produksi, gunakan connection pooler (PgBouncer) bila ada banyak worker/konkurensi koneksi untuk mengurangi overhead membuka koneksi DB.
- Aplikasi backend harus menggunakan pooling driver (pgx/pool) dan batasi jumlah maksimum koneksi.

## Contoh Urutan Eksekusi (kasus status berubah menjadi CRITICAL)
1. Engine mendapat HTTP 5xx pada satu target.
2. Engine men-insert record `monitoring_logs` dengan `status='CRITICAL'` dan `error_message`.
3. Backend membaca log terakhir atau menerima callback, menemukan `old_status='ONLINE'`.
4. Backend memulai transaksi:
   - insert `status_events` (old_status, new_status)
   - insert `incidents` dengan `status='TRIGGERED'`
   - update `websites` (jika ada field status agregat)
   - commit
5. Backend mendorong event melalui WebSocket ke frontend; subsystem notifikasi (email/telegram) di-trigger.

## Keamanan Data
- Jangan menyimpan password plaintext; backend menyimpan `password_hash` (bcrypt) pada tabel `users`.
- Batasi akses DB dengan role terpisah untuk aplikasi vs operator.
- Simpan `DATABASE_URL` di environment variable (lihat `backend/.env.example`).

## Catatan Implementasi vs Rekomendasi
- Skema saat ini (lihat `backend/migrations`) sudah mencakup tabel audit, komentar insiden, dan agregat harian.
- Rekomendasi seperti partitioning, read replica, atau PgBouncer tercantum sebagai future work jika beban tumbuh.

---

File ini tersimpan sebagai `frontend/docs/database-how-it-works.md`. Jika Anda mau, saya bisa juga membuat diagram urutan (sequence diagram) merangkum alur insert→incident→notify, atau menambahkan contoh potongan SQL transaksi.