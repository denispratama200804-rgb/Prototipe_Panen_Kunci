# Changelog

Semua perubahan penting pada proyek **Panen Kunci** didokumentasikan dalam berkas ini.

Format berkas ini mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.1.0/)
dan mematuhi standar [Semantic Versioning (SemVer 2.0.0)](https://semver.org/lang/id/).

---

## [1.2.0] - 2026-09-10

### 🚀 Ditambahkan (Added)
- **Admin Hub Dashboard**: Tampilan utama *App Hub Card Grid* modern dengan akses cepat ke 4 modul operasional (Gudang API Key, Persetujuan Payout, Kelola Pengguna, dan Pengaturan Tarif).
- **Desain Semantik Terpadu**: Kelas komponen semantik (`.admin-card-header`, `.admin-item-card`, `.admin-sub-card`, `.admin-mini-card`, `.admin-btn-secondary`) untuk menjaga konsistensi visual di seluruh panel admin.
- **Sistem Sinkronisasi Supabase**: Integrasi penuh tombol sinkronisasi data pengguna dan penarikan langsung dari database cloud Supabase.
- **Optimasi PWA & Mobile Viewport**: Dukungan layar penuh PWA mandiri (*standalone*), tombol navigasi pintar (sembunyi otomatis di halaman utama), dan penataan layout responsif di perangkat seluler.

### 🔄 Diubah (Changed)
- **Kartu Metrik Mobile Ringkas**: Mengubah tata letak kartu statistik di `UsersView`, `WithdrawalsView`, dan `DashboardView` menjadi grid 3 kolom sejajar yang compact di layar mobile, mencegah penumpukan kartu vertikal yang memakan layar.
- **Accordion Card Styling**: Menerapkan aksen batas vertikal yang elegan (`border-l-4`) untuk status verifikasi KYC (Hijau Emerald) dan status pending (Kuning Amber).
- **Format Nominal Adaptif**: Otomatisasi format singkatan mata uang (misal `Rp 100rb`) pada kartu ringkasan di mobile view agar angka tidak terpotong.
- **Pembaruan Service Worker**: Cache name diperbarui ke `panen-kunci-v1.2.0` untuk pembaruan aset otomatis pada klien pengguna.

### 🛠️ Diperbaiki (Fixed)
- **Sinkronisasi Tema (Dark & Light Mode)**: Memperbaiki inkonsistensi warna kartu, kotak detail yang terbelah, dan kontras teks tombol aksi agar 100% terbaca jelas di kedua tema.
- **Bug Tombol Tema Navbar**: Menghilangkan pemicu ganda (*double toggle*) dan lag peralihan tema dengan optimasi CSS tanpa *wildcard reflow*.
- **Google OAuth Mobile Layout**: Memperbaiki tata letak layar login Google di perangkat seluler agar tidak terpotong dan simetris di tengah.
- **Preservasi Identitas Brand**: Memastikan logo resmi Panen Kunci (`/Logo_PK.jpg`) tampil proporsional tanpa distorsi pada navbar desktop dan header mobile.

---

## [1.1.0] - 2026-09-08

### 🚀 Ditambahkan (Added)
- Integrasi database Supabase untuk autentikasi pengguna, penyimpanan API Key, dan verifikasi KYC.
- Panel Administrasi eksekutif untuk approval payout, audit saldo, dan pemantauan API Key.
- Dukungan instalasi PWA (*Progressive Web App*) dan manifest aplikasi.

### 🔄 Diubah (Changed)
- Peningkatan arsitektur kode dari skrip terpisah menjadi modular clean-architecture (presentation, domain, infrastructure).

---

## [1.0.0] - 2026-08-25

### 🚀 Ditambahkan (Added)
- Rilis perdana aplikasi **Panen Kunci**.
- Alur setoran API Key Kie.ai dan validasi format kunci.
- Dompet pengguna dan simulasi pencairan saldo ke e-wallet lokal (DANA, GoPay, OVO, Rekening Bank).
- Tampilan responsif berbasis Tailwind CSS.

---

[1.2.0]: https://github.com/your-username/panen-kunci/releases/tag/v1.2.0
[1.1.0]: https://github.com/your-username/panen-kunci/releases/tag/v1.1.0
[1.0.0]: https://github.com/your-username/panen-kunci/releases/tag/v1.0.0
