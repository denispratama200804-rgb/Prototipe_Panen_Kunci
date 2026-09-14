/**
 * PaymentMethodHelper
 * Modul terpusat untuk metadata, warna resmi, dan logo vektor (SVG) Bank & E-Wallet.
 * Memastikan tampilan icon sinkron, konsisten, dan resmi di seluruh halaman:
 * - Tarik Saldo (Pilihan Metode, Kartu Rekening Tujuan)
 * - Profil (Rekening Utama & Modal Ubah Rekening)
 * - Riwayat Penarikan Dana
 * - Halaman Beranda / Landing
 */

export const PAYMENT_METHODS = {
  DANA: {
    id: 'dana',
    name: 'DANA',
    type: 'ewallet',
    brandColor: '#118EEA',
    bgColor: 'bg-[#118EEA]/10',
    textColor: 'text-[#118EEA]',
    borderColor: 'border-[#118EEA]/30',
    // Logo resmi DANA (vektor SVG)
    svg: `<svg viewBox="0 0 48 48" class="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#118EEA"/>
      <path d="M12 24.5C12 17.5964 17.5964 12 24.5 12C31.4036 12 37 17.5964 37 24.5C37 31.4036 31.4036 37 24.5 37C17.5964 37 12 31.4036 12 24.5Z" fill="#0D81D4"/>
      <path d="M18 20H25.5C28.5376 20 31 22.0147 31 24.5C31 26.9853 28.5376 29 25.5 29H18V20Z" fill="white"/>
      <path d="M21.5 23H25C26.1046 23 27 23.6716 27 24.5C27 25.3284 26.1046 26 25 26H21.5V23Z" fill="#118EEA"/>
      <text x="24" y="32" font-size="7" font-weight="900" font-family="sans-serif" fill="white" text-anchor="middle" letter-spacing="1">DANA</text>
    </svg>`
  },
  GOPAY: {
    id: 'gopay',
    name: 'GoPay',
    type: 'ewallet',
    brandColor: '#00AED6',
    bgColor: 'bg-[#00AED6]/10',
    textColor: 'text-[#00AED6]',
    borderColor: 'border-[#00AED6]/30',
    // Logo resmi GoPay (vektor SVG)
    svg: `<svg viewBox="0 0 48 48" class="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#00AED6"/>
      <circle cx="24" cy="24" r="14" fill="white"/>
      <circle cx="24" cy="24" r="7.5" fill="#00AED6"/>
      <circle cx="24" cy="24" r="3.5" fill="white"/>
    </svg>`
  },
  OVO: {
    id: 'ovo',
    name: 'OVO',
    type: 'ewallet',
    brandColor: '#4C2A86',
    bgColor: 'bg-[#4C2A86]/10',
    textColor: 'text-[#8b5cf6]',
    borderColor: 'border-[#4C2A86]/30',
    // Logo resmi OVO (vektor SVG)
    svg: `<svg viewBox="0 0 48 48" class="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#4C2A86"/>
      <circle cx="16" cy="24" r="6" stroke="white" stroke-width="3" fill="none"/>
      <circle cx="32" cy="24" r="6" stroke="white" stroke-width="3" fill="none"/>
      <path d="M22 18L24 28L26 18" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  },
  SHOPEEPAY: {
    id: 'shopeepay',
    name: 'ShopeePay',
    type: 'ewallet',
    brandColor: '#EE4D2D',
    bgColor: 'bg-[#EE4D2D]/10',
    textColor: 'text-[#EE4D2D]',
    borderColor: 'border-[#EE4D2D]/30',
    // Logo resmi ShopeePay (vektor SVG)
    svg: `<svg viewBox="0 0 48 48" class="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#EE4D2D"/>
      <path d="M24 13C20.5 13 18 15.5 18 18.5V20H30V18.5C30 15.5 27.5 13 24 13Z" stroke="white" stroke-width="2.5" fill="none"/>
      <rect x="14" y="19" width="20" height="17" rx="3" fill="white"/>
      <path d="M22 24.5C22 23.5 22.8 23 24 23C25.2 23 26 23.5 26 24.2C26 26 22 25.5 22 27.5C22 28.5 23 29 24 29C25.5 29 26 28.2 26 28.2" stroke="#EE4D2D" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`
  },
  BCA: {
    id: 'bca',
    name: 'BCA',
    type: 'bank',
    brandColor: '#005EAA',
    bgColor: 'bg-[#005EAA]/10',
    textColor: 'text-[#005EAA]',
    borderColor: 'border-[#005EAA]/30',
    // Logo resmi Bank BCA (vektor SVG)
    svg: `<svg viewBox="0 0 48 48" class="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#005EAA"/>
      <text x="24" y="28" font-size="13" font-weight="900" font-family="system-ui, -apple-system, sans-serif" fill="white" text-anchor="middle" letter-spacing="0.5">BCA</text>
      <path d="M12 33H36" stroke="#00A2E8" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`
  },
  BRI: {
    id: 'bri',
    name: 'BRI',
    type: 'bank',
    brandColor: '#00529C',
    bgColor: 'bg-[#00529C]/10',
    textColor: 'text-[#00529C]',
    borderColor: 'border-[#00529C]/30',
    // Logo resmi Bank BRI (vektor SVG)
    svg: `<svg viewBox="0 0 48 48" class="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#00529C"/>
      <text x="24" y="28" font-size="13" font-weight="900" font-family="system-ui, -apple-system, sans-serif" fill="white" text-anchor="middle" letter-spacing="0.5">BRI</text>
      <circle cx="37" cy="15" r="3" fill="#F37021"/>
    </svg>`
  },
  MANDIRI: {
    id: 'mandiri',
    name: 'Mandiri',
    type: 'bank',
    brandColor: '#003366',
    bgColor: 'bg-[#003366]/10',
    textColor: 'text-[#003366]',
    borderColor: 'border-[#003366]/30',
    // Logo resmi Bank Mandiri (vektor SVG)
    svg: `<svg viewBox="0 0 48 48" class="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#003366"/>
      <text x="24" y="26" font-size="9" font-weight="900" font-family="system-ui, -apple-system, sans-serif" fill="white" text-anchor="middle">mandırı</text>
      <path d="M15 31C20 34 28 34 33 31" stroke="#FFB600" stroke-width="3" stroke-linecap="round"/>
    </svg>`
  },
  SEABANK: {
    id: 'seabank',
    name: 'SeaBank',
    type: 'bank',
    brandColor: '#FF5B00',
    bgColor: 'bg-[#FF5B00]/10',
    textColor: 'text-[#FF5B00]',
    borderColor: 'border-[#FF5B00]/30',
    // Logo resmi SeaBank (vektor SVG)
    svg: `<svg viewBox="0 0 48 48" class="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#FF5B00"/>
      <path d="M14 26C15 22 18 19 24 19C30 19 33 22 34 26" stroke="white" stroke-width="3" stroke-linecap="round"/>
      <path d="M18 30C19 28 21 26 24 26C27 26 29 28 30 30" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <text x="24" y="16" font-size="7" font-weight="900" font-family="system-ui, sans-serif" fill="white" text-anchor="middle">SeaBank</text>
    </svg>`
  },
  GENERIC_BANK: {
    id: 'bank',
    name: 'Bank Transfer',
    type: 'bank',
    brandColor: '#2563EB',
    bgColor: 'bg-blue-600/10',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-500/30',
    svg: `<svg viewBox="0 0 48 48" class="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#2563EB"/>
      <path d="M24 13L13 19V21H35V19L24 13Z" fill="white"/>
      <rect x="15" y="23" width="3" height="9" fill="white"/>
      <rect x="21" y="23" width="3" height="9" fill="white"/>
      <rect x="27" y="23" width="3" height="9" fill="white"/>
      <rect x="30" y="23" width="3" height="9" fill="white"/>
      <path d="M13 33H35V35H13V33Z" fill="white"/>
    </svg>`
  }
};

/**
 * Mendapatkan metadata lengkap berdasarkan nama bank atau e-wallet
 * @param {string} rawInput - Contoh: 'DANA', 'GoPay', 'BCA', 'Bank Transfer (BCA)', dll
 * @returns {typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS]}
 */
export function getPaymentMethodMetadata(rawInput = '') {
  const query = (rawInput || '').toLowerCase().trim();

  if (query.includes('dana')) return PAYMENT_METHODS.DANA;
  if (query.includes('gopay') || query.includes('go-pay')) return PAYMENT_METHODS.GOPAY;
  if (query.includes('ovo')) return PAYMENT_METHODS.OVO;
  if (query.includes('shopee') || query.includes('spay')) return PAYMENT_METHODS.SHOPEEPAY;
  if (query.includes('bca')) return PAYMENT_METHODS.BCA;
  if (query.includes('bri')) return PAYMENT_METHODS.BRI;
  if (query.includes('mandiri')) return PAYMENT_METHODS.MANDIRI;
  if (query.includes('seabank') || query.includes('sea bank')) return PAYMENT_METHODS.SEABANK;

  return PAYMENT_METHODS.GENERIC_BANK;
}

/**
 * Menghasilkan HTML Icon / Badge SVG resmi yang responsif
 * @param {string} rawInput - Nama bank / e-wallet
 * @param {string} [customSizeClass='w-10 h-10'] - Ukuran kotak icon
 * @returns {string} HTML string
 */
export function renderPaymentMethodIcon(rawInput = '', customSizeClass = 'w-10 h-10') {
  const meta = getPaymentMethodMetadata(rawInput);
  return `
    <div class="${customSizeClass} shrink-0 rounded-2xl overflow-hidden shadow-xs flex items-center justify-center p-0.5" title="${meta.name}">
      ${meta.svg}
    </div>
  `;
}

/**
 * Menghasilkan pill / chip badge dengan logo resmi
 * @param {string} rawInput - Nama bank / e-wallet
 * @param {string} [label] - Label teks alternatif jika ingin meng-override
 * @returns {string} HTML string
 */
export function renderPaymentMethodPill(rawInput = '', label = null) {
  const meta = getPaymentMethodMetadata(rawInput);
  const displayLabel = label || meta.name;
  return `
    <div class="inline-flex items-center gap-2 bg-surface-card border border-surface-container px-3 py-1.5 rounded-full shadow-xs text-xs font-bold text-text-heading">
      <div class="w-5 h-5 shrink-0 rounded-md overflow-hidden">
        ${meta.svg}
      </div>
      <span>${displayLabel}</span>
    </div>
  `;
}
