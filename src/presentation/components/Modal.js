import { AppEvents } from '../../core/events/EventBus.js';

/**
 * ModalComponent
 * Prinsip: Single Responsibility Principle (SRP)
 * Menampilkan dynamic modal dialog untuk konfirmasi, popup sukses, popup gagal, dsb.
 */
export class ModalComponent {
  /**
   * @param {import('../../core/events/EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this._eventBus = eventBus;
    this._currentModal = null;
    this._init();
  }

  _init() {
    this._eventBus.on(AppEvents.SHOW_MODAL, (options) => {
      this.show(options);
    });

    this._eventBus.on(AppEvents.CLOSE_MODAL, () => {
      this.close();
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._currentModal) {
        this.close();
      }
    });
  }

  /**
   * Menampilkan modal dialog
   * @param {Object} options
   */
  show(options = {}) {
    this.close();

    const {
      title = 'Pemberitahuan',
      message = '',
      html = '',
      type = 'info', // 'success', 'error', 'info', 'confirm'
      confirmText = 'OK',
      cancelText = 'Batal',
      onConfirm = null,
      onCancel = null,
      showCancel = false
    } = options;

    const modalWrapper = document.createElement('div');
    modalWrapper.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 opacity-0';
    modalWrapper.id = 'app-modal-root';

    const iconMap = {
      success: {
        icon: 'check_circle',
        bg: 'bg-secondary-container text-on-secondary-container',
        color: 'text-secondary'
      },
      error: {
        icon: 'cancel',
        bg: 'bg-error-container text-on-error-container',
        color: 'text-error-ruby'
      },
      info: {
        icon: 'info',
        bg: 'bg-primary-fixed text-primary',
        color: 'text-primary'
      },
      confirm: {
        icon: 'help_outline',
        bg: 'bg-surface-container-highest text-primary',
        color: 'text-primary'
      }
    };

    const iconConfig = iconMap[type] || iconMap.info;

    modalWrapper.innerHTML = `
      <!-- Backdrop with blur -->
      <div class="modal-backdrop absolute inset-0 bg-on-surface/50 backdrop-blur-sm transition-opacity duration-300"></div>

      <!-- Modal Card -->
      <div class="modal-card relative bg-surface-card w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 transform scale-95 transition-transform duration-300 z-10 border border-surface-container">
        <!-- Close Button -->
        <button type="button" class="modal-close-btn absolute right-4 top-4 text-outline hover:text-on-surface p-1.5 rounded-full hover:bg-surface-container transition-colors" aria-label="Tutup">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>

        <!-- Icon -->
        <div class="w-16 h-16 rounded-full ${iconConfig.bg} flex items-center justify-center shadow-inner mt-2">
          <span class="material-symbols-outlined text-[40px]" style="font-variation-settings: 'FILL' 1;">${iconConfig.icon}</span>
        </div>

        <!-- Heading & Body -->
        <div class="flex flex-col gap-2 w-full">
          <h3 class="font-headline-md text-xl text-text-heading font-bold">${title}</h3>
          ${message ? `<div class="font-body-md text-sm text-text-body leading-relaxed w-full">${message}</div>` : ''}
          ${html ? `<div class="modal-custom-html w-full text-left my-2">${html}</div>` : ''}
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 w-full mt-2">
          ${showCancel ? `
            <button type="button" class="modal-cancel-btn flex-1 py-3.5 px-4 rounded-full font-label-md text-sm bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all active:scale-[0.98]">
              ${cancelText}
            </button>
          ` : ''}
          <button type="button" class="modal-confirm-btn flex-1 py-3.5 px-4 rounded-full font-label-md text-sm bg-primary text-on-primary font-bold shadow-md shadow-primary/20 hover:bg-primary-container transition-all active:scale-[0.98]">
            ${confirmText}
          </button>
        </div>
      </div>
    `;

    // Event handlers
    const backdrop = modalWrapper.querySelector('.modal-backdrop');
    const closeBtn = modalWrapper.querySelector('.modal-close-btn');
    const confirmBtn = modalWrapper.querySelector('.modal-confirm-btn');
    const cancelBtn = modalWrapper.querySelector('.modal-cancel-btn');

    const handleConfirm = async () => {
      if (typeof onConfirm === 'function') {
        const result = await onConfirm({
          close: () => this.close(),
          modal: modalWrapper,
          confirmBtn
        });
        if (result === false || options.autoClose === false) {
          return;
        }
      }
      this.close();
    };

    const handleCancel = () => {
      if (typeof onCancel === 'function') onCancel();
      this.close();
    };

    backdrop.addEventListener('click', handleCancel);
    closeBtn.addEventListener('click', handleCancel);
    confirmBtn.addEventListener('click', handleConfirm);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);

    document.body.appendChild(modalWrapper);
    this._currentModal = modalWrapper;

    // Trigger animate in
    requestAnimationFrame(() => {
      modalWrapper.classList.remove('opacity-0');
      const card = modalWrapper.querySelector('.modal-card');
      if (card) card.classList.remove('scale-95');
    });
  }

  close() {
    if (!this._currentModal) return;

    const modal = this._currentModal;
    this._currentModal = null;

    modal.classList.add('opacity-0');
    const card = modal.querySelector('.modal-card');
    if (card) card.classList.add('scale-95');

    setTimeout(() => {
      modal.remove();
    }, 250);
  }
}
