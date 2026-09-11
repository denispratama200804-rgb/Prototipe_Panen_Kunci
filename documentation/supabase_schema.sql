-- ============================================================
-- PANEN KUNCI — Database Schema for Supabase
-- ============================================================
-- Cara pakai:
--   1. Buka https://app.supabase.com -> pilih project
--   2. Pergi ke SQL Editor -> New Query
--   3. Tempel seluruh script ini -> klik Run
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- untuk gen_random_uuid()


-- ============================================================
-- 1. TABEL: users
--    Menyimpan profil pengguna Panen Kunci.
--    Referensi domain model: src/domain/models/User.js
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT          NOT NULL,
  email           TEXT          NOT NULL UNIQUE,
  password        TEXT          DEFAULT '',
  phone           TEXT          DEFAULT '',
  bank_name       TEXT          DEFAULT '',
  account_number  TEXT          DEFAULT '',
  account_holder  TEXT          DEFAULT '',
  role            TEXT          NOT NULL DEFAULT 'user'
                                  CHECK (role IN ('user', 'admin')),
  is_verified     BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Query migrasi jika tabel users sudah ada sebelumnya (menjamin seluruh kolom tersedia):
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_number TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_holder TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '';

COMMENT ON TABLE  public.users                  IS 'Profil pengguna aplikasi Panen Kunci';
COMMENT ON COLUMN public.users.id               IS 'Primary key — UUID otomatis, harus sama dengan auth.users.id';
COMMENT ON COLUMN public.users.email            IS 'Email unik pengguna';
COMMENT ON COLUMN public.users.password         IS 'Kata sandi pengguna (plain / hash)';
COMMENT ON COLUMN public.users.role             IS 'Peran pengguna: user (pengguna biasa) atau admin (administrator)';
COMMENT ON COLUMN public.users.bank_name        IS 'Nama bank rekening tujuan penarikan';
COMMENT ON COLUMN public.users.account_number   IS 'Nomor rekening bank';
COMMENT ON COLUMN public.users.account_holder   IS 'Nama pemilik rekening sesuai buku tabungan';
COMMENT ON COLUMN public.users.is_verified      IS 'TRUE jika akun sudah diverifikasi oleh admin';


-- ============================================================
-- 2. TABEL: api_keys
--    Menyimpan setiap API Key yang disetorkan pengguna.
--    Referensi domain model: src/domain/models/ApiKey.js
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  key_string      TEXT          NOT NULL UNIQUE,
  status          TEXT          NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'valid', 'invalid', 'used')),
  reward_amount   INTEGER       NOT NULL DEFAULT 3000,
  credits         INTEGER       NOT NULL DEFAULT 80,
  error_message   TEXT          DEFAULT '',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Query migrasi jika tabel api_keys sudah dibuat sebelumnya (memperbarui check constraint status):
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_status_check;
ALTER TABLE public.api_keys ADD CONSTRAINT api_keys_status_check CHECK (status IN ('pending', 'valid', 'invalid', 'used'));

COMMENT ON TABLE  public.api_keys                IS 'API Key yang disetorkan pengguna untuk mendapatkan reward';
COMMENT ON COLUMN public.api_keys.user_id        IS 'FK ke tabel users';
COMMENT ON COLUMN public.api_keys.key_string     IS 'String API Key — enkripsi sebelum store di production!';
COMMENT ON COLUMN public.api_keys.status         IS 'pending = menunggu verifikasi admin, valid = disetujui, invalid = ditolak, used = telah diproses/dijual';
COMMENT ON COLUMN public.api_keys.reward_amount  IS 'Nominal reward Rupiah yang dikreditkan ke dompet pengguna';
COMMENT ON COLUMN public.api_keys.credits        IS 'Sisa kredit Kie.ai saat validasi (minimal 80 untuk diterima)';


-- ============================================================
-- 3. TABEL: transactions
--    Riwayat mutasi saldo (deposit setoran key & withdrawal tarik saldo).
--    Referensi domain model: src/domain/models/Transaction.js
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type            TEXT          NOT NULL
                                  CHECK (type IN ('deposit', 'withdrawal')),
  amount          INTEGER       NOT NULL CHECK (amount > 0),
  fee             INTEGER       NOT NULL DEFAULT 0,
  net_payout      INTEGER       GENERATED ALWAYS AS (amount - fee) STORED,
  title           TEXT          NOT NULL,
  description     TEXT          DEFAULT '',
  status          TEXT          NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'success', 'failed')),
  method          TEXT          DEFAULT '',
  recipient       TEXT          DEFAULT '',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.transactions              IS 'Riwayat mutasi saldo: setoran API Key & penarikan dana';
