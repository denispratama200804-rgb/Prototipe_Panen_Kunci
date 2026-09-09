/**
 * TableScroller Utility
 * Menyediakan fungsionalitas scroll tabel yang mulus dan bebas error
 * untuk semua view di Admin Panel (Withdrawals, ApiKeys, Users, Dashboard).
 */
export function setupTableScroll(container, scrollId, leftBtnId, rightBtnId) {
  const tableScroll = container.querySelector(`#${scrollId}`);
  if (!tableScroll) return;

  const scrollLeftBtn = leftBtnId ? container.querySelector(`#${leftBtnId}`) : null;
  const scrollRightBtn = rightBtnId ? container.querySelector(`#${rightBtnId}`) : null;

  // 1. Quick Scroll Buttons (Navigasi Tombol Kiri & Kanan)
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



  // 2. Mouse Drag-to-Scroll (Klik & Geser dengan Mouse di Desktop)
  let isDown = false;
  let startX = 0;
  let scrollStart = 0;

  tableScroll.addEventListener('mousedown', (e) => {
    // Jangan drag jika mengklik tombol aksi, link, atau input
    if (e.target.closest('button, a, input, select, textarea, label')) return;
    isDown = true;
    tableScroll.classList.add('cursor-grabbing');
    tableScroll.classList.remove('cursor-grab');
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
    e.preventDefault();
    const x = e.pageX - tableScroll.offsetLeft;
    const walk = (x - startX) * 1.5;
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
