# 🖥️ Server Monitoring Dashboard
### Project PKWU — SMK Jurusan TKJ · 2026

> Simulasi layanan jasa instalasi monitoring server berbasis DevOps untuk UMKM dan perusahaan kecil.

---

## 📁 Struktur Folder

```
project-server-monitoring/
│
├── index.html          → Landing Page / Company Profile
├── login.html          → Halaman Login
├── dashboard.html      → Client Monitoring Dashboard
│
├── css/
│   ├── style.css       → Styling Landing Page
│   └── dashboard.css   → Styling Dashboard
│
├── js/
│   ├── main.js         → JavaScript Landing Page (animasi, scroll, dll)
│   ├── login.js        → Validasi Login
│   ├── dashboard.js    → Logic Dashboard & Chart.js
│   └── prometheus-api.js → Integrasi Prometheus HTTP API
│
├── img/
│   └── team/           → Foto anggota tim (opsional)
│
└── README.md
```

---

## 🚀 Cara Menjalankan

### Opsi 1: Buka Langsung (tanpa server)
1. Buka file `index.html` di browser
2. Klik "Login Client" → masukkan `admin` / `admin123`
3. Dashboard akan menampilkan data simulasi otomatis

### Opsi 2: Dengan Live Server (VSCode)
1. Install ekstensi **Live Server** di VSCode
2. Klik kanan `index.html` → **Open with Live Server**
3. Website akan berjalan di `http://localhost:5500`

### Opsi 3: Dengan Prometheus Nyata
1. Jalankan Prometheus di server Linux:
   ```bash
   docker run -d -p 9090:9090 prom/prometheus
   docker run -d -p 9100:9100 prom/node-exporter
   ```
2. Buka dashboard → masukkan URL: `http://SERVER_IP:9090`
3. Klik **Hubungkan** → dashboard akan menampilkan data real

---

## 🔐 Kredensial Login

| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |

---

## 📊 Fitur Dashboard

- ✅ **Server Status** — Indikator Online / Offline
- ✅ **CPU Usage** — Persentase penggunaan CPU real-time
- ✅ **RAM Usage** — Persentase penggunaan memori
- ✅ **Disk Usage** — Penggunaan ruang penyimpanan
- ✅ **Network RX/TX** — Traffic jaringan masuk/keluar
- ✅ **Grafik Real-Time** — Chart.js dengan update otomatis
- ✅ **System Logs** — Log aktivitas sistem
- ✅ **Prometheus URL Config** — Atur endpoint Prometheus
- ✅ **Interval Refresh** — Pilihan 5s / 10s / 15s / 30s
- ✅ **Mode Simulasi** — Fallback otomatis jika Prometheus tidak tersedia

---

## 🛠️ Teknologi yang Digunakan

### Frontend
| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| HTML5 | - | Struktur halaman |
| CSS3 | - | Styling & animasi |
| JavaScript | ES2022 | Logika aplikasi |
| Chart.js | v4.x | Grafik monitoring |

### Backend / Infrastructure
| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| Linux Ubuntu | 22.04 LTS | OS Server |
| Docker | Latest | Containerisasi |
| Prometheus | v2.x | Database metrik |
| Node Exporter | v1.7.0 | Export metrik Linux |

### Fonts & Icons
- **Syne** — Font display heading
- **DM Sans** — Font body teks
- **JetBrains Mono** — Font monospace (kode/metrik)
- **FontAwesome 6** — Icon library
- **Devicon** — Icon teknologi

---

## 📡 Prometheus API Queries

| Metrik | PromQL Query |
|--------|--------------|
| CPU Usage | `100 - (avg by(instance)(irate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)` |
| RAM Usage | `(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100` |
| Disk Usage | `(node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes * 100` |
| Network RX | `sum(irate(node_network_receive_bytes_total{device!="lo"}[1m]))` |
| Uptime | `node_time_seconds - node_boot_time_seconds` |

---

## 👥 Struktur Tim

| Role | Tanggung Jawab |
|------|---------------|
| **Project Manager** | Koordinasi, pembagian tugas, laporan |
| **NOC Engineer** | Konfigurasi jaringan LAN, koneksi server |
| **IT / DevOps Engineer** | Instalasi Ubuntu, Docker, Prometheus, dashboard |
| **Sales & Marketing** | Analisis pasar, harga, promosi, presentasi |

---

## 🎨 Desain

- **Theme**: Dark Mode Technology
- **Style**: Modern Startup + Glassmorphism
- **Animasi**: Particle background, scroll reveal, floating cards
- **Responsive**: Mobile-friendly dengan hamburger menu

---

## 📝 Catatan

- Dashboard menggunakan **data simulasi** secara default jika Prometheus tidak terhubung
- Untuk ujian praktek, gunakan mode simulasi (tanpa perlu setup server)
- Untuk demo real, connect ke Prometheus yang sudah berjalan di server

---

*© 2026 Server Monitoring Dashboard — Project PKWU SMK Jurusan TKJ*  
*Simulasi Layanan Jasa Monitoring Server Berbasis DevOps*