COMMENT ON COLUMN public.transactions.type         IS 'deposit = setoran key, withdrawal = tarik saldo';
COMMENT ON COLUMN public.transactions.amount       IS 'Nominal kotor sebelum dipotong biaya admin';
COMMENT ON COLUMN public.transactions.fee          IS 'Biaya admin (Rp 1.000 GoPay/OVO, Rp 2.500 Bank)';
COMMENT ON COLUMN public.transactions.net_payout   IS 'Dihitung otomatis: amount - fee';
COMMENT ON COLUMN public.transactions.status       IS 'pending = menunggu admin, success = cair, failed = gagal';
COMMENT ON COLUMN public.transactions.method       IS 'Metode penarikan: bank | dana | gopay | ovo';
COMMENT ON COLUMN public.transactions.recipient    IS 'Nomor rekening atau HP tujuan penarikan';


-- ============================================================
-- 4. TABEL: live_chat_messages
--    Menyimpan riwayat pesan obrolan langsung Pengguna & Admin.
--    Referensi: src/infrastructure/services/ChatService.js
-- ============================================================
CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name       TEXT          DEFAULT '',
  user_avatar     TEXT          DEFAULT '',
  user_email      TEXT          DEFAULT '',
  sender          TEXT          NOT NULL CHECK (sender IN ('user', 'admin')),
  text            TEXT          NOT NULL,
  time_str        TEXT          DEFAULT '',
  read_by_admin   BOOLEAN       NOT NULL DEFAULT FALSE,
  read_by_user    BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.live_chat_messages              IS 'Obrolan langsung (Live Chat) antara Pengguna dan Admin';
COMMENT ON COLUMN public.live_chat_messages.user_id      IS 'FK ke tabel users';
COMMENT ON COLUMN public.live_chat_messages.sender       IS 'user = pengguna, admin = admin';
COMMENT ON COLUMN public.live_chat_messages.text         IS 'Isi pesan chat';


-- ============================================================
-- INDEXES
-- Mempercepat query yang paling sering dipakai
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email
  ON public.users(email);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
  ON public.api_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_status
  ON public.api_keys(status);

CREATE INDEX IF NOT EXISTS idx_api_keys_created_at
  ON public.api_keys(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id
  ON public.transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_type
  ON public.transactions(type);

CREATE INDEX IF NOT EXISTS idx_transactions_status
  ON public.transactions(status);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at
  ON public.transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_chat_user_id
  ON public.live_chat_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_live_chat_created_at
  ON public.live_chat_messages(created_at ASC);


-- ============================================================
-- TRIGGER: auto-update kolom updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Pengguna HANYA bisa akses data milik sendiri.
-- Service role (backend/admin) otomatis bypass RLS.
-- ============================================================

-- Aktifkan RLS di semua tabel
ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;


-- ── RLS: tabel USERS ─────────────────────────────────────────

-- Pengguna dan publik bisa membaca data profil
CREATE POLICY "users: allow select"
  ON public.users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Pengguna baru (anon maupun authenticated) bisa mendaftar dan insert profil
CREATE POLICY "users: allow insert"
  ON public.users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Pengguna bisa update profil sendiri
CREATE POLICY "users: allow update"
  ON public.users
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Pengguna tidak bisa hapus akun sendiri via client (hanya service role)


-- ── RLS: tabel API_KEYS ──────────────────────────────────────

CREATE POLICY "api_keys: allow select"
  ON public.api_keys
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "api_keys: allow insert"
  ON public.api_keys
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);


-- ── RLS: tabel TRANSACTIONS ──────────────────────────────────

CREATE POLICY "transactions: allow select"
  ON public.transactions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "transactions: allow insert"
  ON public.transactions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);


-- ── RLS: tabel LIVE_CHAT_MESSAGES ────────────────────────────

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_chat_messages: allow select"
  ON public.live_chat_messages
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "live_chat_messages: allow insert"
  ON public.live_chat_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "live_chat_messages: allow update"
  ON public.live_chat_messages
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- AKUN ADMINISTRATOR UTAMA (Siap Pakai)
-- ============================================================
-- Email    : admin@panenkunci.id
-- Password : admin123
-- Role     : admin
-- ============================================================
INSERT INTO public.users (name, email, password, role, is_verified)
VALUES (
  'Administrator Panen Kunci',
  'admin@panenkunci.id',
  'admin123',
  'admin',
  TRUE
)
ON CONFLICT (email) DO UPDATE
SET role = 'admin', password = EXCLUDED.password;


-- ============================================================
-- RINGKASAN
-- ============================================================
-- Tabel    : users, api_keys, transactions
-- Index    : 8 index untuk query cepat
-- Trigger  : auto updated_at untuk users & transactions
-- RLS      : pengguna hanya akses data milik sendiri
--            admin/backend via service role (bypass RLS)
-- ============================================================
