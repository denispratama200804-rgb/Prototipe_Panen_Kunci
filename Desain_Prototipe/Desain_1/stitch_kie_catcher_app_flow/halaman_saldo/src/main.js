import './style.css';

// Simple entrance animation for the progress bar
  document.addEventListener('DOMContentLoaded', () => {
    const progressBar = document.getElementById('progress-bar');
    if(progressBar) {
        // Reset to 0 then animate to 85%
        progressBar.style.width = '0%';
        setTimeout(() => {
            progressBar.style.width = '85%';
        }, 100);
    }
  });
