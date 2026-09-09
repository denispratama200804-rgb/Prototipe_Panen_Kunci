import './styles/style.css';

// Core DI & Events
import { ServiceContainer } from './core/container/ServiceContainer.js';
import { EventBus } from './core/events/EventBus.js';

// Domain Validators
import { AuthValidator } from './domain/validators/AuthValidator.js';
import { ApiKeyValidator } from './domain/validators/ApiKeyValidator.js';
import { WithdrawalValidator } from './domain/validators/WithdrawalValidator.js';

// Infrastructure Adapters & Strategies
import { LocalStorageAdapter } from './infrastructure/storage/LocalStorageAdapter.js';
import { WithdrawalStrategyFactory } from './infrastructure/strategies/WithdrawalStrategyFactory.js';
import { SupabaseUserRepository } from './infrastructure/repositories/SupabaseUserRepository.js';
import { SupabaseApiKeyRepository } from './infrastructure/repositories/SupabaseApiKeyRepository.js';
import { SupabaseTransactionRepository } from './infrastructure/repositories/SupabaseTransactionRepository.js';

// Services
import { NotificationService } from './infrastructure/services/NotificationService.js';
import { AuthService } from './infrastructure/services/AuthService.js';
import { WalletService } from './infrastructure/services/WalletService.js';
import { ApiKeyService } from './infrastructure/services/ApiKeyService.js';

// Presentation Components & Router
import { ToastComponent } from './presentation/components/Toast.js';
import { ModalComponent } from './presentation/components/Modal.js';
import { HeaderComponent } from './presentation/components/Header.js';
import { BottomNavComponent } from './presentation/components/BottomNav.js';
import { ShaderCanvasComponent } from './presentation/components/ShaderCanvas.js';
import { Router } from './core/router/Router.js';
import { routes } from './core/router/routes.js';

// Listen for PWA installation prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredInstallPrompt = e;
  console.log('[PWA] Install prompt captured and ready.');
});

// Track when PWA is installed
window.addEventListener('appinstalled', () => {
  window.deferredInstallPrompt = null;
  console.log('[PWA] App installed successfully!');
});

// Service Worker: Hanya aktif di production; di dev/localhost unregister & bersihkan cache agar selalu fresh
if ('serviceWorker' in navigator) {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname) ||
                  window.location.hostname.startsWith('192.168.') ||
                  window.location.port !== '';
  if (isLocal) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[SW] Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('[SW] Service Worker registration failed:', err);
        });
    });
  }
}


/**
 * Bootstrap Application
 * Prinsip: Dependency Inversion Principle (DIP) & Single Responsibility Principle (SRP)
 */
function bootstrap() {
  const container = new ServiceContainer();

  // 1. Register Core & Storage Abstractions (DIP)
  const eventBus = new EventBus();
  container.registerSingleton('EventBus', eventBus);

  const storage = new LocalStorageAdapter('panenkunci:');
  container.registerSingleton('IStorage', storage);

  // Repositories (DIP & ISP)
  const userRepository = new SupabaseUserRepository();
  container.registerSingleton('IUserRepository', userRepository);

  const apiKeyRepository = new SupabaseApiKeyRepository();
  container.registerSingleton('IApiKeyRepository', apiKeyRepository);

  const transactionRepository = new SupabaseTransactionRepository();
  container.registerSingleton('ITransactionRepository', transactionRepository);

  // 2. Register Validators (SRP & ISP)
  const authValidator = new AuthValidator();
  container.registerSingleton('AuthValidator', authValidator);

  const apiKeyValidator = new ApiKeyValidator();
  container.registerSingleton('ApiKeyValidator', apiKeyValidator);

  const withdrawalValidator = new WithdrawalValidator(50000);
  container.registerSingleton('WithdrawalValidator', withdrawalValidator);

  // 3. Register Strategy Factory (OCP)
  const strategyFactory = new WithdrawalStrategyFactory();
  container.registerSingleton('WithdrawalStrategyFactory', strategyFactory);

  // 4. Register Services (SRP & DIP)
  const notificationService = new NotificationService(eventBus, storage);
  container.registerSingleton('NotificationService', notificationService);

  const authService = new AuthService(storage, authValidator, eventBus, userRepository);
  container.registerSingleton('AuthService', authService);

  const walletService = new WalletService(storage, withdrawalValidator, strategyFactory, eventBus, transactionRepository);
  container.registerSingleton('WalletService', walletService);

  const apiKeyService = new ApiKeyService(storage, apiKeyValidator, walletService, eventBus, apiKeyRepository);
  container.registerSingleton('ApiKeyService', apiKeyService);

  // 5. Mount Global UI Shell & Components
  const appRoot = document.getElementById('app');
  if (!appRoot) {
    console.error('Root element #app not found in document.');
    return;
  }

  // WebGL Liquid Shader Background
  const shaderBg = new ShaderCanvasComponent();
  shaderBg.mount(document.body);

  // Toast & Modal Managers
  new ToastComponent(eventBus);
  new ModalComponent(eventBus);

  // Header & Bottom Navigation Shell
  const header = new HeaderComponent(container);
  header.mount(appRoot);

  const viewContainer = document.createElement('div');
  viewContainer.id = 'app-view-root';
  viewContainer.className = 'w-full min-h-screen';
  appRoot.appendChild(viewContainer);

  const bottomNav = new BottomNavComponent(container);
  bottomNav.mount(appRoot);

  // 6. Initialize Router
  const router = new Router(viewContainer, routes, container);
  container.registerSingleton('Router', router);
  router.init();

  console.log('🚀 Panen Kunci application initialized successfully with SOLID Architecture.');
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
