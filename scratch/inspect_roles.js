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

async function inspectRoles() {
  const { data, error } = await supabase.from('users').select('role');
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    const roles = [...new Set(data.map(u => u.role))];
    console.log('Distinct roles:', roles);
  }
}

inspectRoles();
