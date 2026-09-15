import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function deleteUsers() {
  console.log('Mengambil data pengguna yang akan dihapus...');
  // Find all users with role 'user'
  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('role', 'user');

  if (fetchError) {
    console.error('Error saat mengambil data pengguna:', fetchError);
    return;
  }

  console.log(`Ditemukan ${users.length} akun dengan role 'user' yang akan dihapus.`);

  let authDeleted = 0;
  let publicDeleted = 0;

  for (const user of users) {
    // 1. Delete from auth.users
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
    if (!authError) {
       authDeleted++;
    }

    // 2. Delete from public.users
    const { error: publicError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id);
    
    if (!publicError) {
       publicDeleted++;
    }
  }

  console.log(`\nBerhasil menghapus ${authDeleted} akun dari autentikasi (auth.users) dan ${publicDeleted} profil dari tabel users (public.users).`);
  
  // Verify remaining
  const { data: remainingUsers } = await supabase.from('users').select('id, name, role');
  console.log('\nSisa akun yang TIDAK DIHAPUS:');
  remainingUsers.forEach(u => console.log(`- ${u.name} (Role: ${u.role})`));
}

deleteUsers();
