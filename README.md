# 🔑 Panen Kunci

> **Platform Monetisasi API Key & Pusat Kontrol Operasional Terpadu**  
> *Ubah API Key valid menjadi saldo tunai yang dapat langsung dicairkan ke rekening bank dan e-wallet.*

[![Release Version](https://img.shields.io/badge/version-1.2.0-blue.svg?style=for-the-badge)](https://github.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-purple.svg?style=for-the-badge)](https://web.dev/progressive-web-apps/)

---

## 📖 Tentang Proyek

**Panen Kunci** adalah aplikasi web modern berbasis PWA (*Progressive Web App*) yang dirancang untuk menjembatani pemilik API Key (seperti Kie.ai dan OpenAI) dengan sistem penukaran saldo digital. Pengguna dapat menyetorkan kunci yang valid, memantau kredit dan saldo dompet secara real-time, serta mengajukan pencairan dana (*payout*) langsung ke rekening perbankan atau e-wallet (DANA, GoPay, OVO).

Aplikasi ini juga dilengkapi dengan **Executive Admin Panel** lengkap untuk memvalidasi stok kunci, menyetujui atau menolak permohonan penarikan dana dengan bukti transfer digital, memverifikasi identitas pengguna (KYC), serta mengonfigurasi skema tarif dan fee transfer.

---

## ✨ Fitur Utama

### 👤 Portal Pengguna (Client App)
- **Autentikasi Aman**: Login dan registrasi email/password serta integrasi Google OAuth.
- **Penyetoran API Key**: Validasi format dan status kunci secara instan.
- **Dompet Digital & Riwayat**: Pemantauan saldo aktif, saldo pasif, dan histori transaksi lengkap.
- **Pencairan Dana (Withdrawal)**: Pengajuan tarik dana ke bank lokal dan e-wallet populer dengan kalkulasi fee otomatis.
- **PWA Standalone**: Dapat diinstal langsung di Android, iOS, dan Desktop layaknya aplikasi native.

### 🛡️ Panel Admin (Control Center)
- **Admin Hub Grid**: Dashboard terpadu dengan navigasi modular ke seluruh unit operasional.
- **Gudang API Key**: Filter cepat status kunci (Semua, Pasif/Pending, Aktif/Valid) dengan pagination dan tabel responsif.
- **Persetujuan Payout**: Verifikasi nomor rekening tujuan, input nomor referensi transfer, unggah bukti transfer m-Banking, dan unduh bukti digital instan.
- **Manajemen Pengguna & KYC**: Kartu pengguna model akordeon dengan aksi verifikasi KYC satu-klik dan penyesuaian saldo promo.
- **Pengaturan Tarif**: Konfigurasi harga beli per kunci, batas minimal penarikan, dan persentase fee admin.
- **Sinkronisasi Supabase**: Tarik dan perbarui data real-time langsung dari database cloud.
- **Dual-Theme Harmonious**: Dukungan penuh Dark Mode dan Light Mode tanpa lag dan dengan kontras tinggi.

---

## 🛠️ Arsitektur & Teknologi

- **Frontend Core**: Vanilla JavaScript (ES Modules) untuk performa maksimal dan bundle yang sangat ringan.
- **Build Tooling**: [Vite](https://vitejs.dev/) v5.4
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v3.4 + Custom CSS Design Tokens (`admin.css`)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL Database, Auth, Real-Time)
- **PWA Support**: Service Worker (`sw.js`) dengan strategi offline caching dan Web App Manifest.

### 📁 Struktur Direktori
```text
Prototipe_Panen_Kunci/
├── admin_panel/            # Antarmuka Admin Control Center
│   ├── css/                # Tema & styling khusus admin (admin.css)
│   ├── js/                 # Komponen, service, dan view admin
│   └── index.html          # Entry point aplikasi Admin
├── api/                    # Serverless API endpoints
├── documentation/          # Dokumentasi SRS, SDD, dan skema database SQL
├── public/                 # Aset publik statis (Logo, Icon, SW, Manifest)
│   ├── Logo_PK.jpg         # Logo resmi Panen Kunci
│   ├── manifest.json       # Konfigurasi PWA
│   └── sw.js               # Service Worker caching v1.2.0
├── src/                    # Kode sumber utama User Client
│   ├── application/        # Use cases & business logic
│   ├── domain/             # Entitas & antarmuka domain
│   ├── infrastructure/     # Integrasi Supabase & external services
│   ├── presentation/       # Komponen UI, navigasi, dan routing
│   └── styles/             # Global CSS
├── index.html              # Entry point aplikasi User
├── package.json            # Manifest dependensi & versi rilis (v1.2.0)
└── vite.config.js          # Konfigurasi bundling Vite multi-page
```

---

## 🚀 Panduan Memulai (Quick Start)

### 1. Prasyarat
- [Node.js](https://nodejs.org/) versi 18.x atau lebih baru
- Akun [Supabase](https://supabase.com/) (untuk koneksi database)

### 2. Instalasi
Clone repositori dan pasang dependensi:
```bash
git clone https://github.com/your-username/panen-kunci.git
cd panen-kunci
npm install
```

### 3. Konfigurasi Lingkungan (.env)
Salin berkas konfigurasi sampel dan sesuaikan kredensial Supabase Anda:
```bash
cp .env.example .env
```
Isi variabel berikut:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Menjalankan Mode Development
Jalankan dev server lokal:
```bash
npm run dev
```
Akses aplikasi:
- **User Portal**: `http://localhost:5173/`
- **Admin Panel**: `http://localhost:5173/admin_panel/`

### 5. Membangun untuk Produksi (Build)
```bash
npm run build
```
Hasil build produksi siap di-deploy akan berada di direktori `dist/`.

---

## 🏷️ Standar Rilis & Versi (Semantic Versioning)

Proyek ini mematuhi standar [Semantic Versioning 2.0.0](https://semver.org/lang/id/):
- **MAJOR (`X.0.0`)**: Perubahan arsitektur besar yang tidak kompatibel ke belakang.
- **MINOR (`0.X.0`)**: Penambahan fitur baru yang kompatibel ke belakang.
- **PATCH (`0.0.X`)**: Perbaikan bug atau optimasi styling tanpa penambahan fitur baru.

Riwayat versi dan catatan rilis terdokumentasi lengkap di [CHANGELOG.md](CHANGELOG.md).

---

## 📄 Lisensi

Didistribusikan di bawah lisensi MIT. Lihat `LICENSE` untuk informasi lebih lanjut.
