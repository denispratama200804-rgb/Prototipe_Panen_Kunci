/**
 * PaymentMethodHelper
 * Modul terpusat untuk metadata, warna resmi, dan logo Bank & E-Wallet.
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
    iconSrc: '/images/icon-ewallet.png',
    brandColor: '#118EEA',
    bgColor: 'bg-[#118EEA]/10',
    textColor: 'text-[#118EEA]',
    borderColor: 'border-[#118EEA]/30',
    svg: `<img src="/images/icon-ewallet.png" alt="DANA" class="w-full h-full object-cover" />`
  },
  GOPAY: {
    id: 'gopay',
    name: 'GoPay',
    type: 'ewallet',
    iconSrc: '/images/icon-ewallet.png',
    brandColor: '#00AED6',
    bgColor: 'bg-[#00AED6]/10',
    textColor: 'text-[#00AED6]',
    borderColor: 'border-[#00AED6]/30',
    svg: `<img src="/images/icon-ewallet.png" alt="GoPay" class="w-full h-full object-cover" />`
  },
  OVO: {
    id: 'ovo',
    name: 'OVO',
    type: 'ewallet',
    iconSrc: '/images/icon-ewallet.png',
    brandColor: '#4C2A86',
    bgColor: 'bg-[#4C2A86]/10',
    textColor: 'text-[#8b5cf6]',
    borderColor: 'border-[#4C2A86]/30',
    svg: `<img src="/images/icon-ewallet.png" alt="OVO" class="w-full h-full object-cover" />`
  },
  SHOPEEPAY: {
    id: 'shopeepay',
    name: 'ShopeePay',
    type: 'ewallet',
    iconSrc: '/images/icon-ewallet.png',
    brandColor: '#EE4D2D',
    bgColor: 'bg-[#EE4D2D]/10',
    textColor: 'text-[#EE4D2D]',
    borderColor: 'border-[#EE4D2D]/30',
    svg: `<img src="/images/icon-ewallet.png" alt="ShopeePay" class="w-full h-full object-cover" />`
  },
  BCA: {
    id: 'bca',
    name: 'BCA',
    type: 'bank',
    iconSrc: '/images/icon-bank.png',
    brandColor: '#005EAA',
    bgColor: 'bg-[#005EAA]/10',
    textColor: 'text-[#005EAA]',
    borderColor: 'border-[#005EAA]/30',
    svg: `<img src="/images/icon-bank.png" alt="BCA" class="w-full h-full object-cover" />`
  },
  BRI: {
    id: 'bri',
    name: 'BRI',
    type: 'bank',
    iconSrc: '/images/icon-bank.png',
    brandColor: '#00529C',
    bgColor: 'bg-[#00529C]/10',
    textColor: 'text-[#00529C]',
    borderColor: 'border-[#00529C]/30',
    svg: `<img src="/images/icon-bank.png" alt="BRI" class="w-full h-full object-cover" />`
  },
  MANDIRI: {
    id: 'mandiri',
    name: 'Mandiri',
    type: 'bank',
    iconSrc: '/images/icon-bank.png',
    brandColor: '#003366',
    bgColor: 'bg-[#003366]/10',
    textColor: 'text-[#003366]',
    borderColor: 'border-[#003366]/30',
    svg: `<img src="/images/icon-bank.png" alt="Mandiri" class="w-full h-full object-cover" />`
  },
  SEABANK: {
    id: 'seabank',
    name: 'SeaBank',
    type: 'bank',
    iconSrc: '/images/icon-bank.png',
    brandColor: '#FF5B00',
    bgColor: 'bg-[#FF5B00]/10',
    textColor: 'text-[#FF5B00]',
    borderColor: 'border-[#FF5B00]/30',
    svg: `<img src="/images/icon-bank.png" alt="SeaBank" class="w-full h-full object-cover" />`
  },
  GENERIC_EWALLET: {
    id: 'ewallet',
    name: 'E-Wallet',
    type: 'ewallet',
    iconSrc: '/images/icon-ewallet.png',
    brandColor: '#118EEA',
    bgColor: 'bg-primary/10',
    textColor: 'text-primary',
    borderColor: 'border-primary/30',
    svg: `<img src="/images/icon-ewallet.png" alt="E-Wallet" class="w-full h-full object-cover" />`
  },
  GENERIC_BANK: {
    id: 'bank',
    name: 'Bank Transfer',
    type: 'bank',
    iconSrc: '/images/icon-bank.png',
    brandColor: '#2563EB',
    bgColor: 'bg-blue-600/10',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-500/30',
    svg: `<img src="/images/icon-bank.png" alt="Bank Transfer" class="w-full h-full object-cover" />`
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
  if (query.includes('wallet') || query.includes('ewallet') || query.includes('e-wallet') || query.includes('linkaja')) {
    return PAYMENT_METHODS.GENERIC_EWALLET;
  }
  if (query.includes('bca')) return PAYMENT_METHODS.BCA;
  if (query.includes('bri')) return PAYMENT_METHODS.BRI;
  if (query.includes('mandiri')) return PAYMENT_METHODS.MANDIRI;
  if (query.includes('seabank') || query.includes('sea bank')) return PAYMENT_METHODS.SEABANK;

  return PAYMENT_METHODS.GENERIC_BANK;
}

/**
 * Menghasilkan HTML Icon resmi yang responsif
 * @param {string} rawInput - Nama bank / e-wallet
 * @param {string} [customSizeClass='w-10 h-10'] - Ukuran kotak icon
 * @returns {string} HTML string
 */
export function renderPaymentMethodIcon(rawInput = '', customSizeClass = 'w-10 h-10') {
  const meta = getPaymentMethodMetadata(rawInput);
  const iconSrc = meta.type === 'ewallet' ? '/images/icon-ewallet.png' : '/images/icon-bank.png';
  return `
    <img src="${iconSrc}" alt="${meta.name}" class="${customSizeClass} object-cover" title="${meta.name}" />
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
  const iconSrc = meta.type === 'ewallet' ? '/images/icon-ewallet.png' : '/images/icon-bank.png';
  return `
    <div class="inline-flex items-center gap-2 bg-surface-card border border-surface-container px-3 py-1.5 rounded-full shadow-xs text-xs font-bold text-text-heading">
      <div class="w-5 h-5 shrink-0 rounded-md overflow-hidden flex items-center justify-center">
        <img src="${iconSrc}" alt="${displayLabel}" class="w-full h-full object-cover" />
      </div>
      <span>${displayLabel}</span>
    </div>
  `;
}

