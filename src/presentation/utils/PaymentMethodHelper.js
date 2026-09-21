/**
 * PaymentMethodHelper
 * Modul terpusat untuk metadata, warna resmi, dan logo Bank & E-Wallet.
 * Memastikan tampilan icon sinkron, konsisten, dan resmi di seluruh halaman:
 * - Saldo Detail (Riwayat Penarikan Terakhir)
 * - Tarik Saldo (Pilihan Metode, Kartu Rekening Tujuan)
 * - Profil (Rekening Utama & Modal Ubah Rekening)
 * - Riwayat Penarikan Dana & Referral
 * - Halaman Beranda / Landing & Dashboard
 */

export const PAYMENT_METHODS = {
  DANA: {
    id: 'dana',
    name: 'DANA',
    type: 'ewallet',
    iconSrc: '/images/icon-ewallet.png',
    brandColor: '#118EEA',
    bgColor: 'bg-[#118EEA]/10',
    textColor: 'text-[#118EEA]',
    borderColor: 'border-[#118EEA]/30'
  },
  GOPAY: {
    id: 'gopay',
    name: 'GoPay',
    type: 'ewallet',
    iconSrc: '/images/icon-ewallet.png',
    brandColor: '#00AED6',
    bgColor: 'bg-[#00AED6]/10',
    textColor: 'text-[#00AED6]',
    borderColor: 'border-[#00AED6]/30'
  },
  OVO: {
    id: 'ovo',
    name: 'OVO',
    type: 'ewallet',
    iconSrc: '/images/icon-ewallet.png',
    brandColor: '#4C2A86',
    bgColor: 'bg-[#4C2A86]/10',
    textColor: 'text-[#8b5cf6]',
    borderColor: 'border-[#4C2A86]/30'
  },
  SHOPEEPAY: {
    id: 'shopeepay',
    name: 'ShopeePay',
    type: 'ewallet',
    iconSrc: '/images/icon-ewallet.png',
    brandColor: '#EE4D2D',
    bgColor: 'bg-[#EE4D2D]/10',
    textColor: 'text-[#EE4D2D]',
    borderColor: 'border-[#EE4D2D]/30'
  },
  BCA: {
    id: 'bca',
    name: 'BCA',
    type: 'bank',
    iconSrc: '/images/icon-bank.png',
    brandColor: '#005EAA',
    bgColor: 'bg-[#005EAA]/10',
    textColor: 'text-[#005EAA]',
    borderColor: 'border-[#005EAA]/30'
  },
  BRI: {
    id: 'bri',
    name: 'BRI',
    type: 'bank',
    iconSrc: '/images/icon-bank.png',
    brandColor: '#00529C',
    bgColor: 'bg-[#00529C]/10',
    textColor: 'text-[#00529C]',
    borderColor: 'border-[#00529C]/30'
  },
  MANDIRI: {
    id: 'mandiri',
    name: 'Mandiri',
    type: 'bank',
    iconSrc: '/images/icon-bank.png',
    brandColor: '#003366',
    bgColor: 'bg-[#003366]/10',
    textColor: 'text-[#003366]',
    borderColor: 'border-[#003366]/30'
  },
  BNI: {
    id: 'bni',
    name: 'BNI',
    type: 'bank',
    iconSrc: '/images/icon-bank.png',
    brandColor: '#005E6A',
    bgColor: 'bg-[#005E6A]/10',
    textColor: 'text-[#F15A24]',
    borderColor: 'border-[#005E6A]/30'
  },
  SEABANK: {
    id: 'seabank',
    name: 'SeaBank',
    type: 'bank',
    iconSrc: '/images/icon-bank.png',
    brandColor: '#FF5B00',
    bgColor: 'bg-[#FF5B00]/10',
    textColor: 'text-[#FF5B00]',
    borderColor: 'border-[#FF5B00]/30'
  },
  BSI: {
    id: 'bsi',
    name: 'BSI',
    type: 'bank',
    iconSrc: '/images/icon-bank.png',
    brandColor: '#00A39D',
    bgColor: 'bg-[#00A39D]/10',
    textColor: 'text-[#00A39D]',
    borderColor: 'border-[#00A39D]/30'
  },
  CIMB: {
    id: 'cimb',
    name: 'CIMB Niaga',
    type: 'bank',
    iconSrc: '/images/icon-bank.png',
    brandColor: '#8B0000',
    bgColor: 'bg-[#8B0000]/10',
    textColor: 'text-[#ED1C24]',
    borderColor: 'border-[#8B0000]/30'
  },
  GENERIC_EWALLET: {
    id: 'ewallet',
    name: 'E-Wallet',
    type: 'ewallet',
    iconSrc: '/images/icon-ewallet.png',
    brandColor: '#118EEA',
    bgColor: 'bg-primary/10',
    textColor: 'text-primary',
    borderColor: 'border-primary/30'
  },
  GENERIC_BANK: {
    id: 'bank',
    name: 'Bank Transfer',
    type: 'bank',
    iconSrc: '/images/icon-bank.png',
    brandColor: '#2563EB',
    bgColor: 'bg-blue-600/10',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-500/30'
  }
};

