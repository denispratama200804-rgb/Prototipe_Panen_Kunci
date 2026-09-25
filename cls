[33mcommit 4a1b1f262b240da8171f42ae6fe1e9138728869b[m[33m ([m[1;36mHEAD[m[33m -> [m[1;32mmain[m[33m, [m[1;31morigin/main[m[33m, [m[1;31morigin/HEAD[m[33m)[m
Author: Denis <denispratama200804@gmail.com>
Date:   Fri Sep 25 15:40:12 2026 +0700

    update

[1mdiff --git a/.env.example b/.env.example[m
[1mindex dd69fab..6aa9a02 100644[m
[1m--- a/.env.example[m
[1m+++ b/.env.example[m
[36m@@ -19,6 +19,9 @@[m [mNEXT_PUBLIC_GOOGLE_CLIENT_SECRET=[m
 VITE_RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI[m
 NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI[m
 RECAPTCHA_SECRET_KEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe[m
[32m+[m[32m# Bypass Google reCAPTCHA (otomatis aktif di localhost, atur false jika ingin mematikan)[m
[32m+[m[32m# VITE_BYPASS_CAPTCHA=true[m
[32m+[m
 [m
 # Konfigurasi Brevo Email (Reset Password & Kode OTP Pendaftaran)[m
 # Rekomendasi Utama: Gunakan BREVO_API_KEY (REST API v3, Port 443 HTTPS - aman dari blokir port ISP/Vercel)[m
[1mdiff --git a/src/presentation/components/CaptchaModal.js b/src/presentation/components/CaptchaModal.js[m
[1mindex 226b53f..539270b 100644[m
[1m--- a/src/presentation/components/CaptchaModal.js[m
[1m+++ b/src/presentation/components/CaptchaModal.js[m
[36m@@ -50,15 +50,54 @@[m [mfunction loadGoogleRecaptchaScript() {[m
 }[m
 [m
 export class CaptchaModal {[m
[32m+[m[32m  /**[m
[32m+[m[32m   * Mengecek apakah lingkungan saat ini adalah localhost / local development[m
[32m+[m[32m   * @returns {boolean}[m
[32m+[m[32m   */[m
[32m+[m[32m  static isLocalhost() {[m
[32m+[m[32m    if (typeof window === 'undefined') return false;[m
[32m+[m
[32m+[m[32m    // Izinkan developer memaksa captcha muncul jika diperlukan (misal untuk testing UI)[m
[32m+[m[32m    try {[m
[32m+[m[32m      const urlParams = new URLSearchParams(window.location.search);[m
[32m+[m[32m      if (urlParams.get('forceCaptcha') === 'true' || localStorage.getItem('panenkunci:force_captcha') === 'true') {[m
[32m+[m[32m        return false;[m
[32m+[m[32m      }[m
[32m+[m[32m    } catch (_) {}[m
[32m+[m
[32m+[m[32m    // Jika secara eksplisit dinonaktifkan fitur bypass-nya lewat .env[m
[32m+[m[32m    if (import.meta.env?.VITE_BYPASS_CAPTCHA === 'false') {[m
[32m+[m[32m      return false;[m
[32m+[m[32m    }[m
[32m+[m
[32m+[m[32m    const hostname = window.location.hostname || '';[m
[32m+[m[32m    return ([m
[32m+[m[32m      hostname === 'localhost' ||[m
[32m+[m[32m      hostname === '127.0.0.1' ||[m
[32m+[m[32m      hostname === '[::1]' ||[m
[32m+[m[32m      hostname.endsWith('.localhost') ||[m
[32m+[m[32m      hostname.startsWith('192.168.') ||[m
[32m+[m[32m      Boolean(import.meta.env?.DEV) ||[m
[32m+[m[32m      import.meta.env?.VITE_BYPASS_CAPTCHA === 'true'[m
[32m+[m[32m    );[m
[32m+[m[32m  }[m
[32m+[m
   /**[m
    * Menampilkan modal Google reCAPTCHA dan mengembalikan Promise<boolean|string>[m
    * @param {Object} [options][m
    * @param {string} [options.title='Verifikasi Google reCAPTCHA'][m
    * @param {string} [options.subtitle='Centang kotak di bawah untuk memverifikasi bahwa Anda bukan robot sebelum melanjutkan.'][m
    * @param {string} [options.cancelText='Batal'][m
[32m+[m[32m   * @param {boolean} [options.forceShow=false] Paksa tampilkan modal meskipun di localhost[m
    * @returns {Promise<boolean|string>} Mengembalikan token reCAPTCHA jika lolos, atau false jika dibatalkan[m
    */[m
   static show(options = {}) {[m
[32m+[m[32m    // Lewati (bypass) captcha secara otomatis jika sedang dibuka di localhost atau local development[m
[32m+[m[32m    if (!options.forceShow && CaptchaModal.isLocalhost()) {[m
[32m+[m[32m      console.log('[CaptchaModal] Lingkungan localhost terdeteksi. reCAPTCHA otomatis dilewati (bypass).');[m
[32m+[m[32m      return Promise.resolve('localhost-bypass-token');[m
[32m+[m[32m    }[m
[32m+[m
     return new Promise(async (resolve) => {[m
       const {[m
         title = 'Verifikasi Google reCAPTCHA',[m
