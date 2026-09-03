import './style.css';

// Toast Notification Helper
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgColors = {
    info: 'bg-primary text-on-primary',
    success: 'bg-secondary text-on-secondary',
    error: 'bg-error-ruby text-on-error',
    warning: 'bg-warning-amber text-on-surface',
  };

  const icons = {
    info: 'info',
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
  };

  toast.className = `${bgColors[type] || bgColors.info} px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 transition-all duration-300 transform translate-y-[-10px] opacity-0 pointer-events-auto text-sm font-medium`;
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[20px] shrink-0">${icons[type] || 'info'}</span>
    <span class="flex-1">${message}</span>
    <button type="button" class="text-white/80 hover:text-white p-1 ml-auto shrink-0 focus:outline-none" aria-label="Tutup">
      <span class="material-symbols-outlined text-[18px]">close</span>
    </button>
  `;

  toast.querySelector('button').addEventListener('click', () => {
    toast.classList.add('opacity-0', 'translate-y-[-10px]');
    setTimeout(() => toast.remove(), 300);
  });

  toastContainer.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-y-[-10px]');
  });

  // Auto remove
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('opacity-0', 'translate-y-[-10px]');
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

// Password Visibility Toggle
export function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input || !icon) return;

  if (input.type === 'password') {
    input.type = 'text';
    icon.textContent = 'visibility';
    icon.classList.add('text-primary');
  } else {
    input.type = 'password';
    icon.textContent = 'visibility_off';
    icon.classList.remove('text-primary');
  }
}

// Password Strength Checker
export function checkPasswordStrength(val) {
  const s1 = document.getElementById('str1');
  const s2 = document.getElementById('str2');
  const s3 = document.getElementById('str3');
  if (!s1 || !s2 || !s3) return;

  // Reset
  s1.className = 'w-5 h-1 rounded-full bg-surface-container-highest transition-colors';
  s2.className = 'w-5 h-1 rounded-full bg-surface-container-highest transition-colors';
  s3.className = 'w-5 h-1 rounded-full bg-surface-container-highest transition-colors';

  if (!val || val.length === 0) return;

  if (val.length >= 8) {
    s1.className = 'w-5 h-1 rounded-full bg-warning-amber transition-colors';
    if (/[A-Z]/.test(val) && /[0-9]/.test(val)) {
      s2.className = 'w-5 h-1 rounded-full bg-secondary transition-colors';
    }
    if (val.length >= 12 && /[^A-Za-z0-9]/.test(val)) {
      s3.className = 'w-5 h-1 rounded-full bg-secondary-container transition-colors';
    }
  } else {
    s1.className = 'w-5 h-1 rounded-full bg-error-ruby transition-colors';
  }
}

// Register Form Handler
export function handleRegister(event) {
  if (event) event.preventDefault();

  const pass = document.getElementById('password')?.value;
  const confirmPass = document.getElementById('confirmPassword')?.value;

  if (pass !== confirmPass) {
    showToast('Konfirmasi kata sandi tidak cocok. Harap periksa kembali.', 'error');
    return;
  }

  const btn = document.getElementById('btnSubmit');
  if (btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span><span>Memproses...</span>';
    btn.disabled = true;

    setTimeout(() => {
      btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">check_circle</span><span>Pendaftaran Berhasil!</span>';
      btn.classList.remove('bg-primary');
      btn.classList.add('bg-secondary');

      showToast('Selamat datang di Panen Kunci! Silakan verifikasi email Anda untuk mulai menyetor API Key.', 'success');

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.classList.add('bg-primary');
        btn.classList.remove('bg-secondary');
      }, 2500);
    }, 1500);
  }
}

// Social Login Handler
export function handleSocialLogin(provider) {
  showToast(`Mengarahkan ke pendaftaran via ${provider}...`, 'info');
}

// Expose to window for backwards compatibility with inline attributes if needed
window.togglePasswordVisibility = togglePasswordVisibility;
window.checkPasswordStrength = checkPasswordStrength;
window.handleRegister = handleRegister;
window.handleSocialLogin = handleSocialLogin;

// Initialize listeners once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  if (form) {
    form.addEventListener('submit', handleRegister);
  }

  const passInput = document.getElementById('password');
  if (passInput) {
    passInput.addEventListener('input', (e) => checkPasswordStrength(e.target.value));
  }

  const backBtn = document.getElementById('btnBack');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        showToast('Kembali ke halaman sebelumnya', 'info');
      }
    });
  }
});