/**
 * Mendapatkan metadata lengkap berdasarkan nama bank atau e-wallet
 * @param {string} rawInput - Contoh: 'DANA', 'GoPay', 'BCA', 'Bank Transfer (BCA)', dll
 * @returns {typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS]}
 */
export function getPaymentMethodMetadata(rawInput = '') {
  const query = String(rawInput || '').toLowerCase().trim();

  if (query.includes('dana')) return PAYMENT_METHODS.DANA;
  if (query.includes('gopay') || query.includes('go-pay') || query.includes('go pay')) return PAYMENT_METHODS.GOPAY;
  if (query.includes('ovo')) return PAYMENT_METHODS.OVO;
  if (query.includes('shopee') || query.includes('spay')) return PAYMENT_METHODS.SHOPEEPAY;
  if (query.includes('bca')) return PAYMENT_METHODS.BCA;
  if (query.includes('bri')) return PAYMENT_METHODS.BRI;
  if (query.includes('mandiri')) return PAYMENT_METHODS.MANDIRI;
  if (query.includes('bni')) return PAYMENT_METHODS.BNI;
  if (query.includes('seabank') || query.includes('sea bank')) return PAYMENT_METHODS.SEABANK;
  if (query.includes('bsi') || query.includes('syariah')) return PAYMENT_METHODS.BSI;
  if (query.includes('cimb') || query.includes('niaga')) return PAYMENT_METHODS.CIMB;
  if (query.includes('wallet') || query.includes('ewallet') || query.includes('e-wallet') || query.includes('linkaja')) {
    return PAYMENT_METHODS.GENERIC_EWALLET;
  }

  return PAYMENT_METHODS.GENERIC_BANK;
}

/**
 * Menghasilkan SVG logo resmi per bank / e-wallet
 * @param {Object} meta
 * @param {string} [sizeClass='w-full h-full']
 * @returns {string}
 */
