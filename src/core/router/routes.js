import { LandingView } from '../../presentation/views/LandingView.js';
import { LoginView } from '../../presentation/views/LoginView.js';
import { RegisterView } from '../../presentation/views/RegisterView.js';
import { DashboardView } from '../../presentation/views/DashboardView.js';
import { SaldoDetailView } from '../../presentation/views/SaldoDetailView.js';
import { SetorApiKeyView } from '../../presentation/views/SetorApiKeyView.js';
import { TarikSaldoView } from '../../presentation/views/TarikSaldoView.js';
import { HistoryView } from '../../presentation/views/HistoryView.js';
import { ProfileView } from '../../presentation/views/ProfileView.js';

/**
 * Routes Configuration
 * Prinsip: Open/Closed Principle (OCP)
 * Terbuka untuk penambahan rute baru tanpa merubah logic engine Router.
 */
export const routes = [
  {
    path: '/',
    viewClass: LandingView,
    title: 'Ubah API Key Menjadi Rupiah',
    requiresAuth: false
  },
  {
    path: '/login',
    viewClass: LoginView,
    title: 'Masuk Akun',
    requiresAuth: false,
    guestOnly: false
  },
  {
    path: '/register',
    viewClass: RegisterView,
    title: 'Daftar Akun Baru',
    requiresAuth: false,
    guestOnly: false
  },
  {
    path: '/dashboard',
    viewClass: DashboardView,
    title: 'Home Dashboard',
    requiresAuth: true
  },
  {
    path: '/saldo',
    viewClass: SaldoDetailView,
    title: 'Detail Saldo & Limit Penarikan',
    requiresAuth: true
  },
  {
    path: '/setor',
    viewClass: SetorApiKeyView,
    title: 'Setor API Key Kie.ai',
    requiresAuth: true
  },
  {
    path: '/tarik',
    viewClass: TarikSaldoView,
    title: 'Tarik Saldo',
    requiresAuth: true
  },
  {
    path: '/riwayat',
    viewClass: HistoryView,
    title: 'Riwayat Transaksi',
    requiresAuth: true
  },
  {
    path: '/profil',
    viewClass: ProfileView,
    title: 'Profil Pengguna',
    requiresAuth: true
  }
];
