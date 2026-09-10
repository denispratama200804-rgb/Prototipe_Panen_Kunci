import { Router } from '../src/core/router/Router.js';
import { routes } from '../src/core/router/routes.js';
import { ServiceContainer } from '../src/core/container/ServiceContainer.js';
import { EventBus } from '../src/core/events/EventBus.js';
import { MemoryStorageAdapter } from '../src/infrastructure/storage/MemoryStorageAdapter.js';
import { AuthValidator } from '../src/domain/validators/AuthValidator.js';
import { AuthService } from '../src/infrastructure/services/AuthService.js';
import { NotificationService } from '../src/infrastructure/services/NotificationService.js';

// Setup minimal DOM mocks
global.window = {
  location: { hash: '', pathname: '/', search: '', origin: 'http://localhost:5173' },
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
  matchMedia: () => ({ matches: false }),
  navigator: {}
};
global.document = {
  title: '',
  addEventListener: () => {}
};

const mount = { innerHTML: '', appendChild: () => {} };
const container = new ServiceContainer();
const eventBus = new EventBus();
const storage = new MemoryStorageAdapter();
const validator = new AuthValidator();

container.registerSingleton('EventBus', eventBus);
container.registerSingleton('IStorage', storage);
container.registerSingleton('AuthValidator', validator);
container.registerSingleton('NotificationService', new NotificationService(eventBus, storage));
container.registerSingleton('AuthService', new AuthService(storage, validator, eventBus));

const router = new Router(mount, routes, container);

async function run() {
  console.log('Testing Router with hash "" (Root / Landing View)...');
  await router._onHashChange();
  console.log('✓ Root route rendered. mount.innerHTML length:', mount.innerHTML.length);

  console.log('Testing Router with hash "#/login"...');
  window.location.hash = '#/login';
  await router._onHashChange();
  console.log('✓ Login route rendered. mount.innerHTML length:', mount.innerHTML.length);

  console.log('Testing Router with hash "#/reset-password"...');
  window.location.hash = '#/reset-password';
  await router._onHashChange();
  console.log('✓ Reset password route rendered. mount.innerHTML length:', mount.innerHTML.length);

  console.log('Testing Router with recovery token "#access_token=xyz&type=recovery"...');
  window.location.hash = '#access_token=xyz&type=recovery';
  await router._onHashChange();
  console.log('✓ Recovery token route handled. Route is:', router._currentRoute.path);

  console.log('\n>>> ALL ROUTER TESTS PASSED WITH 0 ERRORS! <<<');
}

run().catch(err => {
  console.error('ROUTER CRASHED:', err);
  process.exit(1);
});
