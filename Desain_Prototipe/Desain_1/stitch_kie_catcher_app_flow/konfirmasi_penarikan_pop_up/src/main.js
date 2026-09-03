import './style.css';

document.addEventListener('DOMContentLoaded', () => {
        const overlay = document.getElementById('overlay');
        const modalCard = document.getElementById('modal-card');
        const btnCancel = document.getElementById('btn-cancel');
        const btnConfirm = document.getElementById('btn-confirm');
        const btnCloseTop = document.getElementById('close-btn-top');

        // Animate in
        setTimeout(() => {
            modalCard.classList.remove('scale-95', 'opacity-0');
            modalCard.classList.add('scale-100', 'opacity-100');
        }, 50);

        const closeModal = () => {
            modalCard.classList.remove('scale-100', 'opacity-100');
            modalCard.classList.add('scale-95', 'opacity-0');
            overlay.classList.add('opacity-0');
            
            setTimeout(() => {
                document.getElementById('withdrawal-modal').style.display = 'none';
            }, 300);
        };

        const handleConfirm = () => {
            // Success state simulation
            btnConfirm.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span><span class="ml-2">Memproses...</span>';
            btnConfirm.classList.add('opacity-80', 'cursor-not-allowed');
            
            setTimeout(() => {
                btnConfirm.innerHTML = '<span class="material-symbols-outlined">check_circle</span><span class="ml-2">Berhasil</span>';
                btnConfirm.classList.replace('bg-primary', 'bg-secondary');
                btnConfirm.classList.replace('hover:bg-primary-container', 'hover:bg-secondary-container');
                
                setTimeout(closeModal, 1000);
            }, 1500);
        };

        overlay.addEventListener('click', closeModal);
        btnCancel.addEventListener('click', closeModal);
        btnCloseTop.addEventListener('click', closeModal);
        btnConfirm.addEventListener('click', handleConfirm);
    });
