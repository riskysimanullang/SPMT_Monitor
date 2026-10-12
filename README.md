# Real-Time Web Application Monitoring System - PT Pelindo Multi Terminal

Sebuah sistem pemantauan (monitoring) aplikasi web berbasis *real-time* yang dirancang untuk mengukur ketersediaan (*availability*), performa (*performance*), dan keamanan (*security*) layanan digital secara otomatis di lingkungan PT Pelindo Multi Terminal. 

Sistem ini dikembangkan secara tim sebagai proyek utama dalam program Magang Mandiri dari Institut Teknologi Del.

## 🚀 Fitur Utama & Arsitektur Sistem

Sistem ini menerapkan pendekatan **Multi-Layer Monitoring (10 Layers)** untuk mendeteksi gangguan secara akurat:
* **Multi-Layer Verification:** Meliputi pemeriksaan *DNS Resolution & Latency*, *ICMP Ping*, *TCP Port Check*, *HTTP Request Check*, dan *SSL Validation*.
* **Mekanisme Cerdas Pencegahan False Alarm:** 
  * **Anti-Flapping:** Menunda perubahan status akibat gangguan jaringan sesaat.
  * **Quorum Internet Check:** Memverifikasi koneksi internet server monitoring sebelum menetapkan status *OFFLINE* pada target.
  * **WAF Detection:** Mendeteksi proteksi anti-bot (seperti Cloudflare) agar tidak salah diklasifikasikan sebagai *down*.
* **Real-Time Dashboard:** Visualisasi status aplikasi menggunakan **WebSocket** sehingga data diperbarui instan tanpa perlu *refresh* halaman.
* **Root Cause Analysis & AI Chatbot:** Membantu administrator mengidentifikasi akar penyebab gangguan menggunakan riwayat data telemetri yang terintegrasi dengan Chatbot AI.
* **Automated Notifications:** Pengiriman alert otomatis saat terjadi insiden melalui Telegram Bot dan Email (SMTP).

## 🛠️ Tech Stack yang Digunakan

* **Backend Engine:** Golang (Chi Router, JWT Auth, Goroutines, Worker Pool)
* **Frontend Dashboard:** React 18, Vite, WebSocket Client
* **Database:** PostgreSQL (UUID-based relational tables)
* **Layanan Eksternal:** Telegram API, SMTP Email, AI Chatbot Service

## 📝 Kontribusi Saya (Risky Melisa Simanullang)
Di dalam proyek tim ini, saya berfokus pada:
* *[Silakan isi spesifik tugas Anda, contoh: Mengembangkan komponen Frontend dashboard menggunakan React & integrasi WebSocket Client / Merancang skema database PostgreSQL dan implementasi monitoring engine menggunakan Golang Goroutines]*
