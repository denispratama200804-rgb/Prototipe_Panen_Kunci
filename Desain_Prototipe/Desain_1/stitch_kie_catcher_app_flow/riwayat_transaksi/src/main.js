import './style.css';

document.addEventListener('DOMContentLoaded', () => {
    const tabSetoran = document.getElementById('tab-setoran');
    const tabPenarikan = document.getElementById('tab-penarikan');
    const contentSetoran = document.getElementById('content-setoran');
    const contentPenarikan = document.getElementById('content-penarikan');

    const activeClasses = ['bg-surface-card', 'shadow-sm', 'text-primary'];
    const inactiveClasses = ['text-on-surface-variant', 'hover:bg-surface-container/50'];

    tabSetoran.addEventListener('click', () => {
      tabSetoran.classList.remove(...inactiveClasses);
      tabSetoran.classList.add(...activeClasses);
      
      tabPenarikan.classList.remove(...activeClasses);
      tabPenarikan.classList.add(...inactiveClasses);

      contentSetoran.classList.remove('hidden');
      contentSetoran.classList.add('flex');
      
      contentPenarikan.classList.add('hidden');
      contentPenarikan.classList.remove('flex');
    });

    tabPenarikan.addEventListener('click', () => {
      tabPenarikan.classList.remove(...inactiveClasses);
      tabPenarikan.classList.add(...activeClasses);
      
      tabSetoran.classList.remove(...activeClasses);
      tabSetoran.classList.add(...inactiveClasses);

      contentPenarikan.classList.remove('hidden');
      contentPenarikan.classList.add('flex');
      
      contentSetoran.classList.add('hidden');
      contentSetoran.classList.remove('flex');
    });
  });
