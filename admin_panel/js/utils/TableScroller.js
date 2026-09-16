/**
 * TableScroller Utility
 * Menyediakan fungsionalitas scroll tabel yang mulus dan bebas error
 * untuk semua view di Admin Panel (Withdrawals, ApiKeys, Users, Dashboard).
 */
export function setupTableScroll(container, scrollId, leftBtnId, rightBtnId, resetBtnId = null) {
  const tableScroll = container.querySelector(`#${scrollId}`);
  if (!tableScroll) return;

  // Pastikan posisi scroll awal selalu di paling kiri (0) agar kolom pertama tidak terpotong
  tableScroll.scrollLeft = 0;

  const scrollLeftBtn = leftBtnId ? container.querySelector(`#${leftBtnId}`) : null;
  const scrollRightBtn = rightBtnId ? container.querySelector(`#${rightBtnId}`) : null;
  const scrollResetBtn = resetBtnId ? container.querySelector(`#${resetBtnId}`) : null;

  // 1. Quick Scroll Buttons (Navigasi Tombol Kiri & Kanan & Reset)
  if (scrollLeftBtn) {
    scrollLeftBtn.addEventListener('click', (e) => {
      e.preventDefault();
      tableScroll.scrollBy({ left: -280, behavior: 'smooth' });
    });
  }

  if (scrollRightBtn) {
    scrollRightBtn.addEventListener('click', (e) => {
      e.preventDefault();
      tableScroll.scrollBy({ left: 280, behavior: 'smooth' });
    });
  }

  if (scrollResetBtn) {
    scrollResetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      tableScroll.scrollTo({ left: 0, behavior: 'smooth' });
    });
  }

  // Update opacity tombol navigasi saat di posisi tepi
  const updateNavButtons = () => {
    const isAtStart = tableScroll.scrollLeft <= 5;
    const isAtEnd = tableScroll.scrollLeft + tableScroll.clientWidth >= tableScroll.scrollWidth - 5;
    if (scrollLeftBtn) scrollLeftBtn.style.opacity = isAtStart ? '0.4' : '1';
    if (scrollRightBtn) scrollRightBtn.style.opacity = isAtEnd ? '0.4' : '1';
    if (scrollResetBtn) scrollResetBtn.style.opacity = isAtStart ? '0.4' : '1';
  };

  tableScroll.addEventListener('scroll', updateNavButtons, { passive: true });
  updateNavButtons();

  // 2. Mouse Drag-to-Scroll dengan threshold (minimal geser 6px baru aktif drag agar klik tidak sengaja tidak menggeser tabel)
  let isDown = false;
  let startX = 0;
  let scrollStart = 0;
  let hasMoved = false;

  tableScroll.addEventListener('mousedown', (e) => {
    // Jangan drag jika mengklik tombol aksi, link, atau elemen yang bisa diseleksi
    if (e.target.closest('button, a, input, select, textarea, label, span.select-all')) return;
    isDown = true;
    hasMoved = false;
    startX = e.pageX - tableScroll.offsetLeft;
    scrollStart = tableScroll.scrollLeft;
  });

  const stopDrag = () => {
    if (isDown) {
      isDown = false;
      tableScroll.classList.remove('cursor-grabbing');
      tableScroll.classList.add('cursor-grab');
    }
  };

  tableScroll.addEventListener('mouseleave', stopDrag);
  tableScroll.addEventListener('mouseup', stopDrag);

  tableScroll.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const x = e.pageX - tableScroll.offsetLeft;
    const dist = Math.abs(x - startX);
    if (!hasMoved && dist < 6) return; // Threshold agar klik biasa tidak menggeser

    hasMoved = true;
    tableScroll.classList.add('cursor-grabbing');
    tableScroll.classList.remove('cursor-grab');
    e.preventDefault();
    const walk = (x - startX) * 1.3;
    tableScroll.scrollLeft = scrollStart - walk;
  });

  // 3. Shift + MouseWheel Horizontal Scroll
  tableScroll.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > 0) return;
    if (e.shiftKey && tableScroll.scrollWidth > tableScroll.clientWidth) {
      tableScroll.scrollLeft += e.deltaY;
    }
  }, { passive: true });
}