export function getPaymentMethodSvg(meta, sizeClass = 'w-full h-full') {
  const id = meta?.id || 'bank';
  switch (id) {
    case 'dana':
      return `
        <svg viewBox="0 0 40 40" class="${sizeClass}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="12" fill="#118EEA"/>
          <circle cx="20" cy="17" r="8" fill="#FFFFFF" fill-opacity="0.18"/>
          <path d="M14 12.5h5.2c3.3 0 5.8 2.3 5.8 5.2s-2.5 5.2-5.8 5.2H14V12.5zm3.2 7.7h2c1.5 0 2.6-1.1 2.6-2.5s-1.1-2.5-2.6-2.5h-2v5z" fill="#FFFFFF"/>
          <text x="20" y="32.5" fill="#FFFFFF" font-size="7.5" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" letter-spacing="0.8">DANA</text>
        </svg>
      `;
    case 'gopay':
      return `
        <svg viewBox="0 0 40 40" class="${sizeClass}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="12" fill="#00AED6"/>
          <circle cx="20" cy="17" r="7.2" stroke="#FFFFFF" stroke-width="3" fill="none"/>
          <circle cx="20" cy="17" r="2.8" fill="#FFFFFF"/>
          <text x="20" y="32.5" fill="#FFFFFF" font-size="7.5" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" letter-spacing="0.4">gopay</text>
        </svg>
      `;
    case 'ovo':
      return `
        <svg viewBox="0 0 40 40" class="${sizeClass}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="12" fill="#4C2A86"/>
          <circle cx="20" cy="20" r="13" stroke="#A78BFA" stroke-width="1.5" stroke-opacity="0.5" fill="none"/>
          <text x="20" y="24.5" fill="#FFFFFF" font-size="12" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" letter-spacing="0.8">OVO</text>
        </svg>
      `;
    case 'shopeepay':
      return `
        <svg viewBox="0 0 40 40" class="${sizeClass}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="12" fill="#EE4D2D"/>
          <path d="M16 13c0-2.2 1.8-4 4-4s4 1.8 4 4v1h-8v-1z" stroke="#FFFFFF" stroke-width="2" fill="none"/>
          <rect x="13" y="14" width="14" height="14" rx="3" fill="#FFFFFF"/>
          <path d="M21.5 18.5c-.4-.5-1-.8-1.7-.8-1 0-1.6.6-1.6 1.3 0 1.5 3.3.9 3.3 2.9 0 1.2-1 2.1-2.4 2.1-.9 0-1.7-.4-2.1-1.1m.5-4.4c.4.6 1.1.9 1.7.9" stroke="#EE4D2D" stroke-width="1.8" stroke-linecap="round"/>
          <text x="20" y="34.5" fill="#FFFFFF" font-size="5.5" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" letter-spacing="0.3">ShopeePay</text>
        </svg>
      `;
    case 'bca':
      return `
        <svg viewBox="0 0 40 40" class="${sizeClass}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="12" fill="#005EAA"/>
          <circle cx="20" cy="20" r="13" fill="#FFFFFF" fill-opacity="0.12"/>
          <text x="20" y="24.5" fill="#FFFFFF" font-size="12" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" letter-spacing="0.5">BCA</text>
        </svg>
      `;
    case 'bri':
      return `
        <svg viewBox="0 0 40 40" class="${sizeClass}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="12" fill="#00529C"/>
          <path d="M26 9l4 4v3l-4-3h-3V9h3z" fill="#F37021"/>
          <text x="19" y="25" fill="#FFFFFF" font-size="12" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" letter-spacing="0.5">BRI</text>
        </svg>
      `;
    case 'mandiri':
      return `
        <svg viewBox="0 0 40 40" class="${sizeClass}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="12" fill="#003366"/>
          <path d="M12 25c4-1 8-5 12-5s4 3 6 4" stroke="#F5A623" stroke-width="3" stroke-linecap="round"/>
          <text x="20" y="17" fill="#FFFFFF" font-size="7.5" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" letter-spacing="0.5">mandiri</text>
        </svg>
      `;
    case 'bni':
      return `
        <svg viewBox="0 0 40 40" class="${sizeClass}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="12" fill="#005E6A"/>
          <circle cx="28" cy="14" r="3" fill="#F15A24"/>
          <text x="18" y="25" fill="#FFFFFF" font-size="11" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" letter-spacing="0.5">BNI</text>
        </svg>
      `;
    case 'seabank':
      return `
        <svg viewBox="0 0 40 40" class="${sizeClass}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="12" fill="#FF5B00"/>
          <text x="20" y="18" fill="#FFFFFF" font-size="7.5" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" letter-spacing="0.5">SEA</text>
          <text x="20" y="27" fill="#FFFFFF" font-size="7.5" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" letter-spacing="0.5">BANK</text>
        </svg>
      `;
    case 'bsi':
      return `
        <svg viewBox="0 0 40 40" class="${sizeClass}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="12" fill="#00A39D"/>
          <circle cx="28" cy="13" r="2.5" fill="#EB9321"/>
          <text x="19" y="24.5" fill="#FFFFFF" font-size="11.5" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" letter-spacing="0.5">BSI</text>
        </svg>
      `;
    case 'cimb':
      return `
        <svg viewBox="0 0 40 40" class="${sizeClass}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="12" fill="#8B0000"/>
          <polygon points="12,14 16,14 20,26 16,26" fill="#ED1C24"/>
          <text x="20" y="25" fill="#FFFFFF" font-size="8.5" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" letter-spacing="0.5">CIMB</text>
        </svg>
      `;
    case 'ewallet':
      return `
        <svg viewBox="0 0 40 40" class="${sizeClass}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="12" fill="#0284C7"/>
          <rect x="10" y="13" width="20" height="15" rx="3" fill="#E0F2FE"/>
          <path d="M24 18h6v5h-6a2.5 2.5 0 0 1 0-5z" fill="#0284C7"/>
          <circle cx="26" cy="20.5" r="1" fill="#FFFFFF"/>
          <text x="20" y="35" fill="#FFFFFF" font-size="5" font-weight="800" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" letter-spacing="0.5">E-WALLET</text>
        </svg>
      `;
    default:
      return `
        <svg viewBox="0 0 40 40" class="${sizeClass}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="12" fill="#1E3A8A"/>
          <path d="M20 10l10 5v2H10v-2l10-5zm-8 9h3v7h-3v-7zm6 0h4v7h-4v-7zm7 0h3v7h-3v-7zM9 28h22v3H9v-3z" fill="#93C5FD"/>
          <text x="20" y="36.5" fill="#93C5FD" font-size="5" font-weight="800" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" letter-spacing="0.5">BANK</text>
        </svg>
      `;
  }
}

