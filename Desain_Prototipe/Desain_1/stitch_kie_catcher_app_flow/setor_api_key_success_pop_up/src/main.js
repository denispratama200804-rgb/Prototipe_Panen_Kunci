import './style.css';

document.addEventListener('DOMContentLoaded', () => {
    const pasteBtn = document.getElementById('pasteBtn');
    const input = document.getElementById('apiKeyInput');
    const submitBtn = document.getElementById('submitBtn');
    const feedback = document.getElementById('feedbackContainer');

    // Simulate paste
    pasteBtn.addEventListener('click', () => {
      // In a real app this would use navigator.clipboard.readText()
      // which requires permissions/HTTPS context. Simulating for demo.
      input.value = 'sk-kie-' + Math.random().toString(36).substring(2, 10) + '...';
      input.classList.add('bg-primary-fixed/20');
      setTimeout(() => input.classList.remove('bg-primary-fixed/20'), 300);
    });

    // Simulate submit
    submitBtn.addEventListener('click', () => {
      if(!input.value.trim()) {
        input.focus();
        return;
      }
      
      // UI state change
      submitBtn.classList.add('hidden');
      feedback.classList.remove('hidden');
      feedback.classList.add('flex');
      
      // Reset after simulation
      setTimeout(() => {
        submitBtn.classList.remove('hidden');
        feedback.classList.add('hidden');
        feedback.classList.remove('flex');
        input.value = '';
        
        // Show a brief success toast (simplified for this demo)
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-secondary text-on-secondary px-4 py-2 rounded-full shadow-lg font-label-sm z-50 transition-opacity duration-300';
        toast.textContent = 'API Key berhasil disubmit!';
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 300);
        }, 2000);
        
      }, 2000);
    });
  });
