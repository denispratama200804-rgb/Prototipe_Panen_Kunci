/**
 * ReceiptHelper.js
 * Utility untuk menghasilkan struk bukti transfer digital resmi (Canvas HTML5)
 * dan menampilkan modal detail / lightbox bukti transfer dan penolakan transaksi.
 */

export class ReceiptHelper {
  /**
   * Menghasilkan Data URL gambar struk bukti transfer digital resmi
   * @param {Object} details
   * @returns {string} Base64 PNG data URL
   */
  static generateReceiptDataUrl(details = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 840;
    const ctx = canvas.getContext('2d');

    const amount = Number(details.amount || 0);
    const fee = Number(details.fee !== undefined ? details.fee : 1000);
    const netPayout = Number(details.netPayout !== undefined ? details.netPayout : (amount - fee));
    const txId = details.transactionId || details.id || 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const recipient = details.recipient || '-';
    const method = (details.method || 'E-WALLET').toUpperCase();
    const recipientName = details.recipientName || 'Pengguna Panen Kunci';
    const dateStr = details.date || details.createdAt ? new Date(details.date || details.createdAt).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : new Date().toLocaleString('id-ID');

    // 1. Background Clean White Paper with soft gradient
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 640, 840);

    // 2. Decorative Outer Border
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 636, 836);

    // 3. Top Accent Bar (Gradient Emerald)
    const headerGrad = ctx.createLinearGradient(0, 0, 640, 0);
    headerGrad.addColorStop(0, '#059669');
    headerGrad.addColorStop(1, '#10B981');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(4, 4, 632, 110);

    // 4. Circular Badge with Checkmark
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(320, 110, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(320, 110, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓', 320, 110);

    // 5. Header Title & Brand
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText('BUKTI TRANSFER BERHASIL', 320, 185);

    ctx.fillStyle = '#64748B';
    ctx.font = '13px Arial, sans-serif';
    ctx.fillText('Panen Kunci Payout Gateway • Struk Penarikan Resmi', 320, 210);

    // 6. Net Amount Display
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 38px Arial, sans-serif';
    ctx.fillText(`Rp ${netPayout.toLocaleString('id-ID')}`, 320, 265);

    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.fillText('• DANA BERHASIL DITRANSFER KE REKENING TUJUAN •', 320, 292);

    // 7. Divider Dashed Line
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(50, 320);
    ctx.lineTo(590, 320);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // 8. Transaction Details Table
    const rows = [
      ['No. Referensi:', txId],
      ['Waktu Transaksi:', dateStr],
      ['Metode Penarikan:', method],
      ['Rekening / E-Wallet:', recipient],
      ['Nama Penerima:', recipientName],
      ['Jumlah Penarikan (Gross):', `Rp ${amount.toLocaleString('id-ID')}`],
      ['Biaya Admin:', `Rp ${fee.toLocaleString('id-ID')}`],
      ['Total Bersih (Net):', `Rp ${netPayout.toLocaleString('id-ID')}`],
      ['Status:', 'DITRANSFER / SUKSES']
    ];

    let y = 360;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    rows.forEach(([label, val]) => {
      // Label
      ctx.fillStyle = '#64748B';
      ctx.font = '14px Arial, sans-serif';
      ctx.fillText(label, 60, y);

      // Value
      if (label === 'Status:') {
        ctx.fillStyle = '#059669';
        ctx.font = 'bold 14px Arial, sans-serif';
      } else if (label.includes('Total Bersih')) {
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 15px Arial, sans-serif';
      } else {
        ctx.fillStyle = '#1E293B';
        ctx.font = '500 14px Arial, sans-serif';
      }
      ctx.textAlign = 'right';
      ctx.fillText(val, 580, y);
      ctx.textAlign = 'left';

      // Subtle separator line
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, y + 10);
      ctx.lineTo(580, y + 10);
      ctx.stroke();

      y += 38;
    });

    // 9. Admin Notes (if any)
    if (details.proofNotes || details.notes) {
      const notes = details.proofNotes || details.notes;
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(50, 715, 540, 36);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.strokeRect(50, 715, 540, 36);

      ctx.fillStyle = '#475569';
      ctx.font = 'italic 12px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Catatan Admin: "${notes}"`, 320, 738);
    }

    // 10. Security Watermark & Verification Seal Box
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(40, 765, 560, 52);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 765, 560, 52);

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VERIFIED BY PANEN KUNCI PAYOUT GATEWAY', 320, 786);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px Arial, sans-serif';
    ctx.fillText('Struk digital ini sah dan diproses secara otomatis oleh sistem Panen Kunci.', 320, 804);

    return canvas.toDataURL('image/png');
  }

  /**
   * Membuka Modal Lightbox Bukti Transfer Lengkap (Gambar + Rincian Finansial)
   * @param {Object} item - Data notifikasi atau transaksi
   */
  static openProofLightbox(item = {}) {
    // Tutup modal sebelumnya jika ada
    const existing = document.getElementById('panen-proof-lightbox-modal');
    if (existing) existing.remove();

    const amount = Number(item.amount || 0);
    const fee = Number(item.fee !== undefined ? item.fee : 1000);
    const netPayout = Number(item.netPayout !== undefined ? item.netPayout : (amount - fee));
    const txId = item.transactionId || item.id || 'tx';
    const recipient = item.recipient || item.method || '-';
    const method = (item.method || 'E-Wallet').toUpperCase();
    const dateStr = item.createdAt || item.date ? new Date(item.createdAt || item.date).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : new Date().toLocaleString('id-ID');

    // Jika belum ada foto bukti fisik, generate struk digital resmi
    const proofSrc = item.proofImage || ReceiptHelper.generateReceiptDataUrl({
      amount,
      fee,
      netPayout,
      transactionId: txId,
      recipient,
      method,
      date: item.createdAt || item.date,
      proofNotes: item.proofNotes || item.notes
    });

    const lightboxMount = document.createElement('div');
    lightboxMount.id = 'panen-proof-lightbox-modal';
    document.body.appendChild(lightboxMount);
    document.body.style.overflow = 'hidden';

    lightboxMount.innerHTML = `
      <div id="proof-lightbox-overlay" class="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
        <div class="max-w-lg w-full bg-surface-card border border-surface-container rounded-3xl p-5 sm:p-6 relative shadow-2xl flex flex-col gap-4 my-auto" style="max-height: calc(100vh - 2rem);">
          
          <!-- Header Modal -->
          <div class="flex items-center justify-between pr-8">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">verified</span>
              </div>
              <div>
                <h3 class="text-base font-bold text-text-heading">Detail Bukti Transfer</h3>
                <p class="text-xs text-text-body font-mono">Ref #${txId}</p>
              </div>
            </div>

            <!-- Close Button -->
            <button
              type="button"
              id="btn-close-proof-modal"
              class="absolute top-4 right-4 w-9 h-9 rounded-full bg-surface-container-high text-text-body hover:text-text-heading hover:bg-surface-container-highest flex items-center justify-center transition-colors cursor-pointer"
              title="Tutup (Esc)"
            >
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <!-- Status Banner -->
          <div class="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
            <div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <span class="material-symbols-outlined text-lg" style="font-variation-settings: 'FILL' 1;">task_alt</span>
              <span class="text-xs font-bold">Transfer Berhasil Diterima</span>
            </div>
            <span class="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              Rp ${netPayout.toLocaleString('id-ID')}
            </span>
          </div>

          <!-- Foto / Struk Preview -->
          <div class="rounded-2xl overflow-hidden border border-surface-container bg-slate-900/5 dark:bg-slate-950 flex flex-col items-center justify-center p-2 relative group shadow-inner">
            <img
              src="${proofSrc}"
              alt="Bukti Transfer Resmi"
              class="w-full max-h-[38vh] sm:max-h-[42vh] object-contain rounded-xl shadow-xs transition-transform duration-200"
            />
            <div class="mt-2 text-[10px] text-text-body flex items-center gap-1">
              <span class="material-symbols-outlined text-[13px] text-emerald-500">lock</span>
              <span>Dokumen Bukti Resmi Panen Kunci Payout Gateway</span>
            </div>
          </div>

          <!-- Tabel Rincian Finansial -->
          <div class="p-3.5 bg-surface-container-low rounded-2xl border border-surface-container space-y-2 text-xs">
            <div class="flex justify-between items-center text-text-body">
              <span>Metode Penarikan:</span>
              <span class="font-bold text-text-heading">${method}</span>
            </div>
            <div class="flex justify-between items-center text-text-body">
              <span>Nomor Tujuan:</span>
              <span class="font-mono font-semibold text-text-heading">${recipient}</span>
            </div>
            <div class="flex justify-between items-center text-text-body">
              <span>Nominal Diminta:</span>
              <span class="font-mono font-medium text-text-heading">Rp ${amount.toLocaleString('id-ID')}</span>
            </div>
            <div class="flex justify-between items-center text-text-body">
              <span>Biaya Transaksi:</span>
              <span class="font-mono text-error-ruby">-Rp ${fee.toLocaleString('id-ID')}</span>
            </div>
            <div class="pt-1.5 border-t border-surface-container flex justify-between items-center">
              <span class="font-bold text-text-heading">Total Dana Ditransfer:</span>
              <span class="font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">Rp ${netPayout.toLocaleString('id-ID')}</span>
            </div>
            <div class="flex justify-between items-center text-text-body pt-1">
              <span>Waktu Pengiriman:</span>
              <span class="text-[11px] text-text-heading">${dateStr}</span>
            </div>

            ${(item.proofNotes || item.notes) ? `
              <div class="mt-2 pt-2 border-t border-surface-container/60 text-[11px] italic text-text-body bg-surface-card p-2 rounded-xl">
                <strong class="font-semibold text-text-heading not-italic">Catatan Admin:</strong> "${item.proofNotes || item.notes}"
              </div>
            ` : ''}
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2.5 pt-1">
            <a
              href="${proofSrc}"
              download="bukti-transfer-panenkunci-${txId}.png"
              id="btn-download-proof"
              class="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <span class="material-symbols-outlined text-[18px]">download</span>
              <span>Unduh Bukti Transfer</span>
            </a>
            <button
              type="button"
              id="btn-dismiss-proof-modal"
              class="py-3 px-5 rounded-2xl bg-surface-container text-text-heading text-xs font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    `;

    const close = () => {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
      lightboxMount.remove();
    };

    const handleKeydown = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeydown);

    lightboxMount.querySelector('#btn-close-proof-modal')?.addEventListener('click', close);
    lightboxMount.querySelector('#btn-dismiss-proof-modal')?.addEventListener('click', close);
    const overlay = lightboxMount.querySelector('#proof-lightbox-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
    }
  }

  /**
   * Membuka Modal Rincian Penolakan Penarikan
   * @param {Object} item
   */
  static openRejectLightbox(item = {}) {
    const existing = document.getElementById('panen-reject-lightbox-modal');
    if (existing) existing.remove();

    const amount = Number(item.amount || 0);
    const txId = item.transactionId || item.id || 'tx';
    const recipient = item.recipient || item.method || '-';
    const method = (item.method || 'E-Wallet').toUpperCase();
    const reason = item.rejectionReason || item.proofNotes || 'Data akun atau rekening tidak valid / tidak sesuai';
    const dateStr = item.createdAt || item.date ? new Date(item.createdAt || item.date).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : new Date().toLocaleString('id-ID');

    const lightboxMount = document.createElement('div');
    lightboxMount.id = 'panen-reject-lightbox-modal';
    document.body.appendChild(lightboxMount);
    document.body.style.overflow = 'hidden';

    lightboxMount.innerHTML = `
      <div id="reject-lightbox-overlay" class="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
        <div class="max-w-md w-full bg-surface-card border border-surface-container rounded-3xl p-5 sm:p-6 relative shadow-2xl flex flex-col gap-4 my-auto">
          
          <!-- Header -->
          <div class="flex items-center justify-between pr-8">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center shrink-0 shadow-xs">
                <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">cancel</span>
              </div>
              <div>
                <h3 class="text-base font-bold text-text-heading">Rincian Penolakan</h3>
                <p class="text-xs text-text-body font-mono">Ref #${txId}</p>
              </div>
            </div>

            <button
              type="button"
              id="btn-close-reject-modal"
              class="absolute top-4 right-4 w-9 h-9 rounded-full bg-surface-container-high text-text-body hover:text-text-heading hover:bg-surface-container-highest flex items-center justify-center transition-colors cursor-pointer"
              title="Tutup (Esc)"
            >
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <!-- Refund Guarantee Banner -->
          <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
            <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl shrink-0 mt-0.5">currency_exchange</span>
            <div>
              <h4 class="text-xs font-bold text-emerald-600 dark:text-emerald-400">100% Saldo Dikembalikan</h4>
              <p class="text-xs text-text-body mt-0.5 leading-relaxed">
                Dana sebesar <strong class="font-mono text-emerald-600 dark:text-emerald-400">Rp ${amount.toLocaleString('id-ID')}</strong> telah sepenuhnya dikembalikan ke saldo aktif akun Anda tanpa potongan biaya apapun.
              </p>
            </div>
          </div>

          <!-- Box Alasan Penolakan -->
          <div class="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 space-y-1.5">
            <span class="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm">error</span>
              <span>Alasan Penolakan dari Admin:</span>
            </span>
            <p class="text-xs text-text-heading font-medium bg-surface-card p-3 rounded-xl border border-surface-container/80">
              "${reason}"
            </p>
          </div>

          <!-- Rincian Transaksi -->
          <div class="p-3.5 bg-surface-container-low rounded-2xl border border-surface-container space-y-2 text-xs">
            <div class="flex justify-between items-center text-text-body">
              <span>Metode Penarikan:</span>
              <span class="font-bold text-text-heading">${method}</span>
            </div>
            <div class="flex justify-between items-center text-text-body">
              <span>Nomor Tujuan:</span>
              <span class="font-mono font-semibold text-text-heading">${recipient}</span>
            </div>
            <div class="flex justify-between items-center text-text-body">
              <span>Nominal Diminta:</span>
              <span class="font-mono font-bold text-text-heading">Rp ${amount.toLocaleString('id-ID')}</span>
            </div>
            <div class="flex justify-between items-center text-text-body">
              <span>Waktu Pengajuan:</span>
              <span class="text-[11px] text-text-heading">${dateStr}</span>
            </div>
          </div>

          <!-- Close Action -->
          <button
            type="button"
            id="btn-dismiss-reject-modal"
            class="w-full py-3 px-4 rounded-2xl bg-surface-container-highest hover:bg-surface-container-high text-text-heading text-xs font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    `;

    const close = () => {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
      lightboxMount.remove();
    };

    const handleKeydown = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeydown);

    lightboxMount.querySelector('#btn-close-reject-modal')?.addEventListener('click', close);
    lightboxMount.querySelector('#btn-dismiss-reject-modal')?.addEventListener('click', close);
    const overlay = lightboxMount.querySelector('#reject-lightbox-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
    }
  }
}