/**
 * Menghasilkan HTML Icon resmi yang responsif
 * @param {string|Object} rawInput - Nama bank / e-wallet
 * @param {string} [customSizeClass='w-10 h-10'] - Ukuran kotak icon
 * @returns {string} HTML string
 */
export function renderPaymentMethodIcon(rawInput = '', customSizeClass = 'w-10 h-10') {
  const meta = typeof rawInput === 'object' && rawInput?.id ? rawInput : getPaymentMethodMetadata(rawInput);
  return getPaymentMethodSvg(meta, customSizeClass);
}

/**
 * Helper alias untuk merender SVG metode pembayaran
 * @param {string|Object} rawInput
 * @param {string} [customSizeClass='w-10 h-10']
 * @returns {string}
 */
export function renderPaymentMethodSvg(rawInput = '', customSizeClass = 'w-10 h-10') {
  return renderPaymentMethodIcon(rawInput, customSizeClass);
}

/**
 * Menghasilkan pill / chip badge dengan logo resmi
 * @param {string|Object} rawInput - Nama bank / e-wallet
 * @param {string} [label] - Label teks alternatif jika ingin meng-override
 * @returns {string} HTML string
 */
export function renderPaymentMethodPill(rawInput = '', label = null) {
  const meta = typeof rawInput === 'object' && rawInput?.id ? rawInput : getPaymentMethodMetadata(rawInput);
  const displayLabel = label || meta.name;
  return `
    <div class="inline-flex items-center gap-2 bg-surface-card border border-surface-container px-3 py-1.5 rounded-full shadow-xs text-xs font-bold text-text-heading">
      <div class="w-5 h-5 shrink-0 rounded-md overflow-hidden flex items-center justify-center">
        ${getPaymentMethodSvg(meta, 'w-5 h-5')}
      </div>
      <span>${displayLabel}</span>
    </div>
  `;
}
